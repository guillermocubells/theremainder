
ALTER TYPE public.dispute_type ADD VALUE IF NOT EXISTS 'auction_non_delivery';
ALTER TYPE public.dispute_type ADD VALUE IF NOT EXISTS 'auction_misrepresentation';
ALTER TYPE public.dispute_type ADD VALUE IF NOT EXISTS 'auction_payment';
