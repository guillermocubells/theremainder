-- Create enums for wishlist
CREATE TYPE wishlist_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE wishlist_status AS ENUM ('wishlist', 'looking', 'acquired');
CREATE TYPE wishlist_source AS ENUM ('frondaprima', 'any', 'specific');
CREATE TYPE notification_type AS ENUM ('available', 'price_drop', 'similar');
CREATE TYPE email_frequency AS ENUM ('instant', 'daily', 'weekly');

-- Wishlist items table
CREATE TABLE public.wishlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  scientific_name TEXT,
  variety_notes TEXT,
  priority wishlist_priority NOT NULL DEFAULT 'medium',
  price_min NUMERIC,
  price_max NUMERIC,
  source_preference wishlist_source NOT NULL DEFAULT 'any',
  provider_name TEXT,
  provider_url TEXT,
  image_url TEXT,
  notes TEXT,
  status wishlist_status NOT NULL DEFAULT 'wishlist',
  notify_availability BOOLEAN NOT NULL DEFAULT true,
  notify_price_drop BOOLEAN NOT NULL DEFAULT false,
  catalog_product_id UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  acquired_owned_plant_id UUID REFERENCES public.owned_plants(id) ON DELETE SET NULL,
  acquired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Wishlist notifications table
CREATE TABLE public.wishlist_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wishlist_item_id UUID REFERENCES public.wishlist_items(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  email_frequency email_frequency NOT NULL DEFAULT 'weekly',
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_own_wishlist_item(wi_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wi_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_own_notification(n_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n_user_id = auth.uid()
$$;

-- RLS Policies for wishlist_items
CREATE POLICY "Users can view own wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (is_own_wishlist_item(user_id));

CREATE POLICY "Users can insert own wishlist items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (is_own_wishlist_item(user_id));

CREATE POLICY "Users can update own wishlist items"
  ON public.wishlist_items FOR UPDATE
  USING (is_own_wishlist_item(user_id));

CREATE POLICY "Users can delete own wishlist items"
  ON public.wishlist_items FOR DELETE
  USING (is_own_wishlist_item(user_id));

-- RLS Policies for wishlist_notifications
CREATE POLICY "Users can view own notifications"
  ON public.wishlist_notifications FOR SELECT
  USING (is_own_notification(user_id));

CREATE POLICY "Users can insert own notifications"
  ON public.wishlist_notifications FOR INSERT
  WITH CHECK (is_own_notification(user_id));

CREATE POLICY "Users can update own notifications"
  ON public.wishlist_notifications FOR UPDATE
  USING (is_own_notification(user_id));

CREATE POLICY "Users can delete own notifications"
  ON public.wishlist_notifications FOR DELETE
  USING (is_own_notification(user_id));

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  USING (is_own_notification(user_id));

CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (is_own_notification(user_id));

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (is_own_notification(user_id));

-- Triggers for updated_at
CREATE TRIGGER update_wishlist_items_updated_at
  BEFORE UPDATE ON public.wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-match wishlist items when order is placed
CREATE OR REPLACE FUNCTION public.match_wishlist_to_order(p_order_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_wishlist RECORD;
  v_owned_plant RECORD;
  v_count INT := 0;
BEGIN
  -- Loop through order items
  FOR v_item IN 
    SELECT oi.product_id, oi.product_name
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    -- Find matching wishlist items by catalog_product_id or name
    FOR v_wishlist IN
      SELECT wi.id
      FROM wishlist_items wi
      JOIN plants p ON (
        wi.catalog_product_id = p.id 
        OR LOWER(wi.name) = LOWER(p.name)
        OR LOWER(wi.name) = LOWER(p.scientific_name)
      )
      WHERE wi.user_id = p_user_id
        AND wi.status != 'acquired'
        AND (p.slug = v_item.product_id OR p.id::text = v_item.product_id)
      LIMIT 1
    LOOP
      -- Find the owned plant created from this order
      SELECT op.id INTO v_owned_plant
      FROM owned_plants op
      WHERE op.order_id = p_order_id
        AND op.user_id = p_user_id
      LIMIT 1;
      
      -- Update wishlist item to acquired
      UPDATE wishlist_items
      SET status = 'acquired',
          acquired_at = now(),
          acquired_owned_plant_id = v_owned_plant.id
      WHERE id = v_wishlist.id;
      
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$;