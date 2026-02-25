import { useAuctionConsent, type AuctionConsentType } from '@/hooks/useAuctionConsent';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { FileCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface AuctionConsentGateProps {
  consentType: AuctionConsentType;
  children: React.ReactNode;
}

const labels: Record<AuctionConsentType, { title: string; description: string }> = {
  bidder: {
    title: 'Términos de participación en subastas',
    description:
      'Para pujar debes aceptar los términos y condiciones de participación en subastas, incluyendo las políticas de depósitos, pagos y plazos de liquidación.',
  },
  seller: {
    title: 'Términos de venta en subastas',
    description:
      'Para crear lotes debes aceptar los términos y condiciones de venta, incluyendo comisiones de plataforma, política de envíos y resolución de disputas.',
  },
};

const AuctionConsentGate = ({ consentType, children }: AuctionConsentGateProps) => {
  const { hasConsent, isLoading, termsVersion, recordConsent } = useAuctionConsent(consentType);
  const [accepted, setAccepted] = useState(false);

  if (isLoading) return null;
  if (hasConsent) return <>{children}</>;

  const { title, description } = labels[consentType];

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <FileCheck className="h-4 w-4 text-primary" />
      <AlertDescription className="space-y-3">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {termsVersion && (
          <p className="text-xs text-muted-foreground">Versión: {termsVersion}</p>
        )}
        <div className="flex items-start gap-2">
          <Checkbox
            id={`consent-${consentType}`}
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
          />
          <label htmlFor={`consent-${consentType}`} className="text-xs leading-tight cursor-pointer">
            He leído y acepto los términos y condiciones de {consentType === 'bidder' ? 'participación' : 'venta'} en subastas.
          </label>
        </div>
        <Button
          size="sm"
          disabled={!accepted || recordConsent.isPending}
          onClick={() => recordConsent.mutate()}
        >
          {recordConsent.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          Aceptar términos
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default AuctionConsentGate;
