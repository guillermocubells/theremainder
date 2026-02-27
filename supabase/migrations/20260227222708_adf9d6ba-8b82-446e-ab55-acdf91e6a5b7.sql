
-- =============================================
-- 1. Collections table (groups of plants)
-- =============================================
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collections_user ON public.collections (user_id) WHERE deleted_at IS NULL;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 2. Collection items (many-to-many: collection ↔ owned_plant)
-- =============================================
CREATE TABLE public.collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  owned_plant_id UUID NOT NULL REFERENCES public.owned_plants (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, owned_plant_id)
);

CREATE INDEX idx_collection_items_collection ON public.collection_items (collection_id);
CREATE INDEX idx_collection_items_plant ON public.collection_items (owned_plant_id);

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collection items"
  ON public.collection_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own collection items"
  ON public.collection_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own collection items"
  ON public.collection_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own collection items"
  ON public.collection_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.user_id = auth.uid()
  ));

-- =============================================
-- 3. Tags table (normalised, user-scoped)
-- =============================================
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX idx_tags_user ON public.tags (user_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags"
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON public.tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 4. Item tags junction (owned_plant ↔ tag)
-- =============================================
CREATE TABLE public.item_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owned_plant_id UUID NOT NULL REFERENCES public.owned_plants (id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owned_plant_id, tag_id)
);

CREATE INDEX idx_item_tags_plant ON public.item_tags (owned_plant_id);
CREATE INDEX idx_item_tags_tag ON public.item_tags (tag_id);

ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own item tags"
  ON public.item_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.owned_plants op
    WHERE op.id = owned_plant_id AND op.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own item tags"
  ON public.item_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.owned_plants op
    WHERE op.id = owned_plant_id AND op.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own item tags"
  ON public.item_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.owned_plants op
    WHERE op.id = owned_plant_id AND op.user_id = auth.uid()
  ));

-- =============================================
-- 5. Add soft-delete to owned_plants & plant_locations
-- =============================================
ALTER TABLE public.owned_plants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.plant_locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes for soft-delete queries
CREATE INDEX IF NOT EXISTS idx_owned_plants_active ON public.owned_plants (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_plant_locations_active ON public.plant_locations (user_id) WHERE deleted_at IS NULL;

-- =============================================
-- 6. Add user_id to item_media for RLS
-- =============================================
ALTER TABLE public.item_media ADD COLUMN IF NOT EXISTS user_id UUID;

-- Back-fill user_id from the parent owned_plant
UPDATE public.item_media im
SET user_id = op.user_id
FROM public.owned_plants op
WHERE im.item_id = op.id AND im.user_id IS NULL;

-- =============================================
-- 7. Timestamp trigger for collections
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
