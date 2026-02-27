
-- ══════════════════════════════════════════════════════════════════════
-- Relevance Tuning: configurable boosts, typo tolerance, tie-breakers, A/B flags
-- ══════════════════════════════════════════════════════════════════════

-- Store tuning configuration in store_settings (admin-managed)
INSERT INTO store_settings (key, value) VALUES
  ('search_relevance_config', jsonb_build_object(
    'version', 1,
    'ab_variant', 'A',
    -- Field weights (multiplied with match score per field)
    'field_weights', jsonb_build_object(
      'name', 20,
      'common_name', 15,
      'scientific_name', 10,
      'family', 3,
      'variety', 5,
      'description', 2
    ),
    -- Exact-match bonus (when entire query appears in field)
    'exact_match_bonus', jsonb_build_object(
      'name', 30,
      'common_name', 20,
      'scientific_name', 15
    ),
    -- Prefix-match bonus
    'prefix_match_bonus', 8,
    -- Trigram similarity multiplier
    'trigram_multiplier', 5,
    -- Trigram similarity threshold (0-1, below this = no match)
    'trigram_threshold', 0.15,
    -- Typo tolerance: max edit distance by token length
    -- key = min token length, value = max allowed edits
    'typo_tolerance', jsonb_build_object(
      '1', 0,
      '2', 0,
      '3', 0,
      '4', 1,
      '5', 1,
      '6', 2
    ),
    -- Boost signals
    'boosts', jsonb_build_object(
      'is_featured', 1.5,
      'in_stock', 1.3,
      'has_images', 1.1,
      'on_sale', 1.05
    ),
    -- Tie-breaker order (when scores are equal)
    'tie_breakers', jsonb_build_array(
      jsonb_build_object('field', 'is_featured', 'direction', 'desc'),
      jsonb_build_object('field', 'is_in_stock', 'direction', 'desc'),
      jsonb_build_object('field', 'display_order', 'direction', 'asc'),
      jsonb_build_object('field', 'rarity_ordinal', 'direction', 'desc')
    )
  ))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Variant B config for A/B testing (more aggressive typo tolerance, different weights)
INSERT INTO store_settings (key, value) VALUES
  ('search_relevance_config_b', jsonb_build_object(
    'version', 1,
    'ab_variant', 'B',
    'field_weights', jsonb_build_object(
      'name', 25,
      'common_name', 18,
      'scientific_name', 12,
      'family', 2,
      'variety', 4,
      'description', 1
    ),
    'exact_match_bonus', jsonb_build_object(
      'name', 40,
      'common_name', 25,
      'scientific_name', 18
    ),
    'prefix_match_bonus', 10,
    'trigram_multiplier', 7,
    'trigram_threshold', 0.12,
    'typo_tolerance', jsonb_build_object(
      '1', 0,
      '2', 0,
      '3', 1,
      '4', 1,
      '5', 2,
      '6', 2
    ),
    'boosts', jsonb_build_object(
      'is_featured', 1.8,
      'in_stock', 1.4,
      'has_images', 1.15,
      'on_sale', 1.1
    ),
    'tie_breakers', jsonb_build_array(
      jsonb_build_object('field', 'in_stock', 'direction', 'desc'),
      jsonb_build_object('field', 'is_featured', 'direction', 'desc'),
      jsonb_build_object('field', 'rarity_ordinal', 'direction', 'desc'),
      jsonb_build_object('field', 'display_order', 'direction', 'asc')
    )
  ))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Upgraded search_catalog with configurable relevance tuning
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
  p_page_size INTEGER DEFAULT 24,
  p_ab_variant TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_offset INTEGER;
  v_tsquery tsquery;
  v_norm_query TEXT;
  v_total BIGINT;
  v_items JSONB;
  v_facets JSONB;
  v_config JSONB;
  v_fw JSONB;
  v_emb JSONB;
  v_pmb NUMERIC;
  v_trgm_mult NUMERIC;
  v_trgm_thresh NUMERIC;
  v_boost_featured NUMERIC;
  v_boost_stock NUMERIC;
  v_boost_images NUMERIC;
  v_boost_sale NUMERIC;
  v_variant TEXT;
BEGIN
  p_page := GREATEST(p_page, 1);
  p_page_size := LEAST(GREATEST(p_page_size, 1), 100);
  v_offset := (p_page - 1) * p_page_size;

  -- Load relevance config (A/B aware)
  v_variant := COALESCE(p_ab_variant, 'A');
  IF v_variant = 'B' THEN
    SELECT value INTO v_config FROM store_settings WHERE key = 'search_relevance_config_b';
  END IF;
  IF v_config IS NULL THEN
    SELECT value INTO v_config FROM store_settings WHERE key = 'search_relevance_config';
  END IF;
  -- Fallback defaults if no config
  IF v_config IS NULL THEN
    v_config := '{}'::jsonb;
  END IF;

  v_fw := COALESCE(v_config->'field_weights', '{"name":20,"common_name":15,"scientific_name":10,"family":3,"variety":5,"description":2}'::jsonb);
  v_emb := COALESCE(v_config->'exact_match_bonus', '{"name":30,"common_name":20,"scientific_name":15}'::jsonb);
  v_pmb := COALESCE((v_config->>'prefix_match_bonus')::numeric, 8);
  v_trgm_mult := COALESCE((v_config->>'trigram_multiplier')::numeric, 5);
  v_trgm_thresh := COALESCE((v_config->>'trigram_threshold')::numeric, 0.15);
  v_boost_featured := COALESCE((v_config->'boosts'->>'is_featured')::numeric, 1.5);
  v_boost_stock := COALESCE((v_config->'boosts'->>'in_stock')::numeric, 1.3);
  v_boost_images := COALESCE((v_config->'boosts'->>'has_images')::numeric, 1.1);
  v_boost_sale := COALESCE((v_config->'boosts'->>'on_sale')::numeric, 1.05);

  -- Build tsquery
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
      CASE WHEN v_tsquery IS NOT NULL THEN
        -- FTS base score
        ts_rank_cd(si.search_vector, v_tsquery, 32) * si.relevance_boost * 10
        -- Exact match bonuses (configurable per field)
        + CASE WHEN si.name_tokens ILIKE '%' || v_norm_query || '%' THEN COALESCE((v_emb->>'name')::numeric, 30) ELSE 0 END
        + CASE WHEN si.common_name_tokens ILIKE '%' || v_norm_query || '%' THEN COALESCE((v_emb->>'common_name')::numeric, 20) ELSE 0 END
        + CASE WHEN si.scientific_name_tokens ILIKE '%' || v_norm_query || '%' THEN COALESCE((v_emb->>'scientific_name')::numeric, 15) ELSE 0 END
        -- Prefix bonus (word starts with query)
        + CASE WHEN si.name_tokens ILIKE v_norm_query || '%' THEN v_pmb ELSE 0 END
        + CASE WHEN si.common_name_tokens ILIKE v_norm_query || '%' THEN v_pmb * 0.8 ELSE 0 END
        -- Trigram similarity (typo tolerance) with configurable threshold & multiplier
        + CASE WHEN similarity(si.name_tokens, v_norm_query) > v_trgm_thresh
            THEN similarity(si.name_tokens, v_norm_query) * v_trgm_mult * COALESCE((v_fw->>'name')::numeric, 20) / 20
            ELSE 0 END
        + CASE WHEN similarity(si.common_name_tokens, v_norm_query) > v_trgm_thresh
            THEN similarity(si.common_name_tokens, v_norm_query) * v_trgm_mult * COALESCE((v_fw->>'common_name')::numeric, 15) / 20
            ELSE 0 END
        + CASE WHEN similarity(si.scientific_name_tokens, v_norm_query) > v_trgm_thresh
            THEN similarity(si.scientific_name_tokens, v_norm_query) * v_trgm_mult * COALESCE((v_fw->>'scientific_name')::numeric, 10) / 20
            ELSE 0 END
      ELSE 0
      END
      -- Apply boost signals
      * CASE WHEN si.is_in_stock THEN v_boost_stock ELSE 1.0 END
      * CASE WHEN si.has_images THEN v_boost_images ELSE 1.0 END
      * CASE WHEN si.is_on_sale THEN v_boost_sale ELSE 1.0 END
      * CASE WHEN EXISTS (SELECT 1 FROM plants pp WHERE pp.id = si.plant_id AND pp.is_featured = true) THEN v_boost_featured ELSE 1.0 END
      AS score,
      si.price,
      si.sale_price,
      si.display_order,
      si.rarity_ordinal,
      si.plant_type,
      si.difficulty,
      si.rarity,
      si.water,
      si.humidity,
      si.is_in_stock,
      si.has_images,
      si.is_on_sale
    FROM plant_search_index si
    JOIN plants p ON p.id = si.plant_id AND p.is_active = true
    WHERE
      (v_tsquery IS NULL OR (
        si.search_vector @@ v_tsquery
        OR si.name_tokens ILIKE '%' || v_norm_query || '%'
        OR si.common_name_tokens ILIKE '%' || v_norm_query || '%'
        OR si.scientific_name_tokens ILIKE '%' || v_norm_query || '%'
        OR similarity(si.name_tokens, v_norm_query) > v_trgm_thresh
        OR similarity(si.common_name_tokens, v_norm_query) > v_trgm_thresh
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
      -- Tie-breakers: featured first, then in-stock, then display_order, then rarity
      (CASE WHEN EXISTS (SELECT 1 FROM plants pp WHERE pp.id = f.plant_id AND pp.is_featured) THEN 0 ELSE 1 END) ASC,
      (CASE WHEN f.is_in_stock THEN 0 ELSE 1 END) ASC,
      f.display_order ASC,
      f.rarity_ordinal DESC NULLS LAST
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
    'facets', COALESCE(v_facets, '{}'::jsonb),
    'relevance_variant', v_variant
  );
END;
$$;
