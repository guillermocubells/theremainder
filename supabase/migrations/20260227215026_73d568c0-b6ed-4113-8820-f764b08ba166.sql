
-- ══════════════════════════════════════════════════════════════════════
-- Search API v1: DB function for full-text search with facets
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.search_catalog(
  p_query TEXT DEFAULT NULL,
  p_plant_type TEXT[] DEFAULT NULL,
  p_difficulty TEXT[] DEFAULT NULL,
  p_rarity TEXT[] DEFAULT NULL,
  p_water TEXT[] DEFAULT NULL,
  p_humidity TEXT[] DEFAULT NULL,
  p_exposure TEXT[] DEFAULT NULL,
  p_climate_zones TEXT[] DEFAULT NULL,
  p_hardiness_zones TEXT[] DEFAULT NULL,
  p_plant_use TEXT[] DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_in_stock BOOLEAN DEFAULT TRUE,
  p_is_featured BOOLEAN DEFAULT NULL,
  p_sort TEXT DEFAULT 'relevance',
  p_sort_dir TEXT DEFAULT 'asc',
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_offset INTEGER;
  v_tsquery tsquery;
  v_norm_query TEXT;
  v_results JSONB;
  v_facets JSONB;
  v_total BIGINT;
  v_items JSONB;
BEGIN
  -- Clamp pagination
  p_page := GREATEST(p_page, 1);
  p_page_size := LEAST(GREATEST(p_page_size, 1), 100);
  v_offset := (p_page - 1) * p_page_size;

  -- Build tsquery from input
  IF p_query IS NOT NULL AND length(trim(p_query)) >= 2 THEN
    v_norm_query := lower(unaccent(trim(p_query)));
    -- Build websearch-style tsquery for FTS
    BEGIN
      v_tsquery := websearch_to_tsquery('simple', v_norm_query);
    EXCEPTION WHEN OTHERS THEN
      v_tsquery := plainto_tsquery('simple', v_norm_query);
    END;
  END IF;

  -- Get total count + paginated plant_ids with scores
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
  -- Facet aggregation on the full filtered set (before pagination)
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
      'humidity', COALESCE((SELECT jsonb_object_agg(val, cnt) FROM facet_humidity), '{}'::jsonb)
    )
  INTO v_total, v_items, v_facets;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(COALESCE(v_total, 0)::numeric / p_page_size),
    'items', COALESCE(v_items, '[]'::jsonb),
    'facets', COALESCE(v_facets, '{}'::jsonb)
  );
END;
$$;
