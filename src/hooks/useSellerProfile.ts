import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SellerProfile {
  id: string;
  user_id: string;
  legal_name: string;
  document_type: string;
  document_number: string;
  tax_id: string | null;
  tax_address_street: string | null;
  tax_address_city: string | null;
  tax_address_postal_code: string | null;
  tax_address_province: string | null;
  tax_address_country: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  verification_status: string;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useSellerProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['seller-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('seller_profiles' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SellerProfile | null;
    },
    enabled: !!user,
  });

  const createProfile = useMutation({
    mutationFn: async (profile: {
      legal_name: string;
      document_type: string;
      document_number: string;
      tax_id?: string;
      tax_address_street?: string;
      tax_address_city?: string;
      tax_address_postal_code?: string;
      tax_address_province?: string;
      tax_address_country?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('seller_profiles' as any)
        .insert({ ...profile, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-profile'] });
      toast.success('Perfil de vendedor creado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startOnboarding = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await supabase.functions.invoke('create-connect-account', {
        body: { action: 'create_account' },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data as { url: string; accountId: string };
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkStatus = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('create-connect-account', {
        body: { action: 'check_status' },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-profile'] });
    },
  });

  return { profile: query.data, isLoading: query.isLoading, createProfile, startOnboarding, checkStatus };
}
