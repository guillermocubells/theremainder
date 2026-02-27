
-- 1. Add tags column to plants (if not exists)
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Add tags + origin_country to plant_search_index
ALTER TABLE public.plant_search_index ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.plant_search_index ADD COLUMN IF NOT EXISTS origin_country text;

-- 3. Update the reindex trigger/function to copy tags + origin_country
-- (We'll handle this via the reindex edge function, but let's update existing index rows)
UPDATE public.plant_search_index si
SET
  tags = COALESCE(p.tags, '{}'),
  origin_country = p.origin_country
FROM public.plants p
WHERE si.plant_id = p.id;

-- 4. Replace search_catalog to add tags + origin_country filtering and facets
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
  p_ab_variant text DEFAULT NULL
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
      si.tags,
      si.origin_country,
      si.category_id,
      si.is_in_stock,
      si.is_on_sale
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
  ),
  counted AS (
    SELECT COUNT(*) AS total FROM filtered
  ),
  sorted AS (
    SELECT f.*
    FROM filtered f
    ORDER BY
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
  ),
  facet_tags AS (
    SELECT t AS val, COUNT(*) AS cnt FROM filtered f, unnest(f.tags) t GROUP BY t
  ),
  facet_origin_country AS (
    SELECT f.origin_country AS val, COUNT(*) AS cnt FROM filtered f WHERE f.origin_country IS NOT NULL GROUP BY f.origin_country
  )
  SELECT
    (SELECT total FROM counted),
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'plant_id', s.plant_id,
          'score', round(s.score::numeric, 4)
        )
      )
      FROM sorted s
    ), '[]'::jsonb),
    jsonb_build_object(
      'plant_type', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_plant_type), '{}'::jsonb),
      'difficulty', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_difficulty), '{}'::jsonb),
      'rarity', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_rarity), '{}'::jsonb),
      'water', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_water), '{}'::jsonb),
      'humidity', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_humidity), '{}'::jsonb),
      'tags', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_tags), '{}'::jsonb),
      'origin_country', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_origin_country), '{}'::jsonb)
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
