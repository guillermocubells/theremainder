
-- Add display_order for lot ordering and seller_notes
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_notes TEXT,
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Public can view scheduled/live auctions  
CREATE POLICY "Anyone can view public auctions"
  ON public.auctions FOR SELECT
  USING (status IN ('scheduled', 'live', 'ended', 'settled'));
