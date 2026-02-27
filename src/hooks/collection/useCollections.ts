import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_default: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  cover_image_url?: string;
}

export interface UpdateCollectionInput {
  id: string;
  name?: string;
  description?: string | null;
  cover_image_url?: string | null;
}

export function useCollections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['collections', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Fetch collections with item counts
      const { data: collections, error } = await supabase
        .from('collections')
        .select('*')
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get item counts per collection
      const { data: counts, error: countError } = await supabase
        .from('collection_items')
        .select('collection_id');

      if (countError) throw countError;

      const countMap = (counts || []).reduce<Record<string, number>>((acc, item) => {
        acc[item.collection_id] = (acc[item.collection_id] || 0) + 1;
        return acc;
      }, {});

      return (collections || []).map((c) => ({
        ...c,
        item_count: countMap[c.id] || 0,
      })) as Collection[];
    },
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCollectionInput) => {
      if (!user) throw new Error('No autenticado');
      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description || null,
          cover_image_url: input.cover_image_url || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast({ title: 'Colección creada' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error al crear colección', description: e.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCollectionInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('collections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast({ title: 'Colección actualizada' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error al actualizar', description: e.message, variant: 'destructive' });
    },
  });
}

export function useArchiveCollection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('collections')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast({ title: 'Colección archivada' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error al archivar', description: e.message, variant: 'destructive' });
    },
  });
}
