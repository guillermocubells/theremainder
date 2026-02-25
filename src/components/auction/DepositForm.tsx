import { useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface DepositFormProps {
  auctionId: string;
  depositAmount: number;
  createDeposit: UseMutationResult<any, Error, void, unknown>;
  confirmDeposit: UseMutationResult<any, Error, void, unknown>;
}

/** Inner form rendered inside <Elements> */
const DepositPaymentForm = ({
  depositAmount,
  confirmDeposit,
}: {
  depositAmount: number;
  confirmDeposit: UseMutationResult<any, Error, void, unknown>;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message || 'Error al procesar el pago');
      setSubmitting(false);
      return;
    }

    // Tell backend the deposit is confirmed
    confirmDeposit.mutate();
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={!stripe || submitting}>
        {submitting ? (
          <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Procesando...</>
        ) : (
          <><ShieldCheck className="h-4 w-4 mr-1" /> Pagar depósito de {depositAmount.toFixed(2)} €</>
        )}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Depósito 100% reembolsable si no ganas la subasta
      </p>
    </form>
  );
};

const DepositForm = ({ auctionId, depositAmount, createDeposit, confirmDeposit }: DepositFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const handleInitDeposit = useCallback(() => {
    createDeposit.mutate(undefined, {
      onSuccess: (data) => {
        if (data.status === 'already_held') {
          confirmDeposit.mutate();
          return;
        }
        if (data.client_secret) {
          setClientSecret(data.client_secret);
        }
      },
    });
  }, [createDeposit, confirmDeposit]);

  if (!stripePromise) {
    return (
      <p className="text-sm text-destructive text-center py-4">
        Stripe no configurado. Contacta al administrador.
      </p>
    );
  }

  // Step 1: Show deposit button
  if (!clientSecret) {
    return (
      <div className="space-y-3">
        <Button
          onClick={handleInitDeposit}
          disabled={createDeposit.isPending}
          variant="outline"
          className="w-full border-primary/30"
        >
          {createDeposit.isPending ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Preparando depósito...</>
          ) : (
            <><CreditCard className="h-4 w-4 mr-1" /> Depositar {depositAmount.toFixed(2)} € para pujar</>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Se retendrá temporalmente en tu tarjeta. Reembolso automático si no ganas.
        </p>
      </div>
    );
  }

  // Step 2: Show Stripe payment form
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <DepositPaymentForm depositAmount={depositAmount} confirmDeposit={confirmDeposit} />
    </Elements>
  );
};

export default DepositForm;
