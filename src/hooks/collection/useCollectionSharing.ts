import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type ShareVisibility = 'private' | 'link' | 'public';

export interface CollectionShare {
  id: string;
  collection_id: string;
  user_id: string;
  visibility: ShareVisibility;
  share_token: string | null;
  allow_download: boolean;
  expires_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ShareUpdateInput {
  visibility?: ShareVisibility;
  allow_download?: boolean;
  expires_at?: string | null;
}

const FUNC_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-collection`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

/** Fetch current share settings for a collection */
export function useCollectionShare(collectionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['collection-share', collectionId],
    enabled: !!user && !!collectionId,
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNC_BASE}/collections/${collectionId}/share`, { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Error al obtener configuración de compartir');
      return (await res.json()) as CollectionShare;
    },
  });
}

/** Create or update share settings */
export function useUpdateCollectionShare() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectionId, ...input }: ShareUpdateInput & { collectionId: string }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNC_BASE}/collections/${collectionId}/share`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Error al actualizar compartir');
      }
      return (await res.json()) as CollectionShare;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['collection-share', data.collection_id] });
      toast({ title: 'Configuración de compartir actualizada' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
}

/** Revoke sharing (delete share record) */
export function useRevokeCollectionShare() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNC_BASE}/collections/${collectionId}/share`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Error al revocar enlace');
      return collectionId;
    },
    onSuccess: (collectionId) => {
      qc.invalidateQueries({ queryKey: ['collection-share', collectionId] });
      toast({ title: 'Enlace revocado' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
}

/** Fetch a public shared collection by token (no auth needed) */
export function usePublicCollection(token: string | undefined) {
  return useQuery({
    queryKey: ['public-collection', token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${FUNC_BASE}/shared/${token}`, {
        headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      if (!res.ok) return null;
      return await res.json();
    },
  });
}
