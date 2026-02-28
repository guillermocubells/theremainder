import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ReviewVote {
  review_id: string;
  vote_type: 1 | -1;
}

export const useReviewVotes = (reviewIds: string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['review-votes', user?.id, reviewIds],
    queryFn: async () => {
      if (!user || reviewIds.length === 0) return {};
      const { data } = await supabase
        .from('review_votes')
        .select('review_id, vote_type')
        .eq('user_id', user.id)
        .in('review_id', reviewIds);
      const map: Record<string, 1 | -1> = {};
      data?.forEach((v) => { map[v.review_id] = v.vote_type as 1 | -1; });
      return map;
    },
    enabled: !!user && reviewIds.length > 0,
  });
};

export const useCastVote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ reviewId, voteType }: { reviewId: string; voteType: 1 | -1 | 0 }) => {
      if (!user) throw new Error('Not authenticated');

      if (voteType === 0) {
        // Remove vote
        await supabase
          .from('review_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);
      } else {
        // Upsert vote
        const { error } = await supabase
          .from('review_votes')
          .upsert(
            { review_id: reviewId, user_id: user.id, vote_type: voteType },
            { onConflict: 'review_id,user_id' }
          );
        if (error) throw error;
      }
    },
    onMutate: async ({ reviewId, voteType }) => {
      // Optimistic update for user votes
      await queryClient.cancelQueries({ queryKey: ['review-votes'] });
      const prev = queryClient.getQueryData<Record<string, 1 | -1>>(['review-votes', user?.id]);
      
      // Optimistic update for reviews (score)
      await queryClient.cancelQueries({ queryKey: ['plant-reviews'] });

      return { prev };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['review-votes'] });
      queryClient.invalidateQueries({ queryKey: ['plant-reviews'] });
    },
  });
};
