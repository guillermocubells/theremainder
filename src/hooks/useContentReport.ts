import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ReportReason = 'spam' | 'offensive' | 'misinformation' | 'harassment' | 'other';
export type ReportEntityType = 'review' | 'comment';

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
      const { data, error } = await supabase
        .from('content_reports')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) {
        // Unique constraint = already reported
        if (error.code === '23505') {
          throw new Error('ALREADY_REPORTED');
        }
        throw error;
      }
      return data;
    },
  });
};

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
