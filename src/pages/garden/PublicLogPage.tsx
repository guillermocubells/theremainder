import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicLog } from '@/hooks/collection/usePublicSharing';
import PageSEO from '@/components/seo/PageSEO';
import BreadcrumbStructuredData from '@/components/seo/BreadcrumbStructuredData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Leaf, Loader2, Clock, Calendar, Camera } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { conditionConfig } from '@/components/garden/TimelineEntry';

/* ─── Read-only timeline entry ─── */

interface PublicObservation {
  id: string;
  observation_date: string;
  condition: string;
  notes: string | null;
  photos: string[] | null;
}

const ReadOnlyEntry = ({
  obs,
  isFirst,
  onPhotoClick,
}: {
  obs: PublicObservation;
  isFirst: boolean;
  onPhotoClick: (src: string) => void;
}) => {
  const config = conditionConfig[obs.condition] ?? conditionConfig.healthy;
  const obsDate = new Date(obs.observation_date);

  return (
    <div className="relative flex gap-4 animate-fade-in">
      <div className="relative z-10 mt-1.5 flex-shrink-0">
        <div className={cn('h-[10px] w-[10px] rounded-full ring-4 ring-background', config.dot)} />
      </div>

      <Card className={cn('flex-1', isFirst && 'ring-1 ring-primary/20')}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('text-xs', config.color)}>{config.label}</Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(obsDate, 'd MMM yyyy', { locale: es })}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · {formatDistanceToNow(obsDate, { addSuffix: true, locale: es })}
            </span>
          </div>

          {obs.notes && (
            <p className="text-sm text-foreground leading-relaxed">{obs.notes}</p>
          )}

          {obs.photos && obs.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {obs.photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => onPhotoClick(photo)}
                  className="relative group rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-colors"
                >
                  <img src={photo} alt={`Foto ${i + 1}`} className="h-20 w-20 sm:h-24 sm:w-24 object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Camera className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Status labels ─── */

const statusLabels: Record<string, string> = {
  alive: 'Viva',
  dormant: 'Latente',
  sick: 'Necesita cuidados',
  removed: 'Retirada',
};

/* ─── Page ─── */

const PublicLogPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: log, isLoading, error } = usePublicLog(slug);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!log || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Log no encontrado</h1>
            <p className="text-muted-foreground">
              Este grow log no existe o no está compartido públicamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = log.nickname;
  const speciesName = log.scientific_name || log.common_name;
  const pageTitle = `Grow Log · ${displayName}${speciesName ? ` (${speciesName})` : ''}`;
  const pageDesc = `Grow log público de ${displayName}${speciesName ? `, ${speciesName}` : ''} — ${log.observations.length} observaciones registradas.`;
  const ogImage = log.photos?.[0] || log.observations.find((o: PublicObservation) => o.photos?.length)?.photos?.[0];

  const breadcrumbs = [
    { name: 'Inicio', url: '/' },
    { name: 'Grow Log', url: `/log/${slug}` },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: pageTitle,
    description: pageDesc,
    ...(ogImage && { image: ogImage }),
    datePublished: log.observations[log.observations.length - 1]?.observation_date,
    dateModified: log.observations[0]?.observation_date,
  };

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title={pageTitle}
        description={pageDesc}
        path={`/log/${slug}`}
        ogImage={ogImage}
        ogType="article"
        jsonLd={jsonLd}
        noindex={false}
      />
      <BreadcrumbStructuredData items={breadcrumbs} />

      {/* Header bar */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-primary">
            <Leaf className="h-5 w-5" />
            <span className="font-semibold text-sm">The Remainder</span>
          </div>
        </div>
      </div>

      <main className="container max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* Plant header */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl p-5 sm:p-6 border border-border mb-6 animate-fade-in">
          <div className="flex items-center gap-4">
            {log.photos?.[0] ? (
              <img
                src={log.photos[0]}
                alt={displayName}
                className="h-16 w-16 rounded-xl object-cover border border-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center border border-border">
                <Leaf className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{displayName}</h1>
              {speciesName && (
                <p className="text-sm text-muted-foreground italic">{speciesName}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className="text-xs">
                  {statusLabels[log.status] || log.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {log.observations.length} observaciones
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Línea de tiempo
          </h2>

          {log.observations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Camera className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">Sin observaciones publicadas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />
              <div className="space-y-4">
                {log.observations.map((obs: PublicObservation, idx: number) => (
                  <ReadOnlyEntry
                    key={obs.id}
                    obs={obs}
                    isFirst={idx === 0}
                    onPhotoClick={setLightboxSrc}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <div className="border-t border-border py-6 mt-8">
        <p className="text-center text-sm text-muted-foreground">
          Grow log compartido con{' '}
          <a
            href="https://theremainder.lovable.app"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            The Remainder
          </a>
        </p>
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95 border-none">
          <VisuallyHidden><DialogTitle>Foto</DialogTitle></VisuallyHidden>
          {lightboxSrc && (
            <img src={lightboxSrc} alt="Observación" className="w-full h-auto max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicLogPage;
