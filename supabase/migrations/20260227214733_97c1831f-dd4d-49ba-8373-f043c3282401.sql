
-- ══════════════════════════════════════════════════════════════════════
-- Synonym dictionary table
-- Types: synonym (bidirectional), one_way, phrase_mapping
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.synonym_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL DEFAULT 'synonym'
    CHECK (entry_type IN ('synonym', 'one_way', 'phrase_mapping')),
  -- For 'synonym': all terms are interchangeable
  -- For 'one_way': source_term → target_terms (source doesn't get replaced)
  -- For 'phrase_mapping': source_term phrase → single canonical target
  source_term TEXT NOT NULL,
  target_terms TEXT[] NOT NULL DEFAULT '{}',
  -- Group label for organizing (e.g. 'tropical', 'watering', 'rarity')
  group_label TEXT,
  -- Language: es, en, or universal
  language TEXT NOT NULL DEFAULT 'universal'
    CHECK (language IN ('es', 'en', 'universal')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Metadata
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Version tracking for hot-reload
  version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_sd_source_term ON public.synonym_dictionary USING GIN(source_term gin_trgm_ops);
CREATE INDEX idx_sd_entry_type ON public.synonym_dictionary(entry_type);
CREATE INDEX idx_sd_group_label ON public.synonym_dictionary(group_label);
CREATE INDEX idx_sd_active ON public.synonym_dictionary(is_active);
CREATE INDEX idx_sd_language ON public.synonym_dictionary(language);

-- Unique constraint: no duplicate source_term per type+language
CREATE UNIQUE INDEX idx_sd_unique_entry
  ON public.synonym_dictionary(entry_type, lower(source_term), language);

-- RLS
ALTER TABLE public.synonym_dictionary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active synonyms"
  ON public.synonym_dictionary FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage synonyms"
  ON public.synonym_dictionary FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_synonym_dictionary_updated_at
  BEFORE UPDATE ON public.synonym_dictionary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════════
-- Synonym version tracker (for hot-reload detection)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.synonym_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_count INTEGER NOT NULL DEFAULT 0,
  checksum TEXT
);

ALTER TABLE public.synonym_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read synonym versions"
  ON public.synonym_versions FOR SELECT USING (true);

CREATE POLICY "Admins can manage synonym versions"
  ON public.synonym_versions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert initial version
INSERT INTO public.synonym_versions (version, entry_count, checksum)
VALUES (1, 0, md5(''));

-- ══════════════════════════════════════════════════════════════════════
-- Function: bump synonym version (called after CRUD ops)
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.bump_synonym_version()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_checksum TEXT;
  v_new_version INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM synonym_dictionary WHERE is_active = true;
  
  SELECT md5(string_agg(
    id::TEXT || source_term || array_to_string(target_terms, ','),
    '|' ORDER BY id
  )) INTO v_checksum
  FROM synonym_dictionary WHERE is_active = true;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version FROM synonym_versions;

  INSERT INTO synonym_versions (version, entry_count, checksum)
  VALUES (v_new_version, v_count, COALESCE(v_checksum, md5('')));

  RETURN v_new_version;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- Seed with existing synonyms from searchIndex.ts config
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO synonym_dictionary (entry_type, source_term, target_terms, group_label, language) VALUES
  ('synonym', 'palmera', ARRAY['palm','arecaceae','rhopalostylis','brahea','sabal','chamaedorea','trachycarpus','phoenix','washingtonia','butia'], 'plants', 'universal'),
  ('synonym', 'helecho', ARRAY['fern','cyathea','dicksonia','arborescente','tree fern'], 'plants', 'universal'),
  ('synonym', 'tropical', ARRAY['cálido','exótico','subtropical','baleares'], 'climate', 'universal'),
  ('synonym', 'frío', ARRAY['resistente','heladas','continental','cantabria','hardy'], 'climate', 'universal'),
  ('synonym', 'sol', ARRAY['soleada','luz','directo','pleno','full sun'], 'exposure', 'universal'),
  ('synonym', 'sombra', ARRAY['sombreada','semisombra','filtrada','shade','partial shade'], 'exposure', 'universal'),
  ('synonym', 'interior', ARRAY['indoor','maceta','salón','oficina'], 'location', 'universal'),
  ('synonym', 'exterior', ARRAY['outdoor','jardín','terraza','patio'], 'location', 'universal'),
  ('synonym', 'riego', ARRAY['agua','húmedo','sequía','watering'], 'care', 'universal'),
  ('synonym', 'raro', ARRAY['rare','coleccionista','collector','exclusivo'], 'rarity', 'universal');

SELECT bump_synonym_version();
