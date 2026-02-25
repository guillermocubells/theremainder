import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSEO } from '@/components/seo';
import BiddingPanel from '@/components/auction/BiddingPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Gavel, ChevronLeft, ChevronRight, Tag, Ruler, MapPin, FileText,
  ArrowLeft, Calendar as CalIcon, Clock, Info, Shield, ZoomIn, Heart,
  Truck, AlertTriangle, User, Video,
} from 'lucide-react';
import { format, isPast, isFuture, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface AuctionFull {
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
  total_bids: number;
  deposit_amount: number | null;
  reserve_met: boolean;
  currency: string;
  meta_title: string | null;
  meta_description: string | null;
  seller_notes: string | null;
  provenance_documents: string[] | null;
  winner_user_id: string | null;
  seller_user_id: string | null;
}

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excelente',
  good: 'Bueno',
  fair: 'Aceptable',
  needs_care: 'Necesita cuidados',
};

const AuctionDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [currentImg, setCurrentImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  const { data: auction, isLoading, error } = useQuery({
    queryKey: ['auction-detail', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auctions' as any)
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as unknown as AuctionFull;
    },
    enabled: !!slug,
    refetchInterval: 3000,
  });

  // Parse seller metadata from seller_notes JSON
  const sellerMeta = useMemo(() => {
    if (!auction?.seller_notes) return null;
    try { return JSON.parse(auction.seller_notes); } catch { return null; }
  }, [auction?.seller_notes]);

  const images = auction?.images ?? [];
  const hasImages = images.length > 0;
  const hasVideos = auction?.videos && auction.videos.length > 0;

  const getState = () => {
    if (!auction) return 'pending';
    if (auction.status === 'draft') return 'draft';
    if (auction.starts_at && isFuture(new Date(auction.starts_at))) return 'upcoming';
    if (auction.ends_at && isPast(new Date(auction.ends_at))) return 'ended';
    if (auction.status === 'live') return 'live';
    return auction.status;
  };

  const state = auction ? getState() : 'pending';
  const isWinner = state === 'ended' && auction?.winner_user_id === user?.id;
  const isSold = state === 'ended' && auction?.reserve_met && auction.winner_user_id;
  const isUnsold = state === 'ended' && !auction?.reserve_met;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <div className="flex gap-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="w-20 h-20 rounded-lg" />)}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Gavel className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Subasta no encontrada</h1>
          <p className="text-muted-foreground mb-6">El lote que buscas no existe o ya no está disponible.</p>
          <Button variant="outline" asChild>
            <Link to="/subastas"><ArrowLeft className="h-4 w-4 mr-2" /> Ver subastas</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const prevImg = () => setCurrentImg(p => (p - 1 + images.length) % images.length);
  const nextImg = () => setCurrentImg(p => (p + 1) % images.length);

  // Seller alias anonymized
  const sellerAlias = auction.seller_user_id ? `Vendedor ···${auction.seller_user_id.slice(-4)}` : 'Vendedor';

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title={auction.meta_title || `${auction.title} – Subasta`}
        description={auction.meta_description || auction.description?.slice(0, 160) || 'Subasta de ejemplar exclusivo.'}
      />
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/subastas" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Subastas
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate">{auction.title}</span>
        </nav>

        {/* Post-end banners */}
        {isWinner && (
          <div className="mb-6 bg-primary/10 border border-primary/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-primary">🎉 ¡Has ganado esta subasta!</p>
              <p className="text-sm text-muted-foreground">Precio final: {auction.current_price.toFixed(2)} €</p>
            </div>
            <Button asChild>
              <Link to="/checkout">Proceder al pago</Link>
            </Button>
          </div>
        )}
        {state === 'ended' && !isWinner && (
          <div className="mb-6 bg-muted/50 border border-border rounded-xl p-4 text-center">
            <p className="font-semibold text-foreground">
              {isSold ? `Vendida por ${auction.current_price.toFixed(2)} €` : 'Subasta finalizada — Reserva no alcanzada'}
            </p>
            {isSold && auction.winner_user_id && (
              <p className="text-xs text-muted-foreground mt-1">Ganador: ···{auction.winner_user_id.slice(-4)}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* LEFT: Gallery + details */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header with seller info & watchlist */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{sellerAlias}</span>
                {sellerMeta?.location_country && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {sellerMeta.location_country}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWatchlisted(!watchlisted)}
                className={cn(watchlisted && 'text-destructive')}
              >
                <Heart className={cn('h-4 w-4', watchlisted && 'fill-current')} />
              </Button>
            </div>

            {/* Main image */}
            <div className="relative group">
              {hasImages ? (
                <>
                  <div
                    className="aspect-[4/3] rounded-xl overflow-hidden bg-muted cursor-zoom-in"
                    onClick={() => setLightboxOpen(true)}
                  >
                    <img
                      src={images[currentImg]}
                      alt={`${auction.title} – foto ${currentImg + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge
                      variant={state === 'live' ? 'default' : 'secondary'}
                      className={cn('text-xs', state === 'live' && 'animate-pulse')}
                    >
                      {state === 'live' ? '🔴 En vivo' : state === 'upcoming' ? '📅 Próximamente' : state === 'ended' ? 'Finalizada' : auction.status}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2"><ZoomIn className="h-4 w-4 text-foreground" /></div>
                  </div>
                  {images.length > 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); prevImg(); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft className="h-5 w-5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); nextImg(); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-5 w-5" /></button>
                    </>
                  )}
                  {images.length > 1 && (
                    <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-foreground">
                      {currentImg + 1} / {images.length}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-[4/3] rounded-xl bg-muted flex items-center justify-center">
                  <Gavel className="h-16 w-16 text-muted-foreground/20" />
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImg(i)}
                    className={cn(
                      'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all',
                      i === currentImg ? 'border-primary ring-1 ring-primary/30' : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <img src={img} alt={`Miniatura ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
                {/* Video tab indicator */}
                {hasVideos && (
                  <button
                    onClick={() => setActiveTab('description')}
                    className="flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                  >
                    <Video className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{auction.title}</h1>
              {/* Taxonomy chips */}
              {sellerMeta && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sellerMeta.genus && <Badge variant="outline" className="text-xs">{sellerMeta.genus}</Badge>}
                  {sellerMeta.species && <Badge variant="outline" className="text-xs">{sellerMeta.species}</Badge>}
                  {sellerMeta.cultivar && <Badge variant="outline" className="text-xs">{sellerMeta.cultivar}</Badge>}
                  {sellerMeta.common_name && <Badge variant="secondary" className="text-xs">{sellerMeta.common_name}</Badge>}
                  {sellerMeta.hardiness_zone && <Badge variant="secondary" className="text-xs">Zona {sellerMeta.hardiness_zone}</Badge>}
                </div>
              )}
            </div>

            {/* Tabs: Description, Shipping, Bids, Seller */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="description">Descripción</TabsTrigger>
                <TabsTrigger value="shipping">Envío</TabsTrigger>
                <TabsTrigger value="bids">Pujas</TabsTrigger>
                <TabsTrigger value="seller">Vendedor</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="space-y-5 pt-4">
                {auction.description && <p className="text-muted-foreground leading-relaxed">{auction.description}</p>}

                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {auction.condition && <DetailItem icon={<Tag className="h-4 w-4" />} label="Estado" value={CONDITION_LABELS[auction.condition] || auction.condition} />}
                  {auction.dimensions?.height && <DetailItem icon={<Ruler className="h-4 w-4" />} label="Altura" value={auction.dimensions.height} />}
                  {auction.dimensions?.width && <DetailItem icon={<Ruler className="h-4 w-4" />} label="Ancho" value={auction.dimensions.width} />}
                  {auction.dimensions?.pot_size && <DetailItem icon={<Info className="h-4 w-4" />} label="Maceta" value={auction.dimensions.pot_size} />}
                  {auction.dimensions?.age_size && <DetailItem icon={<Info className="h-4 w-4" />} label="Edad/Tamaño" value={auction.dimensions.age_size} />}
                  {auction.provenance && <DetailItem icon={<MapPin className="h-4 w-4" />} label="Procedencia" value={auction.provenance} />}
                </div>

                {/* Videos */}
                {hasVideos && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Video className="h-4 w-4" /> Vídeo</h3>
                    {auction.videos!.map((v, i) => (
                      <a key={i} href={v} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">{v}</a>
                    ))}
                  </div>
                )}

                {/* Provenance docs */}
                {auction.provenance_documents && auction.provenance_documents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Documentos de procedencia</h3>
                    <div className="flex flex-wrap gap-2">
                      {auction.provenance_documents.map((doc, i) => (
                        <a key={i} href={doc} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1 bg-muted rounded px-2 py-1">
                          <FileText className="h-3 w-3" /> Documento {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                {(auction.starts_at || auction.ends_at) && (
                  <div className="flex flex-wrap gap-6 text-sm">
                    {auction.starts_at && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalIcon className="h-4 w-4" />
                        <div>
                          <span className="text-xs block">Inicio (CET)</span>
                          <span className="text-foreground font-medium">{format(new Date(auction.starts_at), "dd MMM yyyy · HH:mm", { locale: es })}</span>
                        </div>
                      </div>
                    )}
                    {auction.ends_at && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <div>
                          <span className="text-xs block">Cierre (CET)</span>
                          <span className="text-foreground font-medium">{format(new Date(auction.ends_at), "dd MMM yyyy · HH:mm", { locale: es })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="shipping" className="space-y-4 pt-4">
                {sellerMeta ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem icon={<Truck className="h-4 w-4" />} label="Coste envío" value={`${sellerMeta.shipping_cost?.toFixed(2) ?? '—'} €`} />
                      <DetailItem icon={<Clock className="h-4 w-4" />} label="Preparación" value={sellerMeta.handling_time || '—'} />
                      <DetailItem icon={<MapPin className="h-4 w-4" />} label="Envío" value={sellerMeta.shipping_eu_only ? 'Solo UE' : 'Internacional'} />
                      {sellerMeta.excluded_countries && <DetailItem icon={<Info className="h-4 w-4" />} label="Excluidos" value={sellerMeta.excluded_countries} />}
                    </div>
                    {sellerMeta.shipping_tiers && (
                      <p className="text-xs text-muted-foreground">{sellerMeta.shipping_tiers}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Información de envío no disponible. Contacte al vendedor.</p>
                )}
                {/* Legal notice */}
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-medium">Aviso legal</p>
                      <p>Las compras en subasta están exentas del derecho de desistimiento conforme al art. 103.m) del RDL 1/2007 (España) y la Directiva 2011/83/UE.</p>
                      <p>Las devoluciones no son aplicables a lotes adquiridos en subasta.</p>
                      <Link to="/terminos-de-venta" className="text-primary underline">Ver términos completos</Link>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bids" className="pt-4">
                <p className="text-xs text-muted-foreground mb-3">Historial público de pujas (IDs anonimizados, hora CET).</p>
                {/* Bid history is shown in the BiddingPanel, but we also show a full view here */}
                <BidHistoryFull auctionId={auction.id} userId={user?.id} />
              </TabsContent>

              <TabsContent value="seller" className="space-y-3 pt-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{sellerAlias}</span>
                </div>
                {sellerMeta?.location_country && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{sellerMeta.location_country}{sellerMeta.location_region ? `, ${sellerMeta.location_region}` : ''}</p>
                )}
                <p className="text-xs text-muted-foreground">Vendedor verificado. Todos los vendedores completan un proceso de verificación KYC antes de poder crear subastas.</p>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: Bidding panel */}
          <div className="lg:col-span-2">
            <div className="sticky top-4 space-y-4">
              {(state === 'live' || state === 'ended' || state === 'upcoming') && (
                <BiddingPanel auctionId={auction.id} auctionTitle={auction.title} />
              )}

              {state === 'upcoming' && (
                <Card>
                  <CardContent className="py-6 text-center">
                    <CalIcon className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="text-sm font-medium text-foreground">Subasta programada</p>
                    <p className="text-xs text-muted-foreground mt-1">Las pujas se abrirán cuando comience la subasta.</p>
                  </CardContent>
                </Card>
              )}

              {/* Trust info */}
              <Card className="border-dashed">
                <CardContent className="py-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Información</p>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      Pujas en tiempo real con extensión anti-sniping de 2 min.
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      Los depósitos se devuelven automáticamente a los no ganadores.
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      Sin prima de comprador. 6% comisión al vendedor.
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      Vendedores verificados con documentación de procedencia.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky mobile bid bar */}
      {isMobile && state === 'live' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 z-50 shadow-lg">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <p className="text-xs text-muted-foreground">Puja actual</p>
              <p className="text-lg font-bold text-foreground">{auction.current_price.toFixed(2)} €</p>
            </div>
            <Button asChild>
              <a href="#bidding-panel"><Gavel className="h-4 w-4 mr-1" /> Pujar</a>
            </Button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {hasImages && (
              <img src={images[currentImg]} alt={`${auction.title} – foto ${currentImg + 1}`} className="max-h-[85vh] max-w-full object-contain" />
            )}
            {images.length > 1 && (
              <>
                <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"><ChevronLeft className="h-6 w-6 text-white" /></button>
                <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"><ChevronRight className="h-6 w-6 text-white" /></button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setCurrentImg(i)} className={cn('w-2 h-2 rounded-full transition-all', i === currentImg ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60')} />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

/** Full bid history for the Bids tab */
const BidHistoryFull = ({ auctionId, userId }: { auctionId: string; userId?: string }) => {
  const { data: bids } = useQuery({
    queryKey: ['auction-bids-full', auctionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
  });

  if (!bids || bids.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay pujas.</p>;
  }

  return (
    <div className="space-y-1.5">
      {bids.map((bid: any, i: number) => (
        <div key={bid.id} className={cn('flex items-center justify-between text-sm py-1.5 px-2 rounded', i === 0 && 'bg-primary/5 font-medium')}>
          <span className="text-xs text-muted-foreground">
            {bid.user_id === userId ? 'Tú' : `Postor ···${bid.user_id.slice(-4)}`}
          </span>
          <div className="flex items-center gap-3">
            <span className={cn('font-medium', i === 0 ? 'text-primary' : 'text-foreground')}>{Number(bid.amount).toFixed(2)} €</span>
            <span className="text-xs text-muted-foreground">{format(new Date(bid.created_at), 'dd MMM HH:mm', { locale: es })}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <div className="text-muted-foreground mt-0.5">{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

export default AuctionDetail;
