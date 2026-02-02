-- Create new enums for plant attributes
CREATE TYPE plant_type AS ENUM ('palm', 'fern', 'tree', 'cycad', 'shrub', 'other');
CREATE TYPE growth_speed AS ENUM ('slow', 'medium', 'fast');
CREATE TYPE water_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE humidity_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE rarity_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE difficulty_level AS ENUM ('easy', 'intermediate', 'advanced');

-- Add new columns to plants table
ALTER TABLE public.plants
  ADD COLUMN IF NOT EXISTS common_name text,
  ADD COLUMN IF NOT EXISTS plant_type plant_type DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS exposure text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS climate_zones text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_temp_c integer,
  ADD COLUMN IF NOT EXISTS water water_level,
  ADD COLUMN IF NOT EXISTS humidity humidity_level,
  ADD COLUMN IF NOT EXISTS plant_use text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rarity rarity_level DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS difficulty difficulty_level DEFAULT 'intermediate',
  ADD COLUMN IF NOT EXISTS is_in_stock boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text;

-- Migrate existing data to new columns
UPDATE public.plants SET
  common_name = name,
  is_in_stock = (stock > 0),
  climate_zones = CASE 
    WHEN hardiness_zone IS NOT NULL THEN ARRAY[hardiness_zone]
    ELSE '{}'::text[]
  END,
  exposure = CASE 
    WHEN sun_requirement = 'Soleada' THEN ARRAY['sun']
    WHEN sun_requirement = 'Semisol' THEN ARRAY['sun', 'semi-shade']
    WHEN sun_requirement = 'Semisombra' THEN ARRAY['semi-shade']
    WHEN sun_requirement = 'Sombreada' THEN ARRAY['shade']
    ELSE '{}'::text[]
  END,
  water = CASE 
    WHEN water_requirement = 'Alta' THEN 'high'::water_level
    WHEN water_requirement = 'Moderada' THEN 'medium'::water_level
    WHEN water_requirement = 'Baja' THEN 'low'::water_level
    ELSE 'medium'::water_level
  END,
  plant_type = CASE
    WHEN category_id IN (SELECT id FROM categories WHERE slug LIKE '%palm%') THEN 'palm'::plant_type
    WHEN category_id IN (SELECT id FROM categories WHERE slug LIKE '%fern%' OR slug LIKE '%helecho%') THEN 'fern'::plant_type
    WHEN category_id IN (SELECT id FROM categories WHERE slug LIKE '%cycad%' OR slug LIKE '%cicad%') THEN 'cycad'::plant_type
    ELSE 'other'::plant_type
  END
WHERE true;

-- Rename stock to stock_qty for clarity
ALTER TABLE public.plants RENAME COLUMN stock TO stock_qty;