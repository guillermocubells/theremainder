
CREATE OR REPLACE FUNCTION public.compute_relevance_boost(
  p_is_featured BOOLEAN, p_stock_qty INTEGER, p_product_images TEXT[], p_sale_price NUMERIC
)
RETURNS NUMERIC(4,2) LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT ROUND(
    (CASE WHEN COALESCE(p_is_featured, false) THEN 1.5 ELSE 1.0 END) *
    (CASE WHEN COALESCE(p_stock_qty, 0) > 0 THEN 1.3 ELSE 1.0 END) *
    (CASE WHEN p_product_images IS NOT NULL AND COALESCE(array_length(p_product_images, 1), 0) > 0 THEN 1.1 ELSE 1.0 END) *
    (CASE WHEN p_sale_price IS NOT NULL THEN 1.05 ELSE 1.0 END),
    2
  )::NUMERIC(4,2);
$$;

CREATE OR REPLACE FUNCTION public.reindex_plant(p_plant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_plant plants%ROWTYPE;
  v_checksum TEXT;
  v_existing_checksum TEXT;
  v_name_lower TEXT;
  v_common_lower TEXT;
  v_sci_lower TEXT;
  v_family_lower TEXT;
  v_variety_lower TEXT;
  v_desc_lower TEXT;
  v_sv TSVECTOR;
  v_has_images BOOLEAN;
BEGIN
  SELECT * INTO v_plant FROM plants WHERE id = p_plant_id;
  
  IF v_plant.id IS NULL THEN
    DELETE FROM plant_search_index WHERE plant_id = p_plant_id;
    RETURN TRUE;
  END IF;
  
  v_checksum := md5(
    COALESCE(v_plant.name, '') || '|' ||
    COALESCE(v_plant.common_name, '') || '|' ||
    COALESCE(v_plant.scientific_name, '') || '|' ||
    COALESCE(v_plant.family, '') || '|' ||
    COALESCE(v_plant.variety, '') || '|' ||
    COALESCE(v_plant.plant_type::TEXT, '') || '|' ||
    COALESCE(v_plant.difficulty::TEXT, '') || '|' ||
    COALESCE(v_plant.rarity::TEXT, '') || '|' ||
    COALESCE(v_plant.water::TEXT, '') || '|' ||
    COALESCE(v_plant.humidity::TEXT, '') || '|' ||
    COALESCE(v_plant.price::TEXT, '0') || '|' ||
    COALESCE(v_plant.sale_price::TEXT, '') || '|' ||
    COALESCE(v_plant.stock_qty::TEXT, '0') || '|' ||
    COALESCE(v_plant.is_featured::TEXT, 'false') || '|' ||
    COALESCE(v_plant.is_active::TEXT, 'true') || '|' ||
    COALESCE(v_plant.display_order::TEXT, '0')
  );
  
  SELECT checksum INTO v_existing_checksum
  FROM plant_search_index WHERE plant_id = p_plant_id;
  
  IF v_existing_checksum = v_checksum THEN
    RETURN FALSE;
  END IF;
  
  v_name_lower := lower(COALESCE(v_plant.name, ''));
  v_common_lower := lower(COALESCE(v_plant.common_name, ''));
  v_sci_lower := lower(COALESCE(v_plant.scientific_name, ''));
  v_family_lower := lower(COALESCE(v_plant.family, ''));
  v_variety_lower := lower(COALESCE(v_plant.variety, ''));
  v_desc_lower := lower(COALESCE(v_plant.description, ''));
  
  v_sv := setweight(to_tsvector('simple', v_name_lower), 'A') ||
          setweight(to_tsvector('simple', v_common_lower), 'A') ||
          setweight(to_tsvector('simple', v_sci_lower), 'B') ||
          setweight(to_tsvector('simple', v_variety_lower), 'B') ||
          setweight(to_tsvector('simple', v_family_lower), 'C') ||
          setweight(to_tsvector('simple', v_desc_lower), 'D');

  v_has_images := v_plant.product_images IS NOT NULL AND COALESCE(array_length(v_plant.product_images, 1), 0) > 0;
  
  INSERT INTO plant_search_index (
    plant_id, name_tokens, common_name_tokens, scientific_name_tokens,
    family_tokens, variety_tokens, description_tokens, search_vector,
    relevance_boost, is_in_stock, has_images, is_on_sale, rarity_ordinal,
    plant_type, difficulty, rarity, water, humidity,
    exposure, climate_zones, hardiness_zones, plant_use, category_id,
    price, sale_price, display_order, indexed_at, checksum
  ) VALUES (
    v_plant.id, v_name_lower, v_common_lower, v_sci_lower,
    v_family_lower, v_variety_lower, v_desc_lower, v_sv,
    compute_relevance_boost(v_plant.is_featured, v_plant.stock_qty, v_plant.product_images, v_plant.sale_price),
    COALESCE(v_plant.stock_qty, 0) > 0,
    v_has_images,
    v_plant.sale_price IS NOT NULL,
    rarity_to_ordinal(COALESCE(v_plant.rarity::TEXT, 'common')),
    v_plant.plant_type::TEXT, v_plant.difficulty::TEXT, v_plant.rarity::TEXT,
    v_plant.water::TEXT, v_plant.humidity::TEXT,
    COALESCE(v_plant.exposure::TEXT[], '{}'), COALESCE(v_plant.climate_zones, '{}'),
    COALESCE(v_plant.hardiness_zones, '{}'), COALESCE(v_plant.plant_use::TEXT[], '{}'),
    v_plant.category_id,
    v_plant.price, v_plant.sale_price, COALESCE(v_plant.display_order, 0),
    now(), v_checksum
  )
  ON CONFLICT (plant_id) DO UPDATE SET
    name_tokens = EXCLUDED.name_tokens,
    common_name_tokens = EXCLUDED.common_name_tokens,
    scientific_name_tokens = EXCLUDED.scientific_name_tokens,
    family_tokens = EXCLUDED.family_tokens,
    variety_tokens = EXCLUDED.variety_tokens,
    description_tokens = EXCLUDED.description_tokens,
    search_vector = EXCLUDED.search_vector,
    relevance_boost = EXCLUDED.relevance_boost,
    is_in_stock = EXCLUDED.is_in_stock,
    has_images = EXCLUDED.has_images,
    is_on_sale = EXCLUDED.is_on_sale,
    rarity_ordinal = EXCLUDED.rarity_ordinal,
    plant_type = EXCLUDED.plant_type,
    difficulty = EXCLUDED.difficulty,
    rarity = EXCLUDED.rarity,
    water = EXCLUDED.water,
    humidity = EXCLUDED.humidity,
    exposure = EXCLUDED.exposure,
    climate_zones = EXCLUDED.climate_zones,
    hardiness_zones = EXCLUDED.hardiness_zones,
    plant_use = EXCLUDED.plant_use,
    category_id = EXCLUDED.category_id,
    price = EXCLUDED.price,
    sale_price = EXCLUDED.sale_price,
    display_order = EXCLUDED.display_order,
    indexed_at = now(),
    index_version = plant_search_index.index_version + 1,
    checksum = EXCLUDED.checksum;
  
  RETURN TRUE;
END;
$$;
