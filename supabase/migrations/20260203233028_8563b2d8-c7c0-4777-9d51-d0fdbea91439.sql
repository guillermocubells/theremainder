-- Create fraud flag types enum
CREATE TYPE public.fraud_flag_type AS ENUM (
  'self_referral',
  'similar_email',
  'ip_match',
  'device_fingerprint',
  'multiple_first_orders_ip',
  'suspicious_amount_pattern',
  'wallet_abuse'
);

-- Create fraud flag severity enum
CREATE TYPE public.fraud_flag_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Create fraud flag status enum
CREATE TYPE public.fraud_flag_status AS ENUM (
  'pending',
  'reviewed',
  'approved',
  'revoked'
);

-- Create fraud_flags table
CREATE TABLE public.fraud_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  referrer_user_id UUID,
  type public.fraud_flag_type NOT NULL,
  severity public.fraud_flag_severity NOT NULL DEFAULT 'medium',
  status public.fraud_flag_status NOT NULL DEFAULT 'pending',
  related_order_id UUID REFERENCES public.orders(id),
  related_reward_id UUID REFERENCES public.referral_rewards(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_fraud_flags_user_id ON public.fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_referrer_user_id ON public.fraud_flags(referrer_user_id);
CREATE INDEX idx_fraud_flags_status ON public.fraud_flags(status);
CREATE INDEX idx_fraud_flags_type ON public.fraud_flags(type);
CREATE INDEX idx_fraud_flags_created_at ON public.fraud_flags(created_at DESC);

-- Enable RLS
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can access fraud flags
CREATE POLICY "Admins can view all fraud flags"
  ON public.fraud_flags FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert fraud flags"
  ON public.fraud_flags FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update fraud flags"
  ON public.fraud_flags FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add fraud_blocked field to referral_rewards
ALTER TABLE public.referral_rewards 
ADD COLUMN IF NOT EXISTS fraud_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fraud_reason TEXT;

-- Add IP tracking to orders for fraud detection
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS client_ip TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create function to check for fraud patterns
CREATE OR REPLACE FUNCTION public.check_referral_fraud(
  p_referrer_user_id UUID,
  p_referred_user_id UUID,
  p_order_id UUID,
  p_client_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(
  is_blocked BOOLEAN,
  flags JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_flags JSONB := '[]'::jsonb;
  v_is_blocked BOOLEAN := false;
  v_referrer_email TEXT;
  v_referred_email TEXT;
  v_ip_count INTEGER;
  v_similar_amount_count INTEGER;
  v_cap_amount NUMERIC;
BEGIN
  -- Get emails
  SELECT email INTO v_referrer_email FROM profiles WHERE user_id = p_referrer_user_id;
  SELECT email INTO v_referred_email FROM profiles WHERE user_id = p_referred_user_id;

  -- 1. Check self-referral (CRITICAL - blocks reward)
  IF p_referrer_user_id = p_referred_user_id THEN
    v_is_blocked := true;
    v_flags := v_flags || jsonb_build_object(
      'type', 'self_referral',
      'severity', 'critical',
      'message', 'Self-referral detected'
    );
    
    INSERT INTO fraud_flags (user_id, referrer_user_id, type, severity, status, related_order_id, metadata)
    VALUES (p_referred_user_id, p_referrer_user_id, 'self_referral', 'critical', 'pending', p_order_id, 
            jsonb_build_object('auto_blocked', true));
  END IF;

  -- 2. Check similar emails (FLAG only)
  IF v_referrer_email IS NOT NULL AND v_referred_email IS NOT NULL THEN
    IF v_referrer_email = v_referred_email OR
       split_part(v_referrer_email, '@', 1) = split_part(v_referred_email, '@', 1) OR
       similarity(v_referrer_email, v_referred_email) > 0.7 THEN
      v_flags := v_flags || jsonb_build_object(
        'type', 'similar_email',
        'severity', 'medium',
        'message', 'Similar emails detected between referrer and referred'
      );
      
      INSERT INTO fraud_flags (user_id, referrer_user_id, type, severity, status, related_order_id, metadata)
      VALUES (p_referred_user_id, p_referrer_user_id, 'similar_email', 'medium', 'pending', p_order_id,
              jsonb_build_object('referrer_email', v_referrer_email, 'referred_email', v_referred_email));
    END IF;
  END IF;

  -- 3. Check IP patterns (FLAG only)
  IF p_client_ip IS NOT NULL THEN
    -- Count orders from same IP with referrals
    SELECT COUNT(*) INTO v_ip_count
    FROM orders o
    WHERE o.client_ip = p_client_ip
      AND o.referrer_user_id IS NOT NULL
      AND o.created_at > now() - interval '30 days';
    
    IF v_ip_count >= 3 THEN
      v_flags := v_flags || jsonb_build_object(
        'type', 'ip_match',
        'severity', CASE WHEN v_ip_count >= 5 THEN 'high' ELSE 'medium' END,
        'message', format('Multiple referred orders from same IP: %s orders', v_ip_count)
      );
      
      INSERT INTO fraud_flags (user_id, referrer_user_id, type, severity, status, related_order_id, metadata)
      VALUES (p_referred_user_id, p_referrer_user_id, 'ip_match', 
              CASE WHEN v_ip_count >= 5 THEN 'high'::fraud_flag_severity ELSE 'medium'::fraud_flag_severity END, 
              'pending', p_order_id,
              jsonb_build_object('ip', p_client_ip, 'order_count', v_ip_count));
    END IF;
  END IF;

  -- 4. Check suspicious amount patterns (near cap)
  SELECT (value->>'value')::numeric INTO v_cap_amount
  FROM referral_settings WHERE key = 'max_reward_cap_eur';
  v_cap_amount := COALESCE(v_cap_amount, 100);

  SELECT COUNT(*) INTO v_similar_amount_count
  FROM referral_rewards rr
  WHERE rr.referrer_user_id = p_referrer_user_id
    AND rr.cap_applied = true
    AND rr.created_at > now() - interval '90 days';

  IF v_similar_amount_count >= 3 THEN
    v_flags := v_flags || jsonb_build_object(
      'type', 'suspicious_amount_pattern',
      'severity', 'medium',
      'message', format('Multiple capped rewards for referrer: %s times', v_similar_amount_count)
    );
    
    INSERT INTO fraud_flags (user_id, referrer_user_id, type, severity, status, related_order_id, metadata)
    VALUES (p_referred_user_id, p_referrer_user_id, 'suspicious_amount_pattern', 'medium', 'pending', p_order_id,
            jsonb_build_object('capped_count', v_similar_amount_count, 'cap_amount', v_cap_amount));
  END IF;

  RETURN QUERY SELECT v_is_blocked, v_flags;
END;
$$;