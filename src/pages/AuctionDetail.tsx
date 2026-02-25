import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSEO } from '@/components/seo';
import BiddingPanel from '@/components/auction/BiddingPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Gavel, ChevronLeft, ChevronRight, Tag, Ruler, MapPin, FileText,
  ArrowLeft, Calendar as CalIcon, Clock, Info, Shield, ZoomIn,
} from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
}

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excelente',
  good: 'Bueno',
  fair: 'Aceptable',
  needs_care: 'Necesita cuidados',
};

const AuctionDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [currentImg, setCurrentImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
    refetchInterval: 15000,
  });

  const images = auction?.images ?? [];
  const hasImages = images.length > 0;

  const getState = () => {
    if (!auction) return 'pending';
    if (auction.status === 'draft') return 'draft';
    if (auction.starts_at && isFuture(new Date(auction.starts_at))) return 'upcoming';
    if (auction.ends_at && isPast(new Date(auction.ends_at))) return 'ended';
    if (auction.status === 'live') return 'live';
    return auction.status;
  };

  const state = auction ? getState() : 'pending';

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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* LEFT: Gallery + details */}
          <div className="lg:col-span-3 space-y-6">
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
                  {/* State badge */}
                  <div className="absolute top-3 left-3">
                    <Badge
                      variant={state === 'live' ? 'default' : 'secondary'}
                      className={cn('text-xs', state === 'live' && 'animate-pulse')}
                    >
                      {state === 'live' ? '🔴 En vivo' : state === 'upcoming' ? '📅 Próximamente' : state === 'ended' ? 'Finalizada' : auction.status}
                    </Badge>
                  </div>
                  {/* Zoom hint */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2">
                      <ZoomIn className="h-4 w-4 text-foreground" />
                    </div>
                  </div>
                  {/* Nav arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prevImg(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextImg(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  {/* Counter */}
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
              </div>
            )}

            {/* Lot info */}
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{auction.title}</h1>
                {auction.description && (
                  <p className="text-muted-foreground leading-relaxed">{auction.description}</p>
                )}
              </div>

              <Separator />

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {auction.condition && (
                  <DetailItem icon={<Tag className="h-4 w-4" />} label="Estado" value={CONDITION_LABELS[auction.condition] || auction.condition} />
                )}
                {auction.dimensions?.height && (
                  <DetailItem icon={<Ruler className="h-4 w-4" />} label="Altura" value={auction.dimensions.height} />
                )}
                {auction.dimensions?.width && (
                  <DetailItem icon={<Ruler className="h-4 w-4" />} label="Ancho" value={auction.dimensions.width} />
                )}
                {auction.dimensions?.pot_size && (
                  <DetailItem icon={<Info className="h-4 w-4" />} label="Maceta" value={auction.dimensions.pot_size} />
                )}
                {auction.provenance && (
                  <DetailItem icon={<MapPin className="h-4 w-4" />} label="Procedencia" value={auction.provenance} />
                )}
                {auction.deposit_amount != null && auction.deposit_amount > 0 && (
                  <DetailItem icon={<Shield className="h-4 w-4" />} label="Depósito" value={`${auction.deposit_amount.toFixed(2)} €`} />
                )}
              </div>

              {/* Dates */}
              {(auction.starts_at || auction.ends_at) && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-6 text-sm">
                    {auction.starts_at && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalIcon className="h-4 w-4" />
                        <div>
                          <span className="text-xs block">Inicio</span>
                          <span className="text-foreground font-medium">
                            {format(new Date(auction.starts_at), "dd MMM yyyy · HH:mm", { locale: es })}
                          </span>
                        </div>
                      </div>
                    )}
                    {auction.ends_at && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <div>
                          <span className="text-xs block">Cierre</span>
                          <span className="text-foreground font-medium">
                            {format(new Date(auction.ends_at), "dd MMM yyyy · HH:mm", { locale: es })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Seller notes */}
              {auction.seller_notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                      <FileText className="h-4 w-4" /> Notas del vendedor
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{auction.seller_notes}</p>
                  </div>
                </>
              )}

              {/* Provenance docs */}
              {auction.provenance_documents && auction.provenance_documents.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Documentos de procedencia</h3>
                    <div className="flex flex-wrap gap-2">
                      {auction.provenance_documents.map((doc, i) => (
                        <a
                          key={i}
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline"
                        >
                          Documento {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Las pujas se abrirán cuando comience la subasta.
                    </p>
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
                      Pujas en tiempo real con extensión anti-sniping de 5 min.
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      Los depósitos se devuelven automáticamente a los no ganadores.
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      Vendedores verificados y documentación de procedencia.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {hasImages && (
              <img
                src={images[currentImg]}
                alt={`${auction.title} – foto ${currentImg + 1}`}
                className="max-h-[85vh] max-w-full object-contain"
              />
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImg}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={nextImg}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImg(i)}
                      className={cn(
                        'w-2 h-2 rounded-full transition-all',
                        i === currentImg ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
                      )}
                    />
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
