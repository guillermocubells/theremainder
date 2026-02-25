
-- Add admin review columns to auctions
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS change_request_message TEXT;

-- RLS policies for auctions
CREATE POLICY "Admins can manage all auctions"
  ON public.auctions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers can view own auctions"
  ON public.auctions FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Sellers can insert own auctions"
  ON public.auctions FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Sellers can update own draft auctions"
  ON public.auctions FOR UPDATE
  USING (created_by = auth.uid() AND status IN ('draft', 'changes_requested'));
