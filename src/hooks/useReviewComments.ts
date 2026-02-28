import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ReviewComment {
  id: string;
  review_id: string;
  parent_id: string | null;
  user_id: string;
  author_name: string;
  body: string;
  is_edited: boolean;
  depth: number;
  created_at: string;
  updated_at: string;
  replies?: ReviewComment[];
}

type SortMode = 'new' | 'top';

export const useReviewComments = (reviewId: string, sort: SortMode = 'new') => {
  return useQuery({
    queryKey: ['review-comments', reviewId, sort],
    queryFn: async () => {
      const order = sort === 'top'
        ? { column: 'created_at', ascending: true } // top-level oldest first for "top" (thread context)
        : { column: 'created_at', ascending: false };

      const { data, error } = await supabase
        .from('review_comments')
        .select('*')
        .eq('review_id', reviewId)
        .order(order.column, { ascending: order.ascending });

      if (error) throw error;
      return buildTree((data ?? []) as ReviewComment[]);
    },
    enabled: !!reviewId,
  });
};

function buildTree(flat: ReviewComment[]): ReviewComment[] {
  const map = new Map<string, ReviewComment>();
  const roots: ReviewComment[] = [];

  flat.forEach((c) => { map.set(c.id, { ...c, replies: [] }); });
  flat.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      review_id: string;
      parent_id?: string | null;
      author_name: string;
      body: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('review_comments')
        .insert({
          review_id: input.review_id,
          parent_id: input.parent_id ?? null,
          user_id: user.id,
          author_name: input.author_name,
          body: input.body,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', vars.review_id] });
    },
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body, reviewId }: { id: string; body: string; reviewId: string }) => {
      const { error } = await supabase
        .from('review_comments')
        .update({ body, is_edited: true })
        .eq('id', id);
      if (error) throw error;
      return reviewId;
    },
    onSuccess: (reviewId) => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', reviewId] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reviewId }: { id: string; reviewId: string }) => {
      const { error } = await supabase
        .from('review_comments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return reviewId;
    },
    onSuccess: (reviewId) => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', reviewId] });
    },
  });
};
