
-- Reputation ledger: immutable log of all reputation-changing events
CREATE TABLE public.reputation_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_key TEXT NOT NULL,
  delta INTEGER NOT NULL,
  source_entity_type TEXT,          -- 'review', 'comment', 'report', etc.
  source_entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reputation_ledger_user ON public.reputation_ledger (user_id, created_at DESC);
CREATE INDEX idx_reputation_ledger_action ON public.reputation_ledger (action_key);

ALTER TABLE public.reputation_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger"
  ON public.reputation_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Prevent direct inserts from clients; only edge functions (service role) write
CREATE POLICY "Service role inserts ledger"
  ON public.reputation_ledger FOR INSERT
  WITH CHECK (false);

-- Running totals per user
CREATE TABLE public.user_reputation (
  user_id UUID NOT NULL PRIMARY KEY,
  total_score INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'newcomer',
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reputation"
  ON public.user_reputation FOR SELECT
  USING (true);

CREATE POLICY "Service role manages reputation"
  ON public.user_reputation FOR ALL
  USING (false);

-- Badges assigned to users
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_key TEXT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (user_id, badge_key)
);

CREATE INDEX idx_user_badges_user ON public.user_badges (user_id) WHERE revoked_at IS NULL;

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "Service role manages badges"
  ON public.user_badges FOR ALL
  USING (false);

-- Reputation events for UI/notification consumption
CREATE TABLE public.reputation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,       -- 'score_changed', 'badge_awarded', 'badge_revoked'
  payload JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reputation_events_user ON public.reputation_events (user_id, created_at DESC);
CREATE INDEX idx_reputation_events_unread ON public.reputation_events (user_id) WHERE read_at IS NULL;

ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON public.reputation_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own events read"
  ON public.reputation_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role inserts events"
  ON public.reputation_events FOR INSERT
  WITH CHECK (false);

-- Enable realtime on reputation_events for live notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.reputation_events;
