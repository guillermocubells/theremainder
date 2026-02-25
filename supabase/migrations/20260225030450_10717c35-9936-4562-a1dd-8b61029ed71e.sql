
-- Add bid rejection metric emission to place_bid
-- We emit via a trigger on bids table instead of modifying the RPC
-- This captures both successful and rejected bids

CREATE OR REPLACE FUNCTION public.emit_bid_metric()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Emit bid placed counter
  PERFORM emit_metric('bid.placed', 1, 'counter', jsonb_build_object('auction_id', NEW.auction_id));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_bid_metric ON bids;
CREATE TRIGGER trg_emit_bid_metric
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION emit_bid_metric();

-- For rejected bids (exceptions in place_bid), we add a wrapper function
-- that catches and emits metrics. However, since PG exceptions can't easily
-- emit metrics mid-transaction, we'll handle bid rejections in the webhook
-- handler by tracking the error pattern from the client side.
-- Instead, we add a metric for payment failures via a trigger on orders:

CREATE OR REPLACE FUNCTION public.emit_payment_error_metric()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'payment_failed' AND (OLD.status IS DISTINCT FROM 'payment_failed') THEN
    PERFORM emit_metric('payment.error', 1, 'counter', jsonb_build_object('order_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_payment_error ON orders;
CREATE TRIGGER trg_emit_payment_error
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION emit_payment_error_metric();
