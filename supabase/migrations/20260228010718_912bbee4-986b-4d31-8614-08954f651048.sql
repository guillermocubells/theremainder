
-- Verification requests table
CREATE TABLE public.verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL,                    -- 'review', 'plant', 'collection_item'
  target_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',       -- 'pending', 'approved', 'rejected'
  evidence_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  reviewer_id UUID,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_verification_pending ON public.verification_requests (status, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_verification_user ON public.verification_requests (user_id, created_at DESC);
CREATE INDEX idx_verification_target ON public.verification_requests (target_type, target_id);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users view own verifications"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users create own verifications"
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Moderators/admins can view all
CREATE POLICY "Moderators view all verifications"
  ON public.verification_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Moderators/admins can update (approve/reject)
CREATE POLICY "Moderators update verifications"
  ON public.verification_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-evidence', 'verification-evidence', false);

-- Users can upload to their own folder
CREATE POLICY "Users upload verification evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own evidence
CREATE POLICY "Users view own evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Moderators can view all evidence
CREATE POLICY "Moderators view all evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-evidence' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')));
