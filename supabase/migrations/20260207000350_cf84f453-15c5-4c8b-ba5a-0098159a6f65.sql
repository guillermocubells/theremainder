-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function that fires when plants.stock_qty changes from 0 to >0
CREATE OR REPLACE FUNCTION public.notify_stock_restock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_has_subscribers BOOLEAN;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_payload JSONB;
BEGIN
  -- Only fire when stock changes from 0 to >0
  IF OLD.stock_qty = 0 AND NEW.stock_qty > 0 THEN
    -- Quick check: are there any pending subscribers?
    SELECT EXISTS(
      SELECT 1 FROM stock_notifications
      WHERE plant_id = NEW.id AND notified_at IS NULL
      LIMIT 1
    ) INTO v_has_subscribers;
    
    IF NOT v_has_subscribers THEN
      RETURN NEW;
    END IF;
    
    -- Build payload
    v_payload := jsonb_build_object(
      'plant_id', NEW.id,
      'plant_name', NEW.name,
      'plant_slug', NEW.slug,
      'new_stock_qty', NEW.stock_qty,
      'price', NEW.price,
      'scientific_name', NEW.scientific_name,
      'thumbnail_url', COALESCE(NEW.thumbnail_url, (NEW.images)[1])
    );
    
    -- Get Supabase URL from current settings
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- If settings not available, use env-based approach
    IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
      v_supabase_url := 'https://qsjnjitjbegtrxgwqygg.supabase.co';
    END IF;
    
    -- Use pg_net to make async HTTP call to edge function
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/notify-restock',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_service_role_key, current_setting('supabase.service_role_key', true))
      ),
      body := v_payload
    );
    
    RAISE LOG '[notify_stock_restock] Triggered restock notification for plant: % (%)', NEW.name, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on plants table
DROP TRIGGER IF EXISTS trigger_notify_stock_restock ON public.plants;
CREATE TRIGGER trigger_notify_stock_restock
  AFTER UPDATE OF stock_qty ON public.plants
  FOR EACH ROW
  WHEN (OLD.stock_qty = 0 AND NEW.stock_qty > 0)
  EXECUTE FUNCTION public.notify_stock_restock();

-- Also allow service_role to update stock_notifications (mark as notified)
-- The edge function uses service_role key so this is already handled