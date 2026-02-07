
-- Add missing rarity values to the enum
ALTER TYPE rarity_level ADD VALUE IF NOT EXISTS 'rare';
ALTER TYPE rarity_level ADD VALUE IF NOT EXISTS 'common';
ALTER TYPE rarity_level ADD VALUE IF NOT EXISTS 'uncommon';
ALTER TYPE rarity_level ADD VALUE IF NOT EXISTS 'very_rare';
ALTER TYPE rarity_level ADD VALUE IF NOT EXISTS 'extremely_rare';

-- Add missing plant_type values
ALTER TYPE plant_type ADD VALUE IF NOT EXISTS 'succulent';
ALTER TYPE plant_type ADD VALUE IF NOT EXISTS 'grass';

-- Add missing difficulty values  
ALTER TYPE difficulty_level ADD VALUE IF NOT EXISTS 'beginner';
ALTER TYPE difficulty_level ADD VALUE IF NOT EXISTS 'expert';
