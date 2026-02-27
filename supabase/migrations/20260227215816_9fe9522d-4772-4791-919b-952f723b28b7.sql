
-- ══════════════════════════════════════════════════════════════════════
-- Search Config Tables: synonyms, stopwords, facet definitions, boosts
-- ══════════════════════════════════════════════════════════════════════

-- 1. Synonym groups (replaces hardcoded SYNONYM_GROUPS in searchIndex.ts)
CREATE TABLE public.search_synonyms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical TEXT NOT NULL,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  locale TEXT NOT NULL DEFAULT 'es',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE UNIQUE INDEX idx_search_synonyms_canonical_locale ON search_synonyms(canonical, locale);
CREATE INDEX idx_search_synonyms_active ON search_synonyms(is_active) WHERE is_active = true;

-- 2. Stopwords
CREATE TABLE public.search_stopwords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'es',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE UNIQUE INDEX idx_search_stopwords_word_locale ON search_stopwords(word, locale);

-- 3. Facet definitions (dynamic facet config for catalog UI)
CREATE TABLE public.search_facet_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_name TEXT NOT NULL,
  label_es TEXT NOT NULL,
  label_en TEXT NOT NULL,
  facet_type TEXT NOT NULL DEFAULT 'enum',
  multi_select BOOLEAN NOT NULL DEFAULT true,
  allowed_values TEXT[],
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE UNIQUE INDEX idx_search_facet_column ON search_facet_definitions(column_name);

-- 4. Boost configurations (A/B variants stored per row)
CREATE TABLE public.search_boost_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant TEXT NOT NULL DEFAULT 'A',
  field_weights JSONB NOT NULL DEFAULT '{"name":20,"common_name":15,"scientific_name":10,"family":5,"variety":8,"description":2}',
  exact_match_bonus JSONB NOT NULL DEFAULT '{"name":50,"common_name":30,"scientific_name":20}',
  prefix_match_bonus NUMERIC NOT NULL DEFAULT 15,
  trigram_multiplier NUMERIC NOT NULL DEFAULT 8,
  trigram_threshold NUMERIC NOT NULL DEFAULT 0.15,
  typo_tolerance JSONB NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":1,"5":1,"6":2}',
  boosts JSONB NOT NULL DEFAULT '{"is_featured":1.5,"in_stock":1.3,"has_images":1.1,"on_sale":1.05}',
  tie_breakers JSONB NOT NULL DEFAULT '[{"field":"is_featured","direction":"desc"},{"field":"stock_qty","direction":"desc"},{"field":"display_order","direction":"asc"}]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE UNIQUE INDEX idx_search_boost_variant ON search_boost_configs(variant);

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_stopwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_facet_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_boost_configs ENABLE ROW LEVEL SECURITY;

-- All 4 tables: admins can manage, anyone can read active entries
CREATE POLICY "Admins can manage search synonyms" ON public.search_synonyms FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active synonyms" ON public.search_synonyms FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage search stopwords" ON public.search_stopwords FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active stopwords" ON public.search_stopwords FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage facet definitions" ON public.search_facet_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active facet definitions" ON public.search_facet_definitions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage boost configs" ON public.search_boost_configs FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active boost configs" ON public.search_boost_configs FOR SELECT
  USING (is_active = true);

-- ── Updated_at triggers ──────────────────────────────────────────────

CREATE TRIGGER update_search_synonyms_updated_at
  BEFORE UPDATE ON public.search_synonyms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_search_facet_definitions_updated_at
  BEFORE UPDATE ON public.search_facet_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_search_boost_configs_updated_at
  BEFORE UPDATE ON public.search_boost_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Seed default synonyms from current hardcoded config ─────────────

INSERT INTO search_synonyms (canonical, synonyms, locale) VALUES
  ('palmera',  ARRAY['palm','arecaceae','rhopalostylis','brahea','sabal','chamaedorea','trachycarpus','phoenix','washingtonia','butia'], 'es'),
  ('helecho',  ARRAY['fern','cyathea','dicksonia','arborescente','tree fern'], 'es'),
  ('tropical', ARRAY['cálido','exótico','subtropical','baleares'], 'es'),
  ('frío',     ARRAY['resistente','heladas','continental','cantabria','hardy'], 'es'),
  ('sol',      ARRAY['soleada','luz','directo','pleno','full sun'], 'es'),
  ('sombra',   ARRAY['sombreada','semisombra','filtrada','shade','partial shade'], 'es'),
  ('interior', ARRAY['indoor','maceta','salón','oficina'], 'es'),
  ('exterior', ARRAY['outdoor','jardín','terraza','patio'], 'es'),
  ('riego',    ARRAY['agua','húmedo','sequía','watering'], 'es'),
  ('raro',     ARRAY['rare','coleccionista','collector','exclusivo'], 'es');

-- Seed default facet definitions
INSERT INTO search_facet_definitions (column_name, label_es, label_en, facet_type, multi_select, allowed_values, display_order) VALUES
  ('plant_type', 'Tipo de planta', 'Plant type', 'enum', true, ARRAY['palm','fern','tree','cycad','succulent','shrub','other'], 1),
  ('difficulty', 'Dificultad', 'Difficulty', 'enum', true, ARRAY['beginner','intermediate','advanced','expert'], 2),
  ('rarity', 'Rareza', 'Rarity', 'enum', true, ARRAY['common','uncommon','medium','rare','very_rare','ultra_rare'], 3),
  ('water', 'Riego', 'Watering', 'enum', true, ARRAY['low','medium','high'], 4),
  ('humidity', 'Humedad', 'Humidity', 'enum', true, ARRAY['low','medium','high'], 5),
  ('exposure', 'Exposición', 'Exposure', 'keyword_array', true, NULL, 6),
  ('climate_zones', 'Zona climática', 'Climate zone', 'keyword_array', true, NULL, 7),
  ('hardiness_zones', 'Zona de rusticidad', 'Hardiness zone', 'keyword_array', true, NULL, 8),
  ('plant_use', 'Uso', 'Use', 'keyword_array', true, NULL, 9);

-- Seed default boost configs (A/B)
INSERT INTO search_boost_configs (variant) VALUES ('A');
INSERT INTO search_boost_configs (variant, trigram_threshold, field_weights, boosts) VALUES
  ('B', 0.12, '{"name":25,"common_name":18,"scientific_name":12,"family":5,"variety":8,"description":2}', '{"is_featured":1.8,"in_stock":1.3,"has_images":1.1,"on_sale":1.05}');

-- Seed common Spanish/English stopwords
INSERT INTO search_stopwords (word, locale) VALUES
  ('el','es'),('la','es'),('los','es'),('las','es'),('de','es'),('del','es'),('en','es'),
  ('un','es'),('una','es'),('para','es'),('con','es'),('por','es'),('que','es'),('es','es'),
  ('the','en'),('a','en'),('an','en'),('of','en'),('in','en'),('for','en'),('and','en'),
  ('to','en'),('is','en'),('it','en'),('with','en'),('on','en'),('at','en'),('by','en');
