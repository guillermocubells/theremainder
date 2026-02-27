
-- 1. Add item_count column to collections
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS item_count INTEGER NOT NULL DEFAULT 0;

-- Back-fill existing counts
UPDATE public.collections c
SET item_count = (
  SELECT COUNT(*) FROM public.collection_items ci WHERE ci.collection_id = c.id
);

-- 2. Trigger function: maintain collection item_count
CREATE OR REPLACE FUNCTION public.update_collection_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collections SET item_count = item_count + 1, updated_at = now() WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collections SET item_count = GREATEST(item_count - 1, 0), updated_at = now() WHERE id = OLD.collection_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.collection_id IS DISTINCT FROM NEW.collection_id THEN
    UPDATE public.collections SET item_count = GREATEST(item_count - 1, 0), updated_at = now() WHERE id = OLD.collection_id;
    UPDATE public.collections SET item_count = item_count + 1, updated_at = now() WHERE id = NEW.collection_id;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_collection_item_count
  AFTER INSERT OR UPDATE OR DELETE ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION public.update_collection_item_count();

-- 3. Add updated_at to item_media if missing
ALTER TABLE public.item_media ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 4. updated_at trigger for item_media (only one missing)
CREATE TRIGGER update_item_media_updated_at
  BEFORE UPDATE ON public.item_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
