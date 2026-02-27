
-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ══════════════════════════════════════════════════════════════════════
-- Denormalized search index table
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.plant_search_index (
  plant_id UUID PRIMARY KEY REFERENCES public.plants(id) ON DELETE CASCADE,
  name_tokens TEXT NOT NULL DEFAULT '',
  common_name_tokens TEXT NOT NULL DEFAULT '',
  scientific_name_tokens TEXT NOT NULL DEFAULT '',
  family_tokens TEXT NOT NULL DEFAULT '',
  variety_tokens TEXT NOT NULL DEFAULT '',
  description_tokens TEXT NOT NULL DEFAULT '',
  search_vector TSVECTOR,
  relevance_boost NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  is_in_stock BOOLEAN NOT NULL DEFAULT FALSE,
  has_images BOOLEAN NOT NULL DEFAULT FALSE,
  is_on_sale BOOLEAN NOT NULL DEFAULT FALSE,
  rarity_ordinal SMALLINT NOT NULL DEFAULT 1,
  plant_type TEXT,
  difficulty TEXT,
  rarity TEXT,
  water TEXT,
  humidity TEXT,
  exposure TEXT[] DEFAULT '{}',
  climate_zones TEXT[] DEFAULT '{}',
  hardiness_zones TEXT[] DEFAULT '{}',
  plant_use TEXT[] DEFAULT '{}',
  category_id UUID,
  price NUMERIC,
  sale_price NUMERIC,
  display_order INTEGER NOT NULL DEFAULT 0,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  index_version INTEGER NOT NULL DEFAULT 1,
  checksum TEXT
);

CREATE INDEX idx_psi_search_vector ON public.plant_search_index USING GIN(search_vector);
CREATE INDEX idx_psi_name_trgm ON public.plant_search_index USING GIN(name_tokens gin_trgm_ops);
CREATE INDEX idx_psi_common_name_trgm ON public.plant_search_index USING GIN(common_name_tokens gin_trgm_ops);
CREATE INDEX idx_psi_scientific_name_trgm ON public.plant_search_index USING GIN(scientific_name_tokens gin_trgm_ops);
CREATE INDEX idx_psi_plant_type ON public.plant_search_index(plant_type);
CREATE INDEX idx_psi_difficulty ON public.plant_search_index(difficulty);
CREATE INDEX idx_psi_rarity ON public.plant_search_index(rarity);
CREATE INDEX idx_psi_in_stock ON public.plant_search_index(is_in_stock);
CREATE INDEX idx_psi_climate_zones ON public.plant_search_index USING GIN(climate_zones);
CREATE INDEX idx_psi_hardiness_zones ON public.plant_search_index USING GIN(hardiness_zones);
CREATE INDEX idx_psi_exposure ON public.plant_search_index USING GIN(exposure);
CREATE INDEX idx_psi_price ON public.plant_search_index(price);
CREATE INDEX idx_psi_display_order ON public.plant_search_index(display_order);
CREATE INDEX idx_psi_rarity_ordinal ON public.plant_search_index(rarity_ordinal DESC);

ALTER TABLE public.plant_search_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Search index is publicly readable"
  ON public.plant_search_index FOR SELECT USING (true);

CREATE POLICY "Only admins can modify search index"
  ON public.plant_search_index FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ── Helpers ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rarity_to_ordinal(p_rarity TEXT)
RETURNS SMALLINT LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE p_rarity
    WHEN 'common' THEN 1 WHEN 'uncommon' THEN 2 WHEN 'medium' THEN 3
    WHEN 'rare' THEN 4 WHEN 'very_rare' THEN 5 WHEN 'ultra_rare' THEN 6
    ELSE 1
  END::SMALLINT;
$$;

CREATE OR REPLACE FUNCTION public.compute_relevance_boost(
  p_is_featured BOOLEAN, p_stock_qty INTEGER, p_product_images TEXT[], p_sale_price NUMERIC
)
RETURNS NUMERIC(4,2) LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT ROUND(
    (CASE WHEN p_is_featured THEN 1.5 ELSE 1.0 END) *
    (CASE WHEN p_stock_qty > 0 THEN 1.3 ELSE 1.0 END) *
    (CASE WHEN p_product_images IS NOT NULL AND array_length(p_product_images, 1) > 0 THEN 1.1 ELSE 1.0 END) *
    (CASE WHEN p_sale_price IS NOT NULL THEN 1.05 ELSE 1.0 END),
    2
  )::NUMERIC(4,2);
$$;

-- ── Reindex single plant (upsert, idempotent) ───────────────────────

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
BEGIN
  SELECT * INTO v_plant FROM plants WHERE id = p_plant_id;
  
  IF v_plant.id IS NULL THEN
    DELETE FROM plant_search_index WHERE plant_id = p_plant_id;
    RETURN TRUE;
  END IF;
  
  -- Checksum for idempotency (cast enums to text explicitly)
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
    RETURN FALSE; -- No change
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
    v_plant.stock_qty > 0,
    v_plant.product_images IS NOT NULL AND array_length(v_plant.product_images, 1) > 0,
    v_plant.sale_price IS NOT NULL,
    rarity_to_ordinal(v_plant.rarity::TEXT),
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

-- ── Full reindex ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.full_reindex_catalog(p_batch_size INTEGER DEFAULT 100)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_plant RECORD;
  v_indexed INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors INTEGER := 0;
  v_deleted INTEGER := 0;
  v_result BOOLEAN;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM plants;
  
  FOR v_plant IN SELECT id FROM plants ORDER BY display_order ASC LOOP
    BEGIN
      v_result := reindex_plant(v_plant.id);
      IF v_result THEN v_indexed := v_indexed + 1;
      ELSE v_skipped := v_skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING '[full_reindex] Error indexing plant %: %', v_plant.id, SQLERRM;
    END;
  END LOOP;
  
  DELETE FROM plant_search_index WHERE plant_id NOT IN (SELECT id FROM plants);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'total', v_total, 'indexed', v_indexed, 'skipped', v_skipped,
    'deleted', v_deleted, 'errors', v_errors, 'completed_at', now()
  );
END;
$$;

-- ── Trigger: auto-index on plant changes ─────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_reindex_plant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM plant_search_index WHERE plant_id = OLD.id;
    RETURN OLD;
  ELSE
    PERFORM reindex_plant(NEW.id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_reindex_plant_on_change
  AFTER INSERT OR UPDATE OR DELETE ON public.plants
  FOR EACH ROW EXECUTE FUNCTION public.trigger_reindex_plant();
