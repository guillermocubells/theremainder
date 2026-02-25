import { useState } from 'react';
import { useAuctionBidding } from '@/hooks/useAuctionBidding';
import { calculateBidIncrement } from '@/hooks/useAuctionSubmission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Gavel, Clock, AlertTriangle, TrendingUp, User, Shield, CreditCard, Lock, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import DepositForm from './DepositForm';
import AuctionConsentGate from './AuctionConsentGate';

interface BiddingPanelProps {
  auctionId: string;
  auctionTitle: string;
}

const BiddingPanel = ({ auctionId, auctionTitle }: BiddingPanelProps) => {
  const {
    auction, bids, timeLeft, isEnding, minBid,
    placeBid, isAuthenticated, userId,
    depositRequired, hasDeposit, deposit, createDeposit, confirmDeposit,
  } = useAuctionBidding(auctionId);

  const [bidAmount, setBidAmount] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);

  if (!auction) return null;

  const isLive = auction.status === 'live';
  const hasEnded = timeLeft === 'Finalizada';
  const userIsHighBidder = bids.length > 0 && bids[0].user_id === userId;
  const needsDeposit = depositRequired && !hasDeposit;

  // PRD tiered increment
  const tieredIncrement = calculateBidIncrement(auction.current_price);
  const effectiveMinBid = auction.total_bids === 0
    ? auction.starting_price
    : auction.current_price + tieredIncrement;

  const handleBidAttempt = () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < effectiveMinBid) {
      setBidAmount(effectiveMinBid.toFixed(2));
      return;
    }
    setPendingAmount(amount);
    setConfirmTerms(false);
    setConfirmOpen(true);
  };

  const handleConfirmBid = () => {
    placeBid.mutate(pendingAmount, {
      onSuccess: () => {
        setBidAmount('');
        setConfirmOpen(false);
      },
      onError: () => {
        // Optimistic revert: refresh min bid and show toast (handled in hook)
        setConfirmOpen(false);
        setBidAmount(effectiveMinBid.toFixed(2));
      },
    });
  };

  const quickBids = [
    effectiveMinBid,
    effectiveMinBid + tieredIncrement,
    effectiveMinBid + tieredIncrement * 3,
  ];

  return (
    <>
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" /> Pujar
          </CardTitle>
          {isLive && !hasEnded && (
            <Badge
              variant={isEnding ? 'destructive' : 'secondary'}
              className={cn('text-xs', isEnding && 'animate-pulse')}
            >
              <Clock className="h-3 w-3 mr-1" />
              <span aria-live="polite" aria-atomic="true">{timeLeft}</span>
            </Badge>
          )}
          {hasEnded && <Badge variant="outline">Finalizada</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current price */}
        <div className="text-center py-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">
            {auction.total_bids === 0 ? 'Precio de salida' : 'Puja actual'}
          </p>
          <p className="text-3xl font-bold text-foreground" aria-live="polite" aria-atomic="true">
            {auction.current_price.toFixed(2)} €
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {auction.total_bids} puja{auction.total_bids !== 1 ? 's' : ''}
            {auction.reserve_met === false && auction.total_bids > 0 && (
              <span className="text-destructive ml-2">· Reserva no alcanzada</span>
            )}
            {auction.reserve_met && (
              <span className="text-primary ml-2">· Reserva alcanzada ✓</span>
            )}
          </p>
        </div>

        {/* Anti-sniping warning — PRD: 2 min extension in last 2 min */}
        {isEnding && isLive && !hasEnded && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-xs">
              ¡Últimos minutos! Las pujas en los últimos 2 min extienden la subasta 2 min más.
              <Badge variant="outline" className="ml-2 text-[10px]">Extendida</Badge>
            </AlertDescription>
          </Alert>
        )}

        {/* User high bidder */}
        {isAuthenticated && userIsHighBidder && !hasEnded && (
          <Alert className="border-primary/30 bg-primary/5">
            <Shield className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs text-primary font-medium">
              ¡Eres el mejor postor!
            </AlertDescription>
          </Alert>
        )}

        {/* Deposit info */}
        {depositRequired && isAuthenticated && (
          <>
            {hasDeposit ? (
              <Alert className="border-primary/30 bg-primary/5">
                <CreditCard className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs text-primary font-medium">
                  Depósito de {deposit?.amount?.toFixed(2)} € confirmado · Reembolsable al finalizar
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-destructive/30 bg-destructive/5">
                <Lock className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs">
                  Se requiere un depósito reembolsable de {auction.deposit_amount?.toFixed(2)} € para pujar
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Bid form or deposit form */}
        {isLive && !hasEnded && (
          <>
            {!isAuthenticated ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">Inicia sesión para pujar</p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/auth">Iniciar sesión</a>
                </Button>
              </div>
            ) : (
              <AuctionConsentGate consentType="bidder">
                {needsDeposit ? (
                  <DepositForm
                    auctionId={auctionId}
                    depositAmount={auction.deposit_amount!}
                    createDeposit={createDeposit}
                    confirmDeposit={confirmDeposit}
                  />
                ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Puja mínima: {effectiveMinBid.toFixed(2)} € (incremento: {tieredIncrement.toFixed(2)} €)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step={tieredIncrement}
                      min={effectiveMinBid}
                      value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                      placeholder={effectiveMinBid.toFixed(2)}
                      className="text-lg font-medium"
                      aria-label="Cantidad de puja en euros"
                    />
                    <Button
                      onClick={handleBidAttempt}
                      disabled={placeBid.isPending}
                      className="px-6"
                    >
                      <Gavel className="h-4 w-4 mr-1" /> Pujar
                    </Button>
                  </div>
                </div>

                {/* Quick bid buttons */}
                <div className="flex gap-2">
                  {quickBids.map(amount => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setBidAmount(amount.toFixed(2))}
                    >
                      {amount.toFixed(2)} €
                    </Button>
                  ))}
                </div>
              </div>
                )}
              </AuctionConsentGate>
            )}
          </>
        )}

        {/* Fee transparency */}
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-md p-2">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>Sin prima de comprador. Comisión del 6% aplicada al vendedor sobre el precio final de venta.</span>
        </div>

        {/* Bid history */}
        {bids.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Historial de pujas
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto" aria-live="polite">
                {bids.slice(0, 10).map((bid, i) => (
                  <div
                    key={bid.id}
                    className={cn(
                      'flex items-center justify-between text-sm py-1.5 px-2 rounded',
                      i === 0 && 'bg-primary/5 font-medium',
                    )}
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="text-xs">
                        {bid.user_id === userId ? 'Tú' : `Postor ···${bid.user_id.slice(-4)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('font-medium', i === 0 ? 'text-primary' : 'text-foreground')}>
                        {bid.amount.toFixed(2)} €
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(bid.created_at), { locale: es, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Confirmation modal */}
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar puja</DialogTitle>
          <DialogDescription>
            Estás a punto de pujar por "{auctionTitle}".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Tu puja</p>
            <p className="text-3xl font-bold text-foreground">{pendingAmount.toFixed(2)} €</p>
            <p className="text-xs text-muted-foreground mt-1">Mínimo permitido: {effectiveMinBid.toFixed(2)} €</p>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm-terms"
              checked={confirmTerms}
              onCheckedChange={v => setConfirmTerms(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="confirm-terms" className="text-xs leading-tight cursor-pointer">
              Entiendo que esta puja es vinculante y acepto los términos de participación en subastas. Las subastas están exentas del derecho de desistimiento conforme a la legislación española y europea.
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmBid} disabled={!confirmTerms || placeBid.isPending}>
            {placeBid.isPending ? 'Pujando...' : `Confirmar ${pendingAmount.toFixed(2)} €`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default BiddingPanel;
