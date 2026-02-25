import { useState } from 'react';
import { useAuctionBidding } from '@/hooks/useAuctionBidding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Gavel, Clock, AlertTriangle, TrendingUp, User, Shield, CreditCard, Lock } from 'lucide-react';
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

  if (!auction) return null;

  const isLive = auction.status === 'live';
  const hasEnded = timeLeft === 'Finalizada';
  const userIsHighBidder = bids.length > 0 && bids[0].user_id === userId;
  const needsDeposit = depositRequired && !hasDeposit;

  const handleBid = () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      setBidAmount(minBid.toFixed(2));
      return;
    }
    placeBid.mutate(amount, {
      onSuccess: () => setBidAmount(''),
    });
  };

  const quickBids = [
    minBid,
    minBid + auction.bid_increment,
    minBid + auction.bid_increment * 3,
  ];

  return (
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
              {timeLeft}
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
          <p className="text-3xl font-bold text-foreground">
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

        {/* Anti-sniping warning */}
        {isEnding && isLive && !hasEnded && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-xs">
              ¡Últimos minutos! Las pujas en los últimos 5 min extienden la subasta 5 min más.
            </AlertDescription>
          </Alert>
        )}

        {/* User status */}
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
                    Puja mínima: {minBid.toFixed(2)} € (incremento: {auction.bid_increment.toFixed(2)} €)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step={auction.bid_increment}
                      min={minBid}
                      value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                      placeholder={minBid.toFixed(2)}
                      className="text-lg font-medium"
                    />
                    <Button
                      onClick={handleBid}
                      disabled={placeBid.isPending}
                      className="px-6"
                    >
                      {placeBid.isPending ? (
                        <span className="animate-pulse">Pujando...</span>
                      ) : (
                        <>
                          <Gavel className="h-4 w-4 mr-1" /> Pujar
                        </>
                      )}
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

        {/* Bid history */}
        {bids.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Últimas pujas
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
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
                        {bid.user_id === userId ? 'Tú' : `···${bid.user_id.slice(-4)}`}
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
  );
};

export default BiddingPanel;
