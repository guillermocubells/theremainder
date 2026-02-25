
-- Trigger function: notify on auction status change (approved, rejected, changes_requested, ended)
CREATE OR REPLACE FUNCTION notify_auction_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  _type text;
  _payload jsonb;
BEGIN
  -- Listing moderation events (seller notifications)
  IF NEW.status = 'approved' AND OLD.status = 'pending_review' THEN
    _type := 'listing_approved';
  ELSIF NEW.status = 'rejected' AND OLD.status IN ('pending_review', 'changes_requested') THEN
    _type := 'listing_rejected';
  ELSIF NEW.status = 'changes_requested' AND OLD.status = 'pending_review' THEN
    _type := 'listing_changes_requested';
  ELSIF NEW.status = 'ended' AND OLD.status = 'active' AND NEW.winner_user_id IS NOT NULL THEN
    -- Auction ended with a winner — enqueue won + lost notifications
    INSERT INTO job_queue (job_type, payload, priority)
    VALUES (
      'send_auction_notification',
      jsonb_build_object(
        'type', 'auction_won',
        'auction_id', NEW.id,
        'data', jsonb_build_object('winning_price', NEW.current_price)
      ),
      5
    );
    INSERT INTO job_queue (job_type, payload, priority)
    VALUES (
      'send_auction_notification',
      jsonb_build_object(
        'type', 'auction_lost',
        'auction_id', NEW.id,
        'data', jsonb_build_object('winning_price', NEW.current_price)
      ),
      5
    );
    RETURN NEW;
  ELSE
    RETURN NEW;
  END IF;

  -- Build payload for moderation events
  _payload := jsonb_build_object(
    'type', _type,
    'auction_id', NEW.id,
    'data', jsonb_build_object(
      'admin_notes', COALESCE(NEW.admin_notes, ''),
      'change_request_message', COALESCE(NEW.change_request_message, ''),
      'starts_at', COALESCE(NEW.starts_at::text, ''),
      'starting_price', NEW.starting_price
    )
  );

  INSERT INTO job_queue (job_type, payload, priority)
  VALUES ('send_auction_notification', _payload, 5);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists then create trigger
DROP TRIGGER IF EXISTS trg_notify_auction_lifecycle ON auctions;
CREATE TRIGGER trg_notify_auction_lifecycle
  AFTER UPDATE ON auctions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_auction_lifecycle();

-- Trigger function: notify outbid users + seller on new bid
CREATE OR REPLACE FUNCTION notify_on_new_bid()
RETURNS TRIGGER AS $$
DECLARE
  _auction record;
  _prev_bidder_id uuid;
BEGIN
  SELECT * INTO _auction FROM auctions WHERE id = NEW.auction_id;

  -- Notify seller of new bid
  INSERT INTO job_queue (job_type, payload, priority)
  VALUES (
    'send_auction_notification',
    jsonb_build_object(
      'type', 'new_bid_seller',
      'auction_id', NEW.auction_id,
      'data', jsonb_build_object(
        'bid_amount', NEW.amount,
        'total_bids', _auction.total_bids
      )
    ),
    3
  );

  -- Find previous highest bidder (now outbid) and notify
  SELECT user_id INTO _prev_bidder_id
  FROM bids
  WHERE auction_id = NEW.auction_id
    AND id != NEW.id
    AND status = 'active'
  ORDER BY amount DESC
  LIMIT 1;

  IF _prev_bidder_id IS NOT NULL AND _prev_bidder_id != NEW.user_id THEN
    INSERT INTO job_queue (job_type, payload, priority)
    VALUES (
      'send_auction_notification',
      jsonb_build_object(
        'type', 'outbid',
        'auction_id', NEW.auction_id,
        'user_ids', jsonb_build_array(_prev_bidder_id),
        'data', jsonb_build_object(
          'current_price', NEW.amount,
          'your_bid', (SELECT amount FROM bids WHERE auction_id = NEW.auction_id AND user_id = _prev_bidder_id AND id != NEW.id ORDER BY amount DESC LIMIT 1)
        )
      ),
      5
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_on_new_bid ON bids;
CREATE TRIGGER trg_notify_on_new_bid
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_bid();
