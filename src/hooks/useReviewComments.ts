import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ReviewComment {
  id: string;
  review_id: string;
  parent_id: string | null;
  user_id: string | null;
  author_name: string;
  body: string;
  is_edited: boolean;
  depth: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  replies?: ReviewComment[];
}

type SortMode = 'new' | 'top';

export const useReviewComments = (reviewId: string, sort: SortMode = 'new') => {
  return useQuery({
    queryKey: ['review-comments', reviewId, sort],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('api-comments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: null,
      });

      // Edge function GET needs query params — use direct fetch instead
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-comments?review_id=${reviewId}&sort=${sort === 'top' ? 'old' : 'new'}&limit=100`;

      const res = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
        throw new Error(err.error?.message ?? 'Failed to load comments');
      }

      const result = await res.json();
      return buildTree((result.data ?? []) as ReviewComment[]);
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
      const { data, error } = await supabase.functions.invoke('api-comments', {
        method: 'POST',
        body: {
          review_id: input.review_id,
          parent_id: input.parent_id ?? null,
          author_name: input.author_name,
          body: input.body,
        },
      });
      if (error) throw error;
      return data?.data;
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
      const { error } = await supabase.functions.invoke('api-comments', {
        method: 'PATCH',
        body: { id, body },
      });
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
      const { error } = await supabase.functions.invoke('api-comments', {
        method: 'DELETE',
        body: { id },
      });
      if (error) throw error;
      return reviewId;
    },
    onSuccess: (reviewId) => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', reviewId] });
    },
  });
};
