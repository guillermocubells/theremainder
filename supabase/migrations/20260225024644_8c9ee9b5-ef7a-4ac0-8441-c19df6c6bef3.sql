
-- KYC documents table: stores document uploads with integrity hashes
CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('nif_front','nif_back','passport','residence_permit','proof_of_address','business_registration','tax_certificate','other')),
  storage_path text NOT NULL,
  file_hash text NOT NULL,
  file_size_bytes integer,
  mime_type text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Verification events / audit trail
CREATE TABLE public.kyc_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text NOT NULL DEFAULT 'system',
  event_type text NOT NULL CHECK (event_type IN ('submitted','document_uploaded','document_approved','document_rejected','verification_started','verification_approved','verification_rejected','verification_expired','resubmission_requested')),
  metadata jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on kyc_documents
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own KYC documents"
  ON public.kyc_documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own KYC documents"
  ON public.kyc_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all KYC documents"
  ON public.kyc_documents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage KYC documents"
  ON public.kyc_documents FOR ALL
  USING (auth.role() = 'service_role');

-- RLS on kyc_verification_events
ALTER TABLE public.kyc_verification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification events"
  ON public.kyc_verification_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.seller_profiles sp
    WHERE sp.id = kyc_verification_events.seller_profile_id
      AND sp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all verification events"
  ON public.kyc_verification_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage verification events"
  ON public.kyc_verification_events FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_kyc_documents_seller ON public.kyc_documents(seller_profile_id);
CREATE INDEX idx_kyc_documents_user ON public.kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_status ON public.kyc_documents(status);
CREATE INDEX idx_kyc_events_seller ON public.kyc_verification_events(seller_profile_id);

-- Updated_at trigger for kyc_documents
CREATE TRIGGER update_kyc_documents_updated_at
  BEFORE UPDATE ON public.kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
