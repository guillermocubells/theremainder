
-- =============================================
-- 1. Composite index on collection_items(collection_id, added_at) for sorted listing
-- =============================================
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_added
  ON public.collection_items (collection_id, added_at DESC);

-- =============================================
-- 2. GIN index on owned_plants.tags for @> (contains) queries
-- =============================================
CREATE INDEX IF NOT EXISTS idx_owned_plants_tags_gin
  ON public.owned_plants USING GIN (tags);

-- =============================================
-- 3. Composite index on plant_observations for recent-per-user queries
-- =============================================
CREATE INDEX IF NOT EXISTS idx_plant_observations_user_date
  ON public.plant_observations (user_id, observation_date DESC);

-- =============================================
-- 4. Composite index on tags(user_id, name) already exists as unique;
--    Add covering index for listing with color
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tags_user_name
  ON public.tags (user_id, name) INCLUDE (color);

-- =============================================
-- 5. Index on collections(user_id, updated_at) for sorted dashboard
-- =============================================
CREATE INDEX IF NOT EXISTS idx_collections_user_updated
  ON public.collections (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- =============================================
-- 6. Partial index on plant_locations active + name for dropdown lookups
-- =============================================
CREATE INDEX IF NOT EXISTS idx_plant_locations_user_name
  ON public.plant_locations (user_id, name)
  WHERE deleted_at IS NULL;

-- =============================================
-- 7. Index on item_media.user_id for RLS sub-queries
-- =============================================
CREATE INDEX IF NOT EXISTS idx_item_media_user
  ON public.item_media (user_id)
  WHERE user_id IS NOT NULL;

-- =============================================
-- 8. Trigram index on owned_plants.nickname for fuzzy search
-- =============================================
CREATE INDEX IF NOT EXISTS idx_owned_plants_nickname_trgm
  ON public.owned_plants USING GIN (nickname gin_trgm_ops);
