import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOwnedPlant } from '@/hooks/collection/useOwnedPlants';
import { useObservations, useDeleteObservation, type Observation } from '@/hooks/collection/useObservations';
import { usePublicSlug, useCreatePublicSlug, useTogglePublicSharing } from '@/hooks/collection/usePublicSharing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  ArrowLeft, Loader2, Plus, Trash2, Share2, ExternalLink, Copy, Check,
  Calendar, Camera, Pencil, Clock, Leaf,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import EntryComposer from '@/components/collection/EntryComposer';
import { cn } from '@/lib/utils';

const conditionConfig: Record<string, { label: string; color: string; dot: string }> = {
  healthy: { label: 'Saludable', color: 'bg-success-muted text-success-muted-foreground', dot: 'bg-success' },
  okay: { label: 'Aceptable', color: 'bg-warning-muted text-warning-muted-foreground', dot: 'bg-warning' },
  concern: { label: 'Preocupante', color: 'bg-caution-muted text-caution-muted-foreground', dot: 'bg-caution' },
  critical: { label: 'Crítico', color: 'bg-danger-muted text-danger-muted-foreground', dot: 'bg-danger' },
};

const LogDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: plant, isLoading: plantLoading } = useOwnedPlant(id);
  const { data: observations, isLoading: obsLoading } = useObservations(id);
  const { data: publicSlug } = usePublicSlug(id);
  const createPublicSlug = useCreatePublicSlug();
  const togglePublic = useTogglePublicSharing();
  const deleteObservation = useDeleteObservation();

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Observation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const openNewEntry = () => {
    setEditingEntry(null);
    setComposerOpen(true);
  };

  const openEditEntry = (obs: Observation) => {
    setEditingEntry(obs);
    setComposerOpen(true);
  };

  const isLoading = plantLoading || obsLoading;

  const handleDeleteObs = async () => {
    if (!deleteTarget) return;
    try {
      await deleteObservation.mutateAsync(deleteTarget);
      toast.success('Observación eliminada');
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCreateSlug = async () => {
    if (!id) return;
    try {
      await createPublicSlug.mutateAsync(id);
      toast.success('Enlace público creado');
    } catch {
      toast.error('Error al crear enlace');
    }
  };

  const handleTogglePublic = async () => {
    if (!publicSlug || !id) return;
    try {
      await togglePublic.mutateAsync({
        slugId: publicSlug.id,
        isPublic: !publicSlug.is_public,
        plantId: id,
      });
      toast.success(publicSlug.is_public ? 'Ahora privada' : 'Ahora pública');
    } catch {
      toast.error('Error al cambiar visibilidad');
    }
  };

  const handleCopyLink = async () => {
    if (!publicSlug) return;
    const url = `${window.location.origin}/p/${publicSlug.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const publicUrl = publicSlug ? `${window.location.origin}/p/${publicSlug.slug}` : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Planta no encontrada</p>
          <Link to="/garden"><Button variant="link">Volver a mi jardín</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            to={`/garden/plant/${id}`}
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm mb-5 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Volver a {plant.nickname}</span>
          </Link>

          {/* Header card */}
          <div className="bg-card/80 backdrop-blur-sm rounded-xl p-5 sm:p-6 border border-border mb-6 animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {plant.photos?.[0] ? (
                  <img
                    src={plant.photos[0]}
                    alt={plant.nickname}
                    className="h-14 w-14 rounded-xl object-cover border border-border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center border border-border">
                    <Leaf className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                    Grow Log
                  </h1>
                  <p className="text-sm text-muted-foreground italic">{plant.nickname}</p>
                </div>
              </div>

              <Button onClick={openNewEntry} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Añadir
              </Button>
            </div>

            {/* Share toggle */}
            <div className="mt-5 pt-4 border-t border-border space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Share2 className="h-4 w-4 text-primary" />
                Compartir log público
              </div>

              {!publicSlug ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateSlug}
                  disabled={createPublicSlug.isPending}
                  className="w-full sm:w-auto"
                >
                  {createPublicSlug.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Crear enlace público
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="share-toggle" className="text-sm cursor-pointer">
                      Página pública activa
                    </Label>
                    <Switch
                      id="share-toggle"
                      checked={publicSlug.is_public}
                      onCheckedChange={handleTogglePublic}
                      disabled={togglePublic.isPending}
                    />
                  </div>

                  {publicSlug.is_public && publicUrl && (
                    <div className="flex items-center gap-2">
                      <Input value={publicUrl} readOnly className="text-xs font-mono bg-muted flex-1" />
                      <Button size="icon" variant="outline" onClick={handleCopyLink} className="shrink-0">
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => window.open(publicUrl, '_blank')} className="shrink-0">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Línea de tiempo · {observations?.length ?? 0} entradas
            </h2>

            {(!observations || observations.length === 0) ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Camera className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-medium">Sin observaciones aún</p>
                  <p className="text-xs text-muted-foreground mt-1">Registra la primera entrada de tu grow log</p>
                  <Button onClick={openNewEntry} variant="outline" size="sm" className="mt-4">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Primera entrada
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />

                <div className="space-y-4">
                  {observations.map((obs, idx) => (
                    <TimelineEntry
                      key={obs.id}
                      observation={obs}
                      isFirst={idx === 0}
                      onEdit={() => openEditEntry(obs)}
                      onDelete={() => setDeleteTarget(obs.id)}
                      onPhotoClick={(src) => setLightboxSrc(src)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Entry composer */}
      <EntryComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        plants={plant ? [plant] : []}
        preselectedPlantId={id}
        editingEntry={editingEntry}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar observación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán los datos y fotos de esta entrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteObs}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteObservation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo lightbox */}
      <Dialog open={!!lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95 border-none">
          <VisuallyHidden><DialogTitle>Foto</DialogTitle></VisuallyHidden>
          {lightboxSrc && (
            <img
              src={lightboxSrc}
              alt="Observación"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Timeline Entry Component ─── */

interface TimelineEntryProps {
  observation: Observation;
  isFirst: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPhotoClick: (src: string) => void;
}

const TimelineEntry = ({ observation, isFirst, onEdit, onDelete, onPhotoClick }: TimelineEntryProps) => {
  const config = conditionConfig[observation.condition] ?? conditionConfig.healthy;
  const obsDate = new Date(observation.observation_date);
  const relativeTime = formatDistanceToNow(obsDate, { addSuffix: true, locale: es });

  return (
    <div className="relative flex gap-4 animate-fade-in">
      {/* Dot */}
      <div className="relative z-10 mt-1.5 flex-shrink-0">
        <div className={cn('h-[10px] w-[10px] rounded-full ring-4 ring-background', config.dot)} />
      </div>

      {/* Card */}
      <Card className={cn(
        'flex-1 transition-shadow hover:shadow-md',
        isFirst && 'ring-1 ring-primary/20',
      )}>
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('text-xs', config.color)}>
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(obsDate, 'd MMM yyyy', { locale: es })}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                · {relativeTime}
              </span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          {observation.notes && (
            <p className="text-sm text-foreground leading-relaxed">{observation.notes}</p>
          )}

          {/* Photos grid */}
          {observation.photos && observation.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {observation.photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => onPhotoClick(photo)}
                  className="relative group rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-colors"
                >
                  <img
                    src={photo}
                    alt={`Foto ${i + 1}`}
                    className="h-20 w-20 sm:h-24 sm:w-24 object-cover"
                    loading="lazy"
                  />
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

export default LogDetailPage;
