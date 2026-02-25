
-- Consent audit log table for full GDPR/LSSI-CE compliance
CREATE TABLE public.consent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  event_type TEXT NOT NULL, -- 'order_checkout', 'cookie_update', 'account_signup', 'marketing_optin', 'marketing_optout'
  consents JSONB NOT NULL DEFAULT '{}'::jsonb, -- snapshot of all consents given
  ip_address TEXT,
  user_agent TEXT,
  order_id UUID REFERENCES public.orders(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent logs
CREATE POLICY "Users can view own consent logs"
  ON public.consent_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own consent logs
CREATE POLICY "Users can insert own consent logs"
  ON public.consent_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role can manage all consent logs
CREATE POLICY "Service role can manage consent logs"
  ON public.consent_logs FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Admins can view all consent logs
CREATE POLICY "Admins can view consent logs"
  ON public.consent_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for user lookups
CREATE INDEX idx_consent_logs_user_id ON public.consent_logs(user_id);
CREATE INDEX idx_consent_logs_event_type ON public.consent_logs(event_type);
CREATE INDEX idx_consent_logs_order_id ON public.consent_logs(order_id);
