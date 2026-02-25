import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Loader2, Gavel, Clock, Calendar as CalIcon, Tag, ArrowRight } from 'lucide-react';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import { PageSEO } from '@/components/seo';
import BiddingPanel from '@/components/auction/BiddingPanel';

interface AuctionPreviewItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  starting_price: number;
  reserve_price: number | null;
  buy_now_price: number | null;
  bid_increment: number;
  condition: string | null;
  provenance: string | null;
  dimensions: any;
  images: string[] | null;
  videos: string[] | null;
  status: string;
  current_price: number;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number;
  total_bids: number;
}

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excelente', good: 'Bueno', fair: 'Aceptable', needs_care: 'Necesita cuidados',
};

const AuctionPreview = () => {
  const { data: auctions, isLoading } = useQuery({
    queryKey: ['public-auctions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auctions' as any)
        .select('*')
        .in('status', ['scheduled', 'live'])
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as unknown as AuctionPreviewItem[];
    },
  });

  const getAuctionState = (a: AuctionPreviewItem) => {
    if (!a.starts_at) return 'pending';
    if (isFuture(new Date(a.starts_at))) return 'upcoming';
    if (a.ends_at && isPast(new Date(a.ends_at))) return 'ended';
    return 'live';
  };

  return (
    <div className="min-h-screen bg-background">
      <PageSEO title="Subastas | The Remainder" description="Subastas de ejemplares exclusivos de plantas." />
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Gavel className="h-4 w-4" /> Subastas
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Ejemplares en subasta</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Ejemplares únicos seleccionados por nuestros vendedores verificados. Puja por plantas exclusivas.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !auctions || auctions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Gavel className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-1">No hay subastas activas</h2>
              <p className="text-muted-foreground text-sm">Vuelve pronto para ver nuevos lotes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {auctions.map((auction, idx) => {
              const state = getAuctionState(auction);
              return (
                <div key={auction.id} className="space-y-4">
                  <Link to={`/subastas/${auction.slug}`} className="block">
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row">
                      {/* Image */}
                      <div className="md:w-80 flex-shrink-0">
                        {auction.images && auction.images.length > 0 ? (
                          <div className="relative">
                            <img src={auction.images[0]} alt={auction.title} className="w-full h-64 md:h-full object-cover" />
                            {auction.images.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-background/80 rounded-full px-2 py-0.5 text-xs text-foreground">
                                +{auction.images.length - 1} fotos
                              </div>
                            )}
                            <div className="absolute top-2 left-2">
                              <Badge variant={state === 'live' ? 'default' : 'secondary'} className="text-xs">
                                {state === 'live' ? '🔴 En vivo' : state === 'upcoming' ? '📅 Próximamente' : 'Pendiente'}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-64 md:h-full bg-muted flex items-center justify-center">
                            <Gavel className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 p-5 md:p-6 space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground font-mono mb-1">Lote {idx + 1}</p>
                          <h2 className="text-xl font-bold text-foreground">{auction.title}</h2>
                        </div>

                        {auction.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{auction.description}</p>
                        )}

                        <div className="flex flex-wrap gap-3">
                          {auction.condition && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{CONDITION_LABELS[auction.condition] || auction.condition}</span>
                            </div>
                          )}
                          {auction.dimensions && (
                            <div className="text-sm text-muted-foreground">
                              {[auction.dimensions.height, auction.dimensions.width, auction.dimensions.pot_size].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>

                        <Separator />

                        <div className="flex flex-wrap gap-6">
                          <div>
                            <p className="text-xs text-muted-foreground">Precio salida</p>
                            <p className="text-lg font-bold text-foreground">{auction.starting_price.toFixed(2)} €</p>
                          </div>
                          {/* Buy-now disabled for auctions per PRD */}
                          <div>
                            <p className="text-xs text-muted-foreground">Incremento</p>
                            <p className="text-sm font-medium">{auction.bid_increment.toFixed(2)} €</p>
                          </div>
                          {auction.reserve_price && (
                            <div>
                              <p className="text-xs text-muted-foreground">Reserva</p>
                              <p className="text-sm font-medium text-muted-foreground">Sí</p>
                            </div>
                          )}
                        </div>

                        {auction.starts_at && (
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <CalIcon className="h-3.5 w-3.5" />
                              {format(new Date(auction.starts_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                            </div>
                            {auction.ends_at && (
                              <>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  {format(new Date(auction.ends_at), "dd MMM yyyy HH:mm", { locale: es })}
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {state === 'upcoming' && auction.starts_at && (
                          <p className="text-xs text-primary font-medium">
                            Comienza en {formatDistanceToNow(new Date(auction.starts_at), { locale: es })}
                          </p>
                        )}

                        <Button variant="outline" size="sm" className="w-fit mt-2">
                          Ver lote <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                  </Link>

                  {/* Bidding panel for live auctions */}
                  {state === 'live' && (
                    <BiddingPanel auctionId={auction.id} auctionTitle={auction.title} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AuctionPreview;
