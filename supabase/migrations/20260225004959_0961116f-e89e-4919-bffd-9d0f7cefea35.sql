
-- Auction status lifecycle: draft → scheduled → live → ended → settled / cancelled
CREATE TYPE public.auction_status AS ENUM ('draft', 'scheduled', 'live', 'ended', 'settled', 'cancelled');

-- Bid status
CREATE TYPE public.bid_status AS ENUM ('active', 'outbid', 'winning', 'won', 'cancelled');

-- ============================================================
-- AUCTIONS TABLE
-- ============================================================
CREATE TABLE public.auctions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL, -- admin user_id

  -- Product info (independent or linked to catalog)
  plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}'::TEXT[],
  condition TEXT, -- e.g. 'new', 'cutting', 'established'

  -- Pricing
  starting_price NUMERIC NOT NULL DEFAULT 0,
  reserve_price NUMERIC, -- hidden minimum; NULL = no reserve
  current_price NUMERIC NOT NULL DEFAULT 0,
  buy_now_price NUMERIC, -- optional instant-buy (future use)
  currency TEXT NOT NULL DEFAULT 'EUR',
  bid_increment NUMERIC NOT NULL DEFAULT 1, -- minimum raise

  -- Schedule
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,

  -- State
  status public.auction_status NOT NULL DEFAULT 'draft',
  winner_user_id UUID,
  winning_bid_id UUID,
  total_bids INTEGER NOT NULL DEFAULT 0,
  reserve_met BOOLEAN NOT NULL DEFAULT false,

  -- Meta
  slug TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT auctions_slug_unique UNIQUE (slug),
  CONSTRAINT auctions_valid_prices CHECK (starting_price >= 0 AND bid_increment > 0)
);

-- ============================================================
-- BIDS TABLE
-- ============================================================
CREATE TABLE public.bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status public.bid_status NOT NULL DEFAULT 'active',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT bids_positive_amount CHECK (amount > 0)
);

-- Performance indexes for bids
CREATE INDEX idx_bids_auction_id ON public.bids (auction_id);
CREATE INDEX idx_bids_auction_amount ON public.bids (auction_id, amount DESC);
CREATE INDEX idx_bids_user_id ON public.bids (user_id);
CREATE INDEX idx_bids_auction_created ON public.bids (auction_id, created_at DESC);

-- Indexes for auctions
CREATE INDEX idx_auctions_status ON public.auctions (status);
CREATE INDEX idx_auctions_ends_at ON public.auctions (ends_at) WHERE status = 'live';
CREATE INDEX idx_auctions_slug ON public.auctions (slug);
CREATE INDEX idx_auctions_plant_id ON public.auctions (plant_id) WHERE plant_id IS NOT NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Auctions: admins manage, everyone sees non-draft
CREATE POLICY "Admins can manage auctions"
  ON public.auctions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active auctions"
  ON public.auctions FOR SELECT
  USING (status NOT IN ('draft'));

-- Bids: users manage own bids, admins see all, anyone sees bids on public auctions
CREATE POLICY "Admins can manage all bids"
  ON public.bids FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own bids"
  ON public.bids FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bids"
  ON public.bids FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view bids on public auctions"
  ON public.bids FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.auctions a
    WHERE a.id = auction_id AND a.status NOT IN ('draft')
  ));

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
