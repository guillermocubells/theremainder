-- Create table for stock notifications
CREATE TABLE public.stock_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, plant_id)
);

-- Enable RLS
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_own_stock_notification(n_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n_user_id = auth.uid()
$$;

-- RLS Policies
CREATE POLICY "Users can view own stock notifications"
  ON public.stock_notifications
  FOR SELECT
  USING (is_own_stock_notification(user_id));

CREATE POLICY "Users can insert own stock notifications"
  ON public.stock_notifications
  FOR INSERT
  WITH CHECK (is_own_stock_notification(user_id));

CREATE POLICY "Users can delete own stock notifications"
  ON public.stock_notifications
  FOR DELETE
  USING (is_own_stock_notification(user_id));

-- Index for efficient lookups
CREATE INDEX idx_stock_notifications_plant_id ON public.stock_notifications(plant_id);
CREATE INDEX idx_stock_notifications_user_id ON public.stock_notifications(user_id);