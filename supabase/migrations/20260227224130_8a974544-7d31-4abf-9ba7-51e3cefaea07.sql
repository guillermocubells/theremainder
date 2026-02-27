
-- Sharing visibility enum
CREATE TYPE public.share_visibility AS ENUM ('private', 'link', 'public');

-- Collection shares table
CREATE TABLE public.collection_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,  -- owner
  visibility share_visibility NOT NULL DEFAULT 'private',
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  allow_download BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT DEFAULT NULL,  -- optional password protection
  expires_at TIMESTAMPTZ DEFAULT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id)
);

-- Enable RLS
ALTER TABLE public.collection_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage their shares
CREATE POLICY "Owners manage their shares"
  ON public.collection_shares FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for token lookup
CREATE INDEX idx_collection_shares_token ON public.collection_shares(share_token) WHERE visibility != 'private';

-- Public view function: fetches collection + items via share token (no auth needed)
CREATE OR REPLACE FUNCTION public.get_shared_collection(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_share collection_shares%ROWTYPE;
  v_collection collections%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Find active share
  SELECT * INTO v_share
  FROM collection_shares
  WHERE share_token = p_token
    AND visibility != 'private'
    AND (expires_at IS NULL OR expires_at > now());

  IF v_share.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get collection (must not be deleted)
  SELECT * INTO v_collection
  FROM collections
  WHERE id = v_share.collection_id
    AND deleted_at IS NULL;

  IF v_collection.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Bump view count (fire-and-forget style)
  UPDATE collection_shares
  SET view_count = view_count + 1, last_viewed_at = now()
  WHERE id = v_share.id;

  -- Build response
  v_result := jsonb_build_object(
    'collection', jsonb_build_object(
      'id', v_collection.id,
      'name', v_collection.name,
      'description', v_collection.description,
      'cover_image_url', v_collection.cover_image_url,
      'item_count', v_collection.item_count,
      'created_at', v_collection.created_at
    ),
    'share', jsonb_build_object(
      'visibility', v_share.visibility,
      'allow_download', v_share.allow_download,
      'has_password', v_share.password_hash IS NOT NULL,
      'view_count', v_share.view_count
    ),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ci.id,
        'sort_order', ci.sort_order,
        'notes', ci.notes,
        'added_at', ci.added_at,
        'plant', jsonb_build_object(
          'id', op.id,
          'nickname', op.nickname,
          'scientific_name', op.scientific_name,
          'common_name', op.common_name,
          'photos', op.photos,
          'status', op.status
        )
      ) ORDER BY ci.sort_order, ci.added_at DESC)
      FROM collection_items ci
      JOIN owned_plants op ON op.id = ci.owned_plant_id
      WHERE ci.collection_id = v_collection.id
    ), '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;
