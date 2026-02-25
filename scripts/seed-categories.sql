-- =============================================================
-- Idempotent Category & Taxonomy Seed Script
-- Run with: Lovable Cloud > Run SQL  (or via migration tool)
-- Safe to re-run: uses ON CONFLICT DO UPDATE for upserts
-- =============================================================

-- 1. Seed all categories
INSERT INTO categories (name, slug, description, display_order, is_active) VALUES
  ('Palmeras',              'palmeras',              'Colección de palmeras tropicales y subtropicales',  1,  true),
  ('Cícadas',               'cicadas',               'Cícadas prehistóricas y de colección',             2,  true),
  ('Árboles ornamentales',  'arboles-ornamentales',  'Árboles ornamentales y coníferas',                 3,  true),
  ('Arbustos ornamentales', 'arbustos-ornamentales', 'Arbustos y plantas ornamentales',                  4,  true),
  ('Helechos arbóreos',     'helechos-arboreos',     'Helechos arborescentes ancestrales de gran porte', 5,  true),
  ('Bambús',                'bambus',                'Bambús ornamentales y de jardín',                   6,  true),
  ('Suculentas',            'suculentas',            'Suculentas raras y de colección',                  7,  true),
  ('Cactus',                'cactus',                'Cactus ornamentales y de colección',                8,  true),
  ('Coníferas',             'coniferas',             'Coníferas ornamentales y de paisajismo',            9,  true),
  ('Bromeliáceas',          'bromeliaceas',          'Bromeliáceas tropicales y subtropicales',          10,  true),
  ('Heliconias',            'heliconias',            'Heliconias tropicales de flor espectacular',       11,  true),
  ('Estrelicias',           'estrelicias',           'Estrelicias y aves del paraíso',                   12,  true),
  ('Jengibres',             'jengibres',             'Jengibres ornamentales tropicales',                13,  true),
  ('Plátanos',              'platanos',              'Plátanos ornamentales y musáceas',                 14,  true),
  ('Agaves y yucas',        'agaves-yucas',          'Agaves, yucas y plantas xerófilas',               15,  true),
  ('Aráceas',               'araceas',               'Aráceas tropicales de interior y exterior',        16,  true),
  ('Perennes',              'perennes',              'Plantas perennes ornamentales',                    17,  true),
  ('Hierbas',               'hierbas',               'Gramíneas ornamentales',                          18,  true)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active     = EXCLUDED.is_active,
  updated_at    = now();

-- 2. Plant type taxonomy mapping
-- Maps plant_type enum → category slug for auto-assignment.
-- This is the canonical mapping used by both the admin UI and CSV import.
--
--   plant_type   │ category slug
--   ─────────────┼─────────────────────
--   palm         │ palmeras
--   cycad        │ cicadas
--   tree         │ arboles-ornamentales
--   shrub        │ arbustos-ornamentales
--   fern         │ helechos-arboreos
--   succulent    │ suculentas
--   grass        │ hierbas
--   other        │ (manual assignment)

-- 3. Auto-assign category_id for any plants missing it
UPDATE plants p
SET category_id = c.id
FROM categories c
WHERE p.category_id IS NULL
  AND (
    (p.plant_type = 'palm'      AND c.slug = 'palmeras') OR
    (p.plant_type = 'cycad'     AND c.slug = 'cicadas') OR
    (p.plant_type = 'tree'      AND c.slug = 'arboles-ornamentales') OR
    (p.plant_type = 'shrub'     AND c.slug = 'arbustos-ornamentales') OR
    (p.plant_type = 'fern'      AND c.slug = 'helechos-arboreos') OR
    (p.plant_type = 'succulent' AND c.slug = 'suculentas') OR
    (p.plant_type = 'grass'     AND c.slug = 'hierbas')
  );
