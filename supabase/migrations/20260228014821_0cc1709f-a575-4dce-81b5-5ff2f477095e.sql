
-- Add min_temp_c to plant_search_index for temperature range filtering
ALTER TABLE public.plant_search_index ADD COLUMN IF NOT EXISTS min_temp_c integer;

-- Backfill min_temp_c from plants table
UPDATE public.plant_search_index si
SET min_temp_c = p.min_temp_c
FROM public.plants p
WHERE si.plant_id = p.id;

-- Add index for min_temp_c range queries
CREATE INDEX IF NOT EXISTS idx_psi_min_temp_c ON public.plant_search_index (min_temp_c) WHERE min_temp_c IS NOT NULL;

-- Replace search_catalog with climate-aware version
CREATE OR REPLACE FUNCTION public.search_catalog(
  p_query text DEFAULT NULL,
  p_plant_type text[] DEFAULT NULL,
  p_difficulty text[] DEFAULT NULL,
  p_rarity text[] DEFAULT NULL,
  p_water text[] DEFAULT NULL,
  p_humidity text[] DEFAULT NULL,
  p_exposure text[] DEFAULT NULL,
  p_climate_zones text[] DEFAULT NULL,
  p_hardiness_zones text[] DEFAULT NULL,
  p_plant_use text[] DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_origin_country text[] DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_in_stock boolean DEFAULT true,
  p_is_featured boolean DEFAULT NULL,
  p_sort text DEFAULT 'relevance',
  p_sort_dir text DEFAULT 'asc',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 24,
  p_ab_variant text DEFAULT NULL,
  -- NEW climate filters
  p_hardiness_min text DEFAULT NULL,
  p_hardiness_max text DEFAULT NULL,
  p_min_temp_max integer DEFAULT NULL,
  p_climate_fit_min integer DEFAULT NULL,
  p_address_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_tsquery tsquery;
  v_norm_query TEXT;
  v_results JSONB;
  v_facets JSONB;
  v_total BIGINT;
  v_items JSONB;
BEGIN
  p_page := GREATEST(p_page, 1);
  p_page_size := LEAST(GREATEST(p_page_size, 1), 100);
  v_offset := (p_page - 1) * p_page_size;

  IF p_query IS NOT NULL AND length(trim(p_query)) >= 2 THEN
    v_norm_query := lower(public.unaccent(trim(p_query)));
    BEGIN
      v_tsquery := websearch_to_tsquery('simple', v_norm_query);
    EXCEPTION WHEN OTHERS THEN
      v_tsquery := plainto_tsquery('simple', v_norm_query);
    END;
  END IF;

  WITH filtered AS (
    SELECT
      si.plant_id,
      CASE
        WHEN v_tsquery IS NOT NULL THEN
          ts_rank_cd(si.search_vector, v_tsquery, 32) * si.relevance_boost
          + CASE WHEN si.name_tokens ILIKE '%' || v_norm_query || '%' THEN 20 ELSE 0 END
          + CASE WHEN si.common_name_tokens ILIKE '%' || v_norm_query || '%' THEN 15 ELSE 0 END
          + CASE WHEN si.scientific_name_tokens ILIKE '%' || v_norm_query || '%' THEN 10 ELSE 0 END
          + similarity(si.name_tokens, v_norm_query) * 5
        ELSE 0
      END AS score,
      si.price,
      si.sale_price,
      si.display_order,
      si.rarity_ordinal,
      si.plant_type,
      si.difficulty,
      si.rarity,
      si.water,
      si.humidity,
      si.exposure,
      si.climate_zones,
      si.hardiness_zones,
      si.plant_use,
      si.category_id,
      si.is_in_stock,
      si.is_on_sale,
      si.tags,
      si.origin_country,
      si.min_temp_c
    FROM plant_search_index si
    JOIN plants p ON p.id = si.plant_id AND p.is_active = true
    WHERE
      (v_tsquery IS NULL OR (
        si.search_vector @@ v_tsquery
        OR si.name_tokens ILIKE '%' || v_norm_query || '%'
        OR si.common_name_tokens ILIKE '%' || v_norm_query || '%'
        OR si.scientific_name_tokens ILIKE '%' || v_norm_query || '%'
        OR similarity(si.name_tokens, v_norm_query) > 0.2
      ))
      AND (p_plant_type IS NULL OR si.plant_type = ANY(p_plant_type))
      AND (p_difficulty IS NULL OR si.difficulty = ANY(p_difficulty))
      AND (p_rarity IS NULL OR si.rarity = ANY(p_rarity))
      AND (p_water IS NULL OR si.water = ANY(p_water))
      AND (p_humidity IS NULL OR si.humidity = ANY(p_humidity))
      AND (p_exposure IS NULL OR si.exposure && p_exposure)
      AND (p_climate_zones IS NULL OR si.climate_zones && p_climate_zones)
      AND (p_hardiness_zones IS NULL OR si.hardiness_zones && p_hardiness_zones)
      AND (p_plant_use IS NULL OR si.plant_use && p_plant_use)
      AND (p_tags IS NULL OR si.tags && p_tags)
      AND (p_origin_country IS NULL OR si.origin_country = ANY(p_origin_country))
      AND (p_category_id IS NULL OR si.category_id = p_category_id)
      AND (p_min_price IS NULL OR si.price >= p_min_price)
      AND (p_max_price IS NULL OR si.price <= p_max_price)
      AND (p_in_stock IS NULL OR p_in_stock = false OR si.is_in_stock = true)
      AND (p_is_featured IS NULL OR EXISTS (
        SELECT 1 FROM plants pp WHERE pp.id = si.plant_id AND pp.is_featured = p_is_featured
      ))
      -- NEW: Hardiness range filter (e.g. hardiness_min='8a', hardiness_max='11b')
      AND (p_hardiness_min IS NULL OR si.hardiness_zones && ARRAY(
        SELECT hz FROM unnest(si.hardiness_zones) hz
        WHERE hz >= p_hardiness_min
      ))
      -- Hardiness max: plant must have at least one zone <= max
      AND (p_hardiness_max IS NULL OR si.hardiness_zones && ARRAY(
        SELECT hz FROM unnest(si.hardiness_zones) hz
        WHERE hz <= p_hardiness_max
      ))
      -- NEW: Temperature ceiling filter (show plants that tolerate temps up to this min)
      AND (p_min_temp_max IS NULL OR si.min_temp_c IS NULL OR si.min_temp_c <= p_min_temp_max)
      -- NEW: Climate fit score filter (requires address_id for cached scores)
      AND (p_climate_fit_min IS NULL OR p_address_id IS NULL OR EXISTS (
        SELECT 1 FROM fit_score_cache fsc
        WHERE fsc.plant_id = si.plant_id
          AND fsc.address_id = p_address_id
          AND fsc.stale = false
          AND fsc.score >= p_climate_fit_min
      ))
  ),
  counted AS (
    SELECT COUNT(*) AS total FROM filtered
  ),
  sorted AS (
    SELECT f.*
    FROM filtered f
    -- Optional: boost by fit score when address context is present
    LEFT JOIN LATERAL (
      SELECT fsc.score AS fit_score
      FROM fit_score_cache fsc
      WHERE p_address_id IS NOT NULL
        AND fsc.plant_id = f.plant_id
        AND fsc.address_id = p_address_id
        AND fsc.stale = false
      LIMIT 1
    ) fs ON true
    ORDER BY
      CASE WHEN p_sort = 'climate_fit' AND fs.fit_score IS NOT NULL THEN fs.fit_score END DESC NULLS LAST,
      CASE WHEN p_sort = 'relevance' AND v_tsquery IS NOT NULL THEN f.score END DESC NULLS LAST,
      CASE WHEN p_sort = 'relevance' AND v_tsquery IS NULL THEN f.display_order END ASC,
      CASE WHEN p_sort = 'price_asc' THEN COALESCE(f.sale_price, f.price) END ASC NULLS LAST,
      CASE WHEN p_sort = 'price_desc' THEN COALESCE(f.sale_price, f.price) END DESC NULLS LAST,
      CASE WHEN p_sort = 'newest' THEN f.plant_id END DESC,
      CASE WHEN p_sort = 'name_asc' THEN 1 END ASC,
      CASE WHEN p_sort = 'rarity_desc' THEN f.rarity_ordinal END DESC NULLS LAST,
      f.display_order ASC
    LIMIT p_page_size OFFSET v_offset
  ),
  facet_plant_type AS (
    SELECT f.plant_type AS val, COUNT(*) AS cnt FROM filtered f WHERE f.plant_type IS NOT NULL GROUP BY f.plant_type
  ),
  facet_difficulty AS (
    SELECT f.difficulty AS val, COUNT(*) AS cnt FROM filtered f WHERE f.difficulty IS NOT NULL GROUP BY f.difficulty
  ),
  facet_rarity AS (
    SELECT f.rarity AS val, COUNT(*) AS cnt FROM filtered f WHERE f.rarity IS NOT NULL GROUP BY f.rarity
  ),
  facet_water AS (
    SELECT f.water AS val, COUNT(*) AS cnt FROM filtered f WHERE f.water IS NOT NULL GROUP BY f.water
  ),
  facet_humidity AS (
    SELECT f.humidity AS val, COUNT(*) AS cnt FROM filtered f WHERE f.humidity IS NOT NULL GROUP BY f.humidity
  )
  SELECT
    (SELECT total FROM counted),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('plant_id', s.plant_id, 'score', s.score))
      FROM sorted s
    ), '[]'::jsonb),
    jsonb_build_object(
      'plant_type', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_plant_type), '{}'::jsonb),
      'difficulty', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_difficulty), '{}'::jsonb),
      'rarity', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_rarity), '{}'::jsonb),
      'water', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_water), '{}'::jsonb),
      'humidity', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_humidity), '{}'::jsonb)
    )
  INTO v_total, v_items, v_facets;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(COALESCE(v_total, 0)::numeric / p_page_size),
    'items', COALESCE(v_items, '[]'::jsonb),
    'facets', COALESCE(v_facets, '{}'::jsonb),
    'relevance_variant', COALESCE(p_ab_variant, 'A')
  );
END;
$function$;

-- Update the index trigger to sync min_temp_c
CREATE OR REPLACE FUNCTION public.sync_search_index_min_temp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE plant_search_index
  SET min_temp_c = NEW.min_temp_c
  WHERE plant_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_min_temp_to_index ON public.plants;
CREATE TRIGGER trg_sync_min_temp_to_index
  AFTER UPDATE OF min_temp_c ON public.plants
  FOR EACH ROW
  WHEN (OLD.min_temp_c IS DISTINCT FROM NEW.min_temp_c)
  EXECUTE FUNCTION public.sync_search_index_min_temp();
