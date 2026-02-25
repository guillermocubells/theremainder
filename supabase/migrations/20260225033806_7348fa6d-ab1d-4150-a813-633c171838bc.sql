
-- ============================================================
-- PRD Alignment: Auction External Sellers Full Schema
-- ============================================================

-- 1. Augment seller_profiles with missing PRD fields
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS email varchar(320),
  ADD COLUMN IF NOT EXISTS phone varchar(30),
  ADD COLUMN IF NOT EXISTS country_code char(2) DEFAULT 'ES',
  ADD COLUMN IF NOT EXISTS vat_number varchar(32),
  ADD COLUMN IF NOT EXISTS preferred_payout_method varchar(30) DEFAULT 'stripe_connect',
  ADD COLUMN IF NOT EXISTS payout_account_ref varchar(120),
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- 2. Augment auctions with missing PRD fields
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(5,2) NOT NULL DEFAULT 6.00,
  ADD COLUMN IF NOT EXISTS location_country char(2) DEFAULT 'ES',
  ADD COLUMN IF NOT EXISTS terms_url varchar(500);

-- 3. seller_addresses
CREATE TABLE IF NOT EXISTS public.seller_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL DEFAULT 'billing',
  line1 varchar(200) NOT NULL,
  line2 varchar(200),
  city varchar(100) NOT NULL,
  region varchar(100),
  postal_code varchar(20) NOT NULL,
  country_code char(2) NOT NULL DEFAULT 'ES',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seller_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage own addresses"
  ON public.seller_addresses FOR ALL
  USING (EXISTS (SELECT 1 FROM seller_profiles sp WHERE sp.id = seller_id AND sp.user_id = auth.uid()));
CREATE POLICY "Admins can manage all seller addresses"
  ON public.seller_addresses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. item_submissions (lot submission workflow)
CREATE TABLE IF NOT EXISTS public.item_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id),
  title varchar(255) NOT NULL,
  description text,
  species_scientific varchar(255),
  common_name varchar(255),
  category varchar(100),
  condition_grade varchar(20),
  provenance_text text,
  defects_text text,
  hardiness_zone varchar(10),
  humidity_tolerance varchar(30),
  reserve_price_cents integer DEFAULT 0,
  start_price_cents integer NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'EUR',
  status varchar(20) NOT NULL DEFAULT 'draft',
  compliance_attestation_id uuid,
  prohibited_check_status varchar(20) DEFAULT 'pending',
  phytosanitary_required boolean DEFAULT false,
  location_country varchar(2) DEFAULT 'ES',
  location_region varchar(100),
  weight_kg numeric(10,3),
  dimensions_text varchar(255),
  shipping_eu_only boolean DEFAULT true,
  excluded_countries text,
  shipping_cost_cents integer DEFAULT 0,
  shipping_tiers text,
  handling_time varchar(50),
  duration_hours integer DEFAULT 48,
  tags text[],
  approved_by uuid,
  approved_at timestamptz,
  approved_snapshot jsonb,
  rejection_reason text,
  change_request_message text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.item_submissions ENABLE ROW LEVEL SECURITY;

-- Status validation trigger (not CHECK because we use triggers per guidelines)
CREATE OR REPLACE FUNCTION public.validate_item_submission_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('draft','submitted','in_review','changes_requested','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid item_submission status: %', NEW.status;
  END IF;
  -- Reserve must be >= start price
  IF NEW.reserve_price_cents IS NOT NULL AND NEW.reserve_price_cents > 0
     AND NEW.reserve_price_cents < NEW.start_price_cents THEN
    RAISE EXCEPTION 'Reserve price must be >= start price';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_item_submission ON public.item_submissions;
CREATE TRIGGER trg_validate_item_submission
  BEFORE INSERT OR UPDATE ON public.item_submissions
  FOR EACH ROW EXECUTE FUNCTION public.validate_item_submission_status();

CREATE POLICY "Sellers can manage own submissions"
  ON public.item_submissions FOR ALL
  USING (EXISTS (SELECT 1 FROM seller_profiles sp WHERE sp.id = seller_id AND sp.user_id = auth.uid()));
CREATE POLICY "Admins can manage all submissions"
  ON public.item_submissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. item_media
CREATE TABLE IF NOT EXISTS public.item_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.item_submissions(id) ON DELETE CASCADE,
  url text NOT NULL,
  media_type varchar(20) NOT NULL DEFAULT 'image',
  alt_text varchar(200),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.item_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage own item media"
  ON public.item_media FOR ALL
  USING (EXISTS (
    SELECT 1 FROM item_submissions s
    JOIN seller_profiles sp ON sp.id = s.seller_id
    WHERE s.id = item_id AND sp.user_id = auth.uid()
  ));
CREATE POLICY "Admins can manage all item media"
  ON public.item_media FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view media for approved items"
  ON public.item_media FOR SELECT
  USING (EXISTS (SELECT 1 FROM item_submissions s WHERE s.id = item_id AND s.status = 'approved'));

-- 6. auction_lots (links approved submissions to auctions)
CREATE TABLE IF NOT EXISTS public.auction_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id),
  item_id uuid NOT NULL REFERENCES public.item_submissions(id),
  lot_number integer NOT NULL,
  starting_bid_cents integer NOT NULL DEFAULT 0,
  buy_now_cents integer,
  currency varchar(3) NOT NULL DEFAULT 'EUR',
  increment_rule varchar(20) DEFAULT 'default',
  reserve_met boolean NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'pending',
  winning_bid_id uuid,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(auction_id, lot_number)
);
ALTER TABLE public.auction_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view auction lots"
  ON public.auction_lots FOR SELECT USING (true);
CREATE POLICY "Admins can manage auction lots"
  ON public.auction_lots FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. bid_increment_rules (per-auction tiered increments)
CREATE TABLE IF NOT EXISTS public.bid_increment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  min_amount_cents integer NOT NULL DEFAULT 0,
  max_amount_cents integer,
  increment_cents integer NOT NULL DEFAULT 100
);
ALTER TABLE public.bid_increment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view bid increment rules"
  ON public.bid_increment_rules FOR SELECT USING (true);
CREATE POLICY "Admins can manage bid increment rules"
  ON public.bid_increment_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. fee_rules (configurable platform fee with audit)
CREATE TABLE IF NOT EXISTS public.fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope varchar(20) NOT NULL DEFAULT 'global',
  percent numeric(5,2) NOT NULL DEFAULT 6.00,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fee_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fee rules"
  ON public.fee_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view active fee rules"
  ON public.fee_rules FOR SELECT USING (active = true);

-- Insert default 6% rule
INSERT INTO public.fee_rules (scope, percent, active) VALUES ('global', 6.00, true);

-- 9. payouts (seller disbursement tracking)
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id),
  lot_id uuid, -- nullable: can reference auction_lots or auctions
  auction_id uuid REFERENCES public.auctions(id),
  payment_id uuid,
  currency varchar(3) NOT NULL DEFAULT 'EUR',
  gross_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  processing_fee_cents integer NOT NULL DEFAULT 0,
  taxes_withheld_cents integer NOT NULL DEFAULT 0,
  net_cents integer NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'pending',
  stripe_transfer_id varchar(255),
  reference varchar(100),
  scheduled_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own payouts"
  ON public.payouts FOR SELECT
  USING (EXISTS (SELECT 1 FROM seller_profiles sp WHERE sp.id = seller_id AND sp.user_id = auth.uid()));
CREATE POLICY "Admins can manage all payouts"
  ON public.payouts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Payout validation trigger
CREATE OR REPLACE FUNCTION public.validate_payout()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending','scheduled','processing','paid','failed','cancelled') THEN
    RAISE EXCEPTION 'Invalid payout status: %', NEW.status;
  END IF;
  IF NEW.gross_cents < 0 OR NEW.net_cents < 0 OR NEW.platform_fee_cents < 0 THEN
    RAISE EXCEPTION 'Payout amounts must be non-negative';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_payout ON public.payouts;
CREATE TRIGGER trg_validate_payout
  BEFORE INSERT OR UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.validate_payout();

-- 10. compliance_logs (KYC, fee overrides, approvals)
CREATE TABLE IF NOT EXISTS public.compliance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(30) NOT NULL,
  entity_id uuid NOT NULL,
  action varchar(50) NOT NULL,
  details text,
  old_value text,
  new_value text,
  created_by uuid,
  ip_address varchar(45),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage compliance logs"
  ON public.compliance_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can insert compliance logs"
  ON public.compliance_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role'::text);

-- 11. compliance_attestations (seller legal checkboxes per submission)
CREATE TABLE IF NOT EXISTS public.compliance_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id),
  item_id uuid REFERENCES public.item_submissions(id),
  owns_item boolean NOT NULL DEFAULT false,
  not_prohibited boolean NOT NULL DEFAULT false,
  export_compliant boolean NOT NULL DEFAULT false,
  phytosanitary_required boolean NOT NULL DEFAULT false,
  over_18 boolean NOT NULL DEFAULT false,
  accepts_platform_fee boolean NOT NULL DEFAULT false,
  gdpr_consent boolean NOT NULL DEFAULT false,
  spain_auction_rules boolean NOT NULL DEFAULT false,
  signed_ip varchar(45),
  signed_user_agent text,
  version varchar(20) NOT NULL DEFAULT '1.0',
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.compliance_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage own attestations"
  ON public.compliance_attestations FOR ALL
  USING (EXISTS (SELECT 1 FROM seller_profiles sp WHERE sp.id = seller_id AND sp.user_id = auth.uid()));
CREATE POLICY "Admins can view all attestations"
  ON public.compliance_attestations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 12. prohibited_species
CREATE TABLE IF NOT EXISTS public.prohibited_species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scientific_name varchar(255) NOT NULL,
  common_name varchar(255),
  region varchar(50) DEFAULT 'EU',
  status varchar(20) NOT NULL DEFAULT 'prohibited',
  notes text,
  effective_from timestamptz DEFAULT now(),
  effective_to timestamptz
);
ALTER TABLE public.prohibited_species ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prohibited species"
  ON public.prohibited_species FOR SELECT USING (true);
CREATE POLICY "Admins can manage prohibited species"
  ON public.prohibited_species FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 13. seller_verifications (KYC check audit trail)
CREATE TABLE IF NOT EXISTS public.seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id),
  provider varchar(50) NOT NULL DEFAULT 'stripe',
  check_type varchar(50) NOT NULL DEFAULT 'identity',
  status varchar(50) NOT NULL DEFAULT 'pending',
  reference varchar(255),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own verifications"
  ON public.seller_verifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM seller_profiles sp WHERE sp.id = seller_id AND sp.user_id = auth.uid()));
CREATE POLICY "Admins can manage verifications"
  ON public.seller_verifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 14. shipping_details (auction lot shipping tracking)
CREATE TABLE IF NOT EXISTS public.shipping_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES public.auctions(id),
  lot_id uuid,
  buyer_user_id uuid NOT NULL,
  address_line1 varchar(255) NOT NULL,
  address_line2 varchar(255),
  city varchar(100) NOT NULL,
  region varchar(100),
  postal_code varchar(20) NOT NULL,
  country varchar(2) NOT NULL DEFAULT 'ES',
  shipping_cost_cents integer NOT NULL DEFAULT 0,
  carrier varchar(50),
  tracking_number varchar(100),
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own shipping"
  ON public.shipping_details FOR SELECT
  USING (buyer_user_id = auth.uid());
CREATE POLICY "Admins can manage all shipping"
  ON public.shipping_details FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Sellers can view shipping for own auctions"
  ON public.shipping_details FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM auctions a
    JOIN seller_profiles sp ON sp.user_id = a.seller_user_id
    WHERE a.id = auction_id AND sp.user_id = auth.uid()
  ));

-- 15. Performance indexes per PRD
CREATE INDEX IF NOT EXISTS idx_item_submissions_seller_status ON public.item_submissions(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_item_submissions_status ON public.item_submissions(status);
CREATE INDEX IF NOT EXISTS idx_item_media_item ON public.item_media(item_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_auction_lots_auction_status ON public.auction_lots(auction_id, status);
CREATE INDEX IF NOT EXISTS idx_bid_increment_rules_auction ON public.bid_increment_rules(auction_id);
CREATE INDEX IF NOT EXISTS idx_payouts_seller_status ON public.payouts(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_auction ON public.payouts(auction_id);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_entity ON public.compliance_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_shipping_details_auction ON public.shipping_details(auction_id);
CREATE INDEX IF NOT EXISTS idx_shipping_details_buyer ON public.shipping_details(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_seller_addresses_seller ON public.seller_addresses(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_seller ON public.seller_verifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_prohibited_species_name ON public.prohibited_species(scientific_name);

-- 16. Audit trigger for item_submissions status changes
CREATE OR REPLACE FUNCTION public.audit_item_submission_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO compliance_logs (entity_type, entity_id, action, old_value, new_value, created_by)
    VALUES ('item_submission', NEW.id, 'status_changed', OLD.status, NEW.status, 
      CASE WHEN NEW.approved_by IS NOT NULL THEN NEW.approved_by ELSE NULL END);
    
    -- Snapshot on approval
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
      UPDATE item_submissions SET approved_snapshot = to_jsonb(NEW.*) WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_item_submission ON public.item_submissions;
CREATE TRIGGER trg_audit_item_submission
  AFTER UPDATE ON public.item_submissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_item_submission_change();

-- 17. Audit trigger for fee_rules changes
CREATE OR REPLACE FUNCTION public.audit_fee_rule_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO compliance_logs (entity_type, entity_id, action, old_value, new_value, created_by)
  VALUES (
    'fee_rule', COALESCE(NEW.id, OLD.id),
    CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END,
    CASE WHEN TG_OP != 'INSERT' THEN OLD.percent::text END,
    CASE WHEN TG_OP != 'DELETE' THEN NEW.percent::text END,
    COALESCE(NEW.created_by, OLD.created_by)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_fee_rule ON public.fee_rules;
CREATE TRIGGER trg_audit_fee_rule
  AFTER INSERT OR UPDATE OR DELETE ON public.fee_rules
  FOR EACH ROW EXECUTE FUNCTION public.audit_fee_rule_change();

-- 18. Audit trigger for payouts
CREATE OR REPLACE FUNCTION public.audit_payout_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO compliance_logs (entity_type, entity_id, action, old_value, new_value)
  VALUES (
    'payout', NEW.id,
    CASE TG_OP WHEN 'INSERT' THEN 'created' ELSE 'status_changed' END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END,
    NEW.status
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_payout ON public.payouts;
CREATE TRIGGER trg_audit_payout
  AFTER INSERT OR UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.audit_payout_change();
