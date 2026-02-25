
-- Add auction notification preferences columns to notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notify_outbid BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_auction_starting BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_auction_ending BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_auction_won BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_auction_lost BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_new_bid_seller BOOLEAN NOT NULL DEFAULT true;

-- Push subscriptions table for Web Push API
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Auction notifications log table
CREATE TABLE public.auction_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auctions(id),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'outbid', 'auction_starting', 'auction_ending', 'auction_won', 'auction_lost', 'new_bid_seller'
  channel TEXT NOT NULL DEFAULT 'email', -- 'email', 'push', 'both'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.auction_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own auction notifications"
  ON public.auction_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage auction notifications"
  ON public.auction_notifications FOR ALL
  USING (auth.role() = 'service_role'::text);

CREATE POLICY "Admins can view all auction notifications"
  ON public.auction_notifications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_auction_notifications_user ON public.auction_notifications(user_id);
CREATE INDEX idx_auction_notifications_auction ON public.auction_notifications(auction_id);
CREATE INDEX idx_auction_notifications_type ON public.auction_notifications(type);
