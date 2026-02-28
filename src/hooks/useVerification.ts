import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type VerificationTargetType = 'review' | 'plant' | 'collection_item';
export type VerificationAction = 'approve' | 'reject';

// ── Submit verification request ──

export const useSubmitVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      target_type: VerificationTargetType;
      target_id: string;
      evidence_urls: string[];
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('api-verification', {
        method: 'POST',
        body: input,
      });
      if (error) throw error;
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
    },
  });
};

// ── List verification requests (own for users, all for moderators) ──

export const useVerificationRequests = (status?: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['verification-requests', status, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set('status', status);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-verification?${params}`;
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
        throw new Error(err.error?.message ?? 'Failed to load verification requests');
      }

      return res.json();
    },
  });
};

// ── Moderator: approve/reject ──

export const useReviewVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; action: VerificationAction; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('api-verification', {
        method: 'PATCH',
        body: input,
      });
      if (error) throw error;
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
    },
  });
};

// ── Check if user has a pending/approved verification for a target ──

export const useVerificationStatus = (targetType: VerificationTargetType, targetId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['verification-status', targetType, targetId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('verification_requests')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .in('status', ['pending', 'approved'])
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!targetId,
  });
};
