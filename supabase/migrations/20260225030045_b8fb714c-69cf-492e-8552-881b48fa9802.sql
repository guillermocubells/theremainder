
-- =====================================================
-- Audit trigger: log every auction status transition
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_auction_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (
      action,
      entity_type,
      entity_id,
      actor_id,
      actor_role,
      old_data,
      new_data,
      metadata,
      created_at
    ) VALUES (
      'auction_status_change',
      'auction',
      NEW.id,
      COALESCE(NEW.reviewed_by, auth.uid()),
      CASE
        WHEN NEW.reviewed_by IS NOT NULL AND has_role(NEW.reviewed_by, 'admin') THEN 'admin'
        WHEN auth.uid() IS NOT NULL THEN 'user'
        ELSE 'system'
      END,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object(
        'status', NEW.status,
        'admin_notes', NEW.admin_notes,
        'change_request_message', NEW.change_request_message
      ),
      jsonb_build_object(
        'auction_title', NEW.title,
        'seller_user_id', NEW.seller_user_id,
        'reviewed_at', NEW.reviewed_at
      ),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_auction_status ON auctions;
CREATE TRIGGER trg_audit_auction_status
  AFTER UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION audit_auction_status_change();

-- Also audit auction creation (submission)
CREATE OR REPLACE FUNCTION public.audit_auction_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    actor_id,
    actor_role,
    new_data,
    metadata,
    created_at
  ) VALUES (
    'auction_submitted',
    'auction',
    NEW.id,
    COALESCE(NEW.seller_user_id, NEW.created_by),
    'user',
    jsonb_build_object('status', NEW.status, 'title', NEW.title, 'starting_price', NEW.starting_price),
    jsonb_build_object('seller_user_id', NEW.seller_user_id, 'has_provenance_docs', (NEW.provenance_documents IS NOT NULL AND array_length(NEW.provenance_documents, 1) > 0)),
    now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_auction_submission ON auctions;
CREATE TRIGGER trg_audit_auction_submission
  AFTER INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION audit_auction_submission();
