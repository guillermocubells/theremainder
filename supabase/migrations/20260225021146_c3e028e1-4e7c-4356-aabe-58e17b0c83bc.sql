
-- Immutable audit log table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_role text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  checksum text NOT NULL DEFAULT ''
);

-- Generate checksum for tamper resistance (hash of previous + current row data)
CREATE OR REPLACE FUNCTION public.audit_log_checksum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prev_checksum TEXT;
  v_data TEXT;
BEGIN
  SELECT checksum INTO v_prev_checksum
  FROM audit_logs
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  v_data := COALESCE(NEW.actor_id::text, '') || '|' ||
            NEW.action || '|' ||
            NEW.entity_type || '|' ||
            COALESCE(NEW.entity_id::text, '') || '|' ||
            COALESCE(NEW.new_data::text, '') || '|' ||
            to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI:SS.US') || '|' ||
            COALESCE(v_prev_checksum, 'GENESIS');

  NEW.checksum := encode(sha256(v_data::bytea), 'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_log_checksum
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_checksum();

-- Prevent updates and deletes (tamper-resistant)
CREATE OR REPLACE FUNCTION public.deny_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$;

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.deny_audit_mutation();

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.deny_audit_mutation();

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Helper function to insert audit logs from triggers
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_id uuid,
  p_actor_role text,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_data, new_data, metadata)
  VALUES (p_actor_id, p_actor_role, p_action, p_entity_type, p_entity_id, p_old_data, p_new_data, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Trigger: Log bid placements
CREATE OR REPLACE FUNCTION public.audit_bid_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM log_audit_event(
    NEW.user_id, 'user', 'bid_placed', 'bid', NEW.id,
    NULL,
    jsonb_build_object('auction_id', NEW.auction_id, 'amount', NEW.amount, 'status', NEW.status),
    jsonb_build_object('ip_address', NEW.ip_address)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_bid_insert
  AFTER INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.audit_bid_insert();

-- Trigger: Log auction status changes (admin approvals, schedule changes)
CREATE OR REPLACE FUNCTION public.audit_auction_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     OR OLD.starts_at IS DISTINCT FROM NEW.starts_at
     OR OLD.ends_at IS DISTINCT FROM NEW.ends_at
     OR OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by
     OR OLD.winner_user_id IS DISTINCT FROM NEW.winner_user_id THEN
    PERFORM log_audit_event(
      auth.uid(), CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'admin' ELSE 'system' END,
      CASE
        WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status::text = 'approved' THEN 'auction_approved'
        WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status::text = 'closed' THEN 'auction_closed'
        WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'auction_status_changed'
        WHEN OLD.starts_at IS DISTINCT FROM NEW.starts_at OR OLD.ends_at IS DISTINCT FROM NEW.ends_at THEN 'auction_schedule_changed'
        ELSE 'auction_updated'
      END,
      'auction', NEW.id,
      jsonb_build_object('status', OLD.status, 'starts_at', OLD.starts_at, 'ends_at', OLD.ends_at),
      jsonb_build_object('status', NEW.status, 'starts_at', NEW.starts_at, 'ends_at', NEW.ends_at,
                         'winner_user_id', NEW.winner_user_id, 'reviewed_by', NEW.reviewed_by)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_auction_update
  AFTER UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.audit_auction_update();

-- Trigger: Log settlement creation (payouts)
CREATE OR REPLACE FUNCTION public.audit_settlement_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM log_audit_event(
    NULL, 'system', 'settlement_created', 'auction_settlement', NEW.id,
    NULL,
    jsonb_build_object(
      'auction_id', NEW.auction_id,
      'buyer_user_id', NEW.buyer_user_id,
      'seller_user_id', NEW.seller_user_id,
      'hammer_price', NEW.hammer_price,
      'platform_fee_amount', NEW.platform_fee_amount,
      'seller_payout_amount', NEW.seller_payout_amount,
      'status', NEW.status
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_settlement_insert
  AFTER INSERT ON public.auction_settlements
  FOR EACH ROW EXECUTE FUNCTION public.audit_settlement_insert();

-- Trigger: Log settlement status changes (payout completion)
CREATE OR REPLACE FUNCTION public.audit_settlement_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_audit_event(
      auth.uid(), 'system', 'settlement_status_changed', 'auction_settlement', NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'stripe_transfer_id', NEW.stripe_transfer_id, 'settled_at', NEW.settled_at)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_settlement_update
  AFTER UPDATE ON public.auction_settlements
  FOR EACH ROW EXECUTE FUNCTION public.audit_settlement_update();

-- Trigger: Log order status changes
CREATE OR REPLACE FUNCTION public.audit_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_audit_event(
      auth.uid(), CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'admin' ELSE 'system' END,
      'order_status_changed', 'order', NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'refund_amount', NEW.refund_amount)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_order_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_order_update();

-- Trigger: Log dispute status changes
CREATE OR REPLACE FUNCTION public.audit_dispute_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_audit_event(
      auth.uid(), CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'admin' ELSE 'user' END,
      'dispute_status_changed', 'dispute', NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'resolution_summary', NEW.resolution_summary)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_dispute_update
  AFTER UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.audit_dispute_update();
