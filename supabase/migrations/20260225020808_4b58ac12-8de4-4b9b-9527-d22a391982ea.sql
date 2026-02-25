
-- Dispute types and statuses
CREATE TYPE public.dispute_type AS ENUM (
  'damaged_item',
  'wrong_item',
  'missing_item',
  'quality_issue',
  'shipping_delay',
  'billing_error',
  'other'
);

CREATE TYPE public.dispute_status AS ENUM (
  'open',
  'under_review',
  'awaiting_evidence',
  'resolved',
  'rejected',
  'escalated'
);

-- Main disputes table
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  auction_id uuid REFERENCES public.auctions(id),
  type dispute_type NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  subject text NOT NULL,
  description text NOT NULL,
  evidence_urls text[] DEFAULT '{}',
  admin_notes text,
  resolution_summary text,
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Timeline events for each dispute
CREATE TABLE public.dispute_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text NOT NULL DEFAULT 'system',
  event_type text NOT NULL,
  message text,
  attachments text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_events ENABLE ROW LEVEL SECURITY;

-- Disputes RLS
CREATE POLICY "Users can view own disputes" ON public.disputes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disputes" ON public.disputes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own open disputes" ON public.disputes
  FOR UPDATE USING (auth.uid() = user_id AND status = 'open');

CREATE POLICY "Admins can manage all disputes" ON public.disputes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Dispute events RLS
CREATE POLICY "Users can view events of own disputes" ON public.dispute_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.disputes d WHERE d.id = dispute_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Users can insert events on own disputes" ON public.dispute_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.disputes d WHERE d.id = dispute_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all dispute events" ON public.dispute_events
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_disputes_user_id ON public.disputes(user_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_dispute_events_dispute_id ON public.dispute_events(dispute_id);

-- Updated_at trigger
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
