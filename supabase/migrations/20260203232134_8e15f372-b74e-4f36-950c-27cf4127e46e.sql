-- =============================================
-- REFERRAL PROGRAM SCHEMA (Fixed v2)
-- =============================================

-- 1. Settings table for configurable parameters
CREATE TABLE public.referral_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.referral_settings (key, value, description) VALUES
  ('REWARD_PERCENTAGE', '5'::jsonb, 'Percentage of product subtotal as reward'),
  ('CAP_EUR', '100'::jsonb, 'Maximum reward per transaction in EUR'),
  ('REWARD_PENDING_DAYS', '7'::jsonb, 'Days before pending reward becomes available'),
  ('MAX_WALLET_PERCENT', '50'::jsonb, 'Maximum percentage of order payable with wallet');

-- 2. Referral codes table (one per user)
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN := TRUE;
BEGIN
  WHILE code_exists LOOP
    -- Format: FP-XXXX (4 alphanumeric characters)
    new_code := 'FP-' || upper(substring(md5(random()::text) from 1 for 4));
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = new_code) INTO code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION create_referral_code_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.user_id, generate_referral_code())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created_create_referral_code
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION create_referral_code_for_user();

-- 3. Wallets table (one per user)
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  available_balance NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger to create wallet on profile creation
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created_create_wallet
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION create_wallet_for_user();

-- 4. Wallet transactions table
CREATE TYPE wallet_transaction_type AS ENUM ('credit', 'debit', 'reversal');
CREATE TYPE wallet_transaction_source AS ENUM ('referral_reward', 'order_discount', 'admin_adjustment', 'reward_matured');

CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type wallet_transaction_type NOT NULL,
  source wallet_transaction_source NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Referral rewards table
CREATE TYPE referral_reward_status AS ENUM ('pending', 'available', 'used', 'reversed', 'expired');

CREATE TABLE public.referral_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status referral_reward_status NOT NULL DEFAULT 'pending',
  product_subtotal NUMERIC(10, 2) NOT NULL,
  reward_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5,
  reward_amount NUMERIC(10, 2) NOT NULL,
  cap_applied BOOLEAN NOT NULL DEFAULT FALSE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_confirmed_at TIMESTAMP WITH TIME ZONE,
  matures_at TIMESTAMP WITH TIME ZONE,
  matured_at TIMESTAMP WITH TIME ZONE,
  reversed_at TIMESTAMP WITH TIME ZONE,
  reversal_reason TEXT,
  wallet_transaction_id UUID REFERENCES public.wallet_transactions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Add referral tracking fields to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS referrer_user_id UUID,
  ADD COLUMN IF NOT EXISTS referral_code_used TEXT,
  ADD COLUMN IF NOT EXISTS wallet_amount_used NUMERIC(10, 2) DEFAULT 0;

-- 7. Add referral tracking fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS referral_code_used TEXT;

-- 8. Indexes for performance
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_referral_rewards_referrer_user_id ON public.referral_rewards(referrer_user_id);
CREATE INDEX idx_referral_rewards_referred_user_id ON public.referral_rewards(referred_user_id);
CREATE INDEX idx_referral_rewards_order_id ON public.referral_rewards(order_id);
CREATE INDEX idx_referral_rewards_status ON public.referral_rewards(status);
CREATE INDEX idx_referral_rewards_matures_at ON public.referral_rewards(matures_at) WHERE status = 'pending';
CREATE INDEX idx_orders_referrer_user_id ON public.orders(referrer_user_id) WHERE referrer_user_id IS NOT NULL;

-- 9. RLS Policies
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Referral settings: public read, admin write (correct order: user_id, role)
CREATE POLICY "Anyone can read referral settings" ON public.referral_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage referral settings" ON public.referral_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Referral codes: users can see their own
CREATE POLICY "Users can view own referral code" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage referral codes" ON public.referral_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Wallets: users can see their own
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage wallets" ON public.wallets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Wallet transactions: users can see their own
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage wallet transactions" ON public.wallet_transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Referral rewards: users can see rewards where they are referrer
CREATE POLICY "Users can view own referral rewards" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = referrer_user_id);

CREATE POLICY "Admins can manage referral rewards" ON public.referral_rewards
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 10. Function to get referral setting value
CREATE OR REPLACE FUNCTION get_referral_setting(setting_key TEXT)
RETURNS JSONB AS $$
  SELECT value FROM public.referral_settings WHERE key = setting_key;
$$ LANGUAGE sql STABLE SET search_path = public;

-- 11. Function to mature pending rewards (to be called by cron/scheduled job)
CREATE OR REPLACE FUNCTION mature_pending_rewards()
RETURNS INTEGER AS $$
DECLARE
  matured_count INTEGER := 0;
  reward_record RECORD;
  new_transaction_id UUID;
BEGIN
  FOR reward_record IN 
    SELECT rr.*, w.id as wallet_id
    FROM public.referral_rewards rr
    JOIN public.wallets w ON w.user_id = rr.referrer_user_id
    WHERE rr.status = 'pending'
      AND rr.matures_at <= now()
  LOOP
    -- Create wallet transaction
    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, source, amount, currency, reference_id, description)
    VALUES (
      reward_record.referrer_user_id,
      reward_record.wallet_id,
      'credit',
      'reward_matured',
      reward_record.reward_amount,
      reward_record.currency,
      reward_record.id,
      'Referral reward matured'
    )
    RETURNING id INTO new_transaction_id;

    -- Update wallet balance
    UPDATE public.wallets
    SET 
      available_balance = available_balance + reward_record.reward_amount,
      pending_balance = pending_balance - reward_record.reward_amount,
      updated_at = now()
    WHERE user_id = reward_record.referrer_user_id;

    -- Update reward status
    UPDATE public.referral_rewards
    SET 
      status = 'available',
      matured_at = now(),
      wallet_transaction_id = new_transaction_id,
      updated_at = now()
    WHERE id = reward_record.id;

    matured_count := matured_count + 1;
  END LOOP;

  RETURN matured_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Create referral codes and wallets for existing users
INSERT INTO public.referral_codes (user_id, code)
SELECT user_id, generate_referral_code()
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.wallets (user_id)
SELECT user_id
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;