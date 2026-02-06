import { Gift, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useReferralCode } from '@/hooks/useReferral';
import { Link } from 'react-router-dom';

interface ReferralBannerProps {
  /** Compact = no subtitle / smaller for checkout sidebar */
  compact?: boolean;
}

const ReferralBanner = ({ compact = false }: ReferralBannerProps) => {
  const { user } = useAuth();
  const { data: referral, isLoading } = useReferralCode();

  const handleCopyCode = async () => {
    if (!referral) return;
    try {
      await navigator.clipboard.writeText(referral.code);
      toast.success('Código copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleShare = async () => {
    if (!referral) return;
    const shareData = {
      title: 'Fronda Prima – Plantas exóticas',
      text: `Usa mi código ${referral.code} en tu primer pedido y ambos ganamos crédito para futuras compras.`,
      url: referral.link,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(referral.link);
        toast.success('Enlace copiado');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        await navigator.clipboard.writeText(referral.link);
        toast.success('Enlace copiado');
      }
    }
  };

  // Guest state in checkout
  if (!user) {
    if (compact) return null;
    return (
      <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
        <div className="bg-primary/10 rounded-full p-1.5 mt-0.5 flex-shrink-0">
          <Gift className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Comparte tu código y gana futuros descuentos
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            <Link to="/auth" className="text-primary hover:underline">
              Inicia sesión
            </Link>{' '}
            para obtener tu código de referidos y ganar crédito en futuras compras.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
    );
  }

  // No code yet (shouldn't happen if DB trigger works, but safe fallback)
  if (!referral) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 sm:p-3">
      <div className="flex items-start gap-2">
        <div className="bg-primary/10 rounded-full p-1 mt-0.5 flex-shrink-0">
          <Gift className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {compact ? 'Comparte tu código y gana futuros descuentos' : 'Tu código de referidos'}
          </p>

          {/* Code display */}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base sm:text-lg font-bold text-primary tracking-wider select-all">
              {referral.code}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1.5">
            {compact
              ? 'Comparte este código con otros interesados en plantas. Cuando hagan su primer pedido, recibirás crédito para futuras compras.'
              : 'Compártelo con otros amantes de las plantas. Si compran su primer pedido, ganas crédito para futuras compras.'}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleCopyCode}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar código
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5 mr-1" />
              Compartir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralBanner;
