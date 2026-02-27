import { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useOwnedPlant } from '@/hooks/collection/useOwnedPlants';
import { useObservations, useDeleteObservation, type Observation } from '@/hooks/collection/useObservations';
import { usePublicSlug, useCreatePublicSlug, useTogglePublicSharing } from '@/hooks/collection/usePublicSharing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  ArrowLeft, Loader2, Plus, Share2, ExternalLink, Copy, Check,
  Camera, Clock, Leaf,
} from 'lucide-react';
import { toast } from 'sonner';
import EntryComposer from '@/components/collection/EntryComposer';
import TimelineEntry from '@/components/garden/TimelineEntry';
import TimelineFilters, { type TimelineFilterState, EMPTY_FILTERS, hasActiveFilters } from '@/components/garden/TimelineFilters';
import { SpeciesInsightCard } from '@/components/garden/SpeciesInsightsWidget';
import { useSpeciesInsight } from '@/hooks/garden/useSpeciesInsights';
import { parseISO } from 'date-fns';

/* ─── Filter helpers ─── */

function parseFiltersFromURL(sp: URLSearchParams): TimelineFilterState {
  return {
    search: sp.get('q') || '',
    condition: sp.get('condition') || 'all',
    dateFrom: sp.get('from') || '',
    dateTo: sp.get('to') || '',
  };
}

function filtersToParams(f: TimelineFilterState): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.search) p.q = f.search;
  if (f.condition && f.condition !== 'all') p.condition = f.condition;
  if (f.dateFrom) p.from = f.dateFrom;
  if (f.dateTo) p.to = f.dateTo;
  return p;
}

function applyFilters(observations: Observation[], filters: TimelineFilterState): Observation[] {
  let result = observations;

  if (filters.condition && filters.condition !== 'all') {
    result = result.filter((o) => o.condition === filters.condition);
  }

  if (filters.search && filters.search.length >= 2) {
    const q = filters.search.toLowerCase();
    result = result.filter((o) => o.notes?.toLowerCase().includes(q));
  }

  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? parseISO(filters.dateFrom) : new Date('1970-01-01');
    const to = filters.dateTo ? parseISO(filters.dateTo) : new Date('2099-12-31');
    result = result.filter((o) => {
      const d = parseISO(o.observation_date);
      return d >= from && d <= to;
    });
  }

  return result;
}

/* ─── Page ─── */

const LogDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: plant, isLoading: plantLoading } = useOwnedPlant(id);
  const { data: observations, isLoading: obsLoading } = useObservations(id);
  const { data: publicSlug } = usePublicSlug(id);
  const createPublicSlug = useCreatePublicSlug();
  const togglePublic = useTogglePublicSharing();
  const deleteObservation = useDeleteObservation();

  const { data: speciesInsight } = useSpeciesInsight(plant?.scientific_name || plant?.nickname);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Observation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* Filters from URL */
  const filters = useMemo(() => parseFiltersFromURL(searchParams), [searchParams]);

  const setFilters = useCallback((f: TimelineFilterState) => {
    const params = filtersToParams(f);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const filteredObservations = useMemo(
    () => (observations ? applyFilters(observations, filters) : []),
    [observations, filters],
  );

  const openNewEntry = () => { setEditingEntry(null); setComposerOpen(true); };
  const openEditEntry = (obs: Observation) => { setEditingEntry(obs); setComposerOpen(true); };

  const isLoading = plantLoading || obsLoading;

  const handleDeleteObs = async () => {
    if (!deleteTarget) return;
    try {
      await deleteObservation.mutateAsync(deleteTarget);
      toast.success('Observación eliminada');
    } catch { toast.error('Error al eliminar'); }
    finally { setDeleteTarget(null); }
  };

  const handleCreateSlug = async () => {
    if (!id) return;
    try { await createPublicSlug.mutateAsync(id); toast.success('Enlace público creado'); }
    catch { toast.error('Error al crear enlace'); }
  };

  const handleTogglePublic = async () => {
    if (!publicSlug || !id) return;
    try {
      await togglePublic.mutateAsync({ slugId: publicSlug.id, isPublic: !publicSlug.is_public, plantId: id });
      toast.success(publicSlug.is_public ? 'Ahora privada' : 'Ahora pública');
    } catch { toast.error('Error al cambiar visibilidad'); }
  };

  const handleCopyLink = async () => {
    if (!publicSlug) return;
    const url = `${window.location.origin}/p/${publicSlug.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const publicUrl = publicSlug ? `${window.location.origin}/log/${publicSlug.slug}` : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>
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

  const totalCount = observations?.length ?? 0;

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
                  <img src={plant.photos[0]} alt={plant.nickname} className="h-14 w-14 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center border border-border">
                    <Leaf className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">Grow Log</h1>
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
                <Button variant="outline" size="sm" onClick={handleCreateSlug} disabled={createPublicSlug.isPending} className="w-full sm:w-auto">
                  {createPublicSlug.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Crear enlace público
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="share-toggle" className="text-sm cursor-pointer">Página pública activa</Label>
                    <Switch id="share-toggle" checked={publicSlug.is_public} onCheckedChange={handleTogglePublic} disabled={togglePublic.isPending} />
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

          {/* Species insights */}
          {speciesInsight && (
            <div className="mb-6 animate-fade-in">
              <SpeciesInsightCard insight={speciesInsight} />
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Línea de tiempo · {totalCount} entradas
            </h2>

            {/* Filters */}
            {totalCount > 0 && (
              <TimelineFilters
                filters={filters}
                onChange={setFilters}
                totalCount={totalCount}
                filteredCount={filteredObservations.length}
              />
            )}

            {totalCount === 0 ? (
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
            ) : filteredObservations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-muted-foreground font-medium">Sin resultados</p>
                  <p className="text-xs text-muted-foreground mt-1">Prueba ajustando los filtros</p>
                  <Button onClick={() => setFilters(EMPTY_FILTERS)} variant="ghost" size="sm" className="mt-3 text-xs">
                    Limpiar filtros
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />
                <div className="space-y-4">
                  {filteredObservations.map((obs, idx) => (
                    <TimelineEntry
                      key={obs.id}
                      observation={obs}
                      isFirst={idx === 0}
                      onEdit={() => openEditEntry(obs)}
                      onDelete={() => setDeleteTarget(obs.id)}
                      onPhotoClick={(src) => setLightboxSrc(src)}
                      searchQuery={filters.search}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <EntryComposer open={composerOpen} onOpenChange={setComposerOpen} plants={plant ? [plant] : []} preselectedPlantId={id} editingEntry={editingEntry} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar observación?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminarán los datos y fotos de esta entrada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteObs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteObservation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95 border-none">
          <VisuallyHidden><DialogTitle>Foto</DialogTitle></VisuallyHidden>
          {lightboxSrc && <img src={lightboxSrc} alt="Observación" className="w-full h-auto max-h-[80vh] object-contain rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogDetailPage;
