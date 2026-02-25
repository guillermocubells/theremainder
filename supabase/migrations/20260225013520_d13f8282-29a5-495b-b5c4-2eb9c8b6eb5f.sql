
-- Step 1: Add enum values only
ALTER TYPE public.auction_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.auction_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.auction_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.auction_status ADD VALUE IF NOT EXISTS 'changes_requested';
