import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AuctionConsentType = 'bidder' | 'seller';

interface AuctionConsent {
  id: string;
  terms_version: string;
  consent_type: string;
  accepted_at: string;
}

export function useAuctionConsent(consentType: AuctionConsentType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current terms version
  const { data: termsVersion } = useQuery({
    queryKey: ['auction-terms-version'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'auction_terms_version')
        .single();
      if (error) throw error;
      // value is stored as jsonb string e.g. "1.0"
      return typeof data.value === 'string' ? data.value : String(data.value);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Check if user has accepted current version
  const { data: consent, isLoading } = useQuery({
    queryKey: ['auction-consent', user?.id, consentType, termsVersion],
    queryFn: async () => {
      if (!user || !termsVersion) return null;
      const { data, error } = await supabase
        .from('auction_consents' as any)
        .select('id, terms_version, consent_type, accepted_at')
        .eq('user_id', user.id)
        .eq('consent_type', consentType)
        .eq('terms_version', termsVersion)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AuctionConsent | null;
    },
    enabled: !!user && !!termsVersion,
  });

  const hasConsent = !!consent;

  // Record consent via edge function (captures IP server-side)
  const recordConsent = useMutation({
    mutationFn: async () => {
      if (!user || !termsVersion) throw new Error('No autenticado');
      const { data, error } = await supabase.functions.invoke('record-auction-consent', {
        body: {
          consent_type: consentType,
          terms_version: termsVersion,
          user_agent: navigator.userAgent,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction-consent', user?.id, consentType] });
      toast.success('Términos aceptados');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    hasConsent,
    isLoading,
    termsVersion,
    consent,
    recordConsent,
  };
}
