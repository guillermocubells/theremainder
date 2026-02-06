import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GardenInquiry {
  id: string;
  shared_list_id: string | null;
  owned_plant_id: string;
  owner_user_id: string;
  viewer_identifier: string;
  viewer_email: string | null;
  message: string;
  offer_type: 'buy' | 'trade' | 'question' | null;
  status: 'new' | 'replied' | 'ignored' | 'blocked';
  owner_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  plant_nickname?: string;
  plant_scientific_name?: string;
}

export const useGardenInquiries = (statusFilter?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['garden-inquiries', user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('garden_inquiries')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with plant names
      if (data && data.length > 0) {
        const plantIds = [...new Set(data.map(i => i.owned_plant_id))];
        const { data: plants } = await supabase
          .from('owned_plants')
          .select('id, nickname, scientific_name')
          .in('id', plantIds);

        const plantMap = new Map(plants?.map(p => [p.id, p]) || []);
        return data.map(inquiry => ({
          ...inquiry,
          plant_nickname: plantMap.get(inquiry.owned_plant_id)?.nickname,
          plant_scientific_name: plantMap.get(inquiry.owned_plant_id)?.scientific_name,
        })) as GardenInquiry[];
      }

      return (data || []) as GardenInquiry[];
    },
    enabled: !!user?.id,
  });
};

export const useInquiryCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['garden-inquiry-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('garden_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('owner_user_id', user.id)
        .eq('status', 'new');

      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id,
  });
};

export const useReplyToInquiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inquiryId, reply }: { inquiryId: string; reply: string }) => {
      const { data, error } = await supabase
        .from('garden_inquiries')
        .update({
          status: 'replied',
          owner_reply: reply,
          replied_at: new Date().toISOString(),
        } as any)
        .eq('id', inquiryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garden-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['garden-inquiry-count'] });
      toast.success('Respuesta enviada');
    },
    onError: () => {
      toast.error('Error al responder');
    },
  });
};

export const useUpdateInquiryStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inquiryId, status }: { inquiryId: string; status: string }) => {
      const { data, error } = await supabase
        .from('garden_inquiries')
        .update({ status } as any)
        .eq('id', inquiryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garden-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['garden-inquiry-count'] });
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });
};

export const useBlockViewer = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ viewerIdentifier, scope, sharedListId }: {
      viewerIdentifier: string;
      scope: 'global' | 'share_link';
      sharedListId?: string;
    }) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('garden_viewer_blocks')
        .insert({
          owner_user_id: user.id,
          viewer_identifier: viewerIdentifier,
          scope,
          shared_list_id: sharedListId || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garden-inquiries'] });
      toast.success('Visitante bloqueado');
    },
    onError: () => {
      toast.error('Error al bloquear');
    },
  });
};
