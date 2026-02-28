import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ReportReason = 'spam' | 'offensive' | 'misinformation' | 'harassment' | 'other';
export type ReportEntityType = 'review' | 'comment' | 'plant' | 'collection';
export type ModerationAction = 'dismiss' | 'warn' | 'remove';

// ── Create report (via edge function) ──

export const useCreateReport = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      entity_type: ReportEntityType;
      entity_id: string;
      reason: ReportReason;
      details?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('api-moderation', {
        method: 'POST',
        body: input,
      });
      if (error) throw error;
      return data?.data;
    },
  });
};

// ── Check if user already reported ──

export const useHasReported = (entityType: ReportEntityType, entityId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['content-report-check', entityType, entityId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { count } = await supabase
        .from('content_reports')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('user_id', user.id);
      return (count ?? 0) > 0;
    },
    enabled: !!user && !!entityId,
  });
};

// ── Moderation queue (admin/moderator) ──

export const useModerationQueue = (status?: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['moderation-queue', status, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set('status', status);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-moderation?${params}`;
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
        throw new Error(err.error?.message ?? 'Failed to load reports');
      }

      return res.json();
    },
  });
};

// ── Take moderation action ──

export const useModerationAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; action: ModerationAction; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('api-moderation', {
        method: 'PATCH',
        body: input,
      });
      if (error) throw error;
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
    },
  });
};
