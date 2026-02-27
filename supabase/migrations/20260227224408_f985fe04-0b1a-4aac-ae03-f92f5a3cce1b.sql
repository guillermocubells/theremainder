
-- Activity log for collection module
CREATE TABLE public.collection_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,  -- collection_created, collection_updated, collection_archived, item_added, item_removed, media_uploaded, media_deleted, share_updated, share_revoked, tag_attached, tag_detached, location_created
  entity_type TEXT NOT NULL,  -- collection, item, media, share, tag, location
  entity_id UUID,
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collection_activity_log ENABLE ROW LEVEL SECURITY;

-- Owner can read their own activity
CREATE POLICY "Users read own activity"
  ON public.collection_activity_log FOR SELECT
  USING (user_id = auth.uid());

-- Only service role inserts (from edge function)
CREATE POLICY "Service inserts activity"
  ON public.collection_activity_log FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_collection_activity_user ON public.collection_activity_log(user_id, created_at DESC);
CREATE INDEX idx_collection_activity_collection ON public.collection_activity_log(collection_id, created_at DESC) WHERE collection_id IS NOT NULL;
CREATE INDEX idx_collection_activity_type ON public.collection_activity_log(event_type);
