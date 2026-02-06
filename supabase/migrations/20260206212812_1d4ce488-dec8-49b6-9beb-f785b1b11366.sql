
-- 1. Add sharing control columns to owned_plants
ALTER TABLE public.owned_plants
  ADD COLUMN IF NOT EXISTS visibility_in_shared_lists text NOT NULL DEFAULT 'hidden'
    CHECK (visibility_in_shared_lists IN ('hidden', 'visible')),
  ADD COLUMN IF NOT EXISTS allow_inquiries boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_intent text NOT NULL DEFAULT 'not_open'
    CHECK (availability_intent IN ('not_open', 'for_sale', 'for_trade')),
  ADD COLUMN IF NOT EXISTS inquiry_handling_mode text NOT NULL DEFAULT 'allow'
    CHECK (inquiry_handling_mode IN ('allow', 'muted', 'blocked'));

-- 2. Add global_inquiries_mode to shared_search_lists
ALTER TABLE public.shared_search_lists
  ADD COLUMN IF NOT EXISTS global_inquiries_mode text NOT NULL DEFAULT 'enabled'
    CHECK (global_inquiries_mode IN ('enabled', 'muted', 'disabled'));

-- 3. Create garden_inquiries table
CREATE TABLE public.garden_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_list_id uuid REFERENCES public.shared_search_lists(id) ON DELETE SET NULL,
  owned_plant_id uuid NOT NULL REFERENCES public.owned_plants(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  viewer_identifier text NOT NULL,
  viewer_email text,
  message text NOT NULL,
  offer_type text CHECK (offer_type IN ('buy', 'trade', 'question')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'ignored', 'blocked')),
  owner_reply text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.garden_inquiries ENABLE ROW LEVEL SECURITY;

-- Owner can view their own inquiries
CREATE POLICY "Owners can view own inquiries"
  ON public.garden_inquiries FOR SELECT
  USING (owner_user_id = auth.uid());

-- Owner can update own inquiries (reply, ignore, block)
CREATE POLICY "Owners can update own inquiries"
  ON public.garden_inquiries FOR UPDATE
  USING (owner_user_id = auth.uid());

-- Anyone can insert inquiries (will be done via edge function with service role)
CREATE POLICY "Service role can insert inquiries"
  ON public.garden_inquiries FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_garden_inquiries_owner_status ON public.garden_inquiries(owner_user_id, status, created_at DESC);
CREATE INDEX idx_garden_inquiries_plant ON public.garden_inquiries(owned_plant_id);

-- 4. Create garden_viewer_blocks table
CREATE TABLE public.garden_viewer_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid NOT NULL,
  viewer_identifier text NOT NULL,
  scope text NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'share_link')),
  shared_list_id uuid REFERENCES public.shared_search_lists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.garden_viewer_blocks ENABLE ROW LEVEL SECURITY;

-- Owner can manage their blocks
CREATE POLICY "Owners can manage own blocks"
  ON public.garden_viewer_blocks FOR ALL
  USING (owner_user_id = auth.uid());

-- Service role can read blocks (for inquiry validation)
CREATE POLICY "Anyone can read blocks for validation"
  ON public.garden_viewer_blocks FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX idx_garden_viewer_blocks_owner ON public.garden_viewer_blocks(owner_user_id, viewer_identifier);

-- 5. Add trigger for updated_at on garden_inquiries
CREATE TRIGGER update_garden_inquiries_updated_at
  BEFORE UPDATE ON public.garden_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Index on owned_plants for visibility filtering
CREATE INDEX idx_owned_plants_visibility ON public.owned_plants(user_id, visibility_in_shared_lists) WHERE visibility_in_shared_lists = 'visible';
