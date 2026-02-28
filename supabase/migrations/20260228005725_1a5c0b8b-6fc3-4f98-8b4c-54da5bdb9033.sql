
-- Reputation action rules
CREATE TABLE public.reputation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  delta INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reputation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reputation rules are publicly readable"
  ON public.reputation_rules FOR SELECT
  USING (true);

-- Badge thresholds
CREATE TABLE public.badge_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  min_score INTEGER NOT NULL,
  icon TEXT,
  color TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badge thresholds are publicly readable"
  ON public.badge_thresholds FOR SELECT
  USING (true);
