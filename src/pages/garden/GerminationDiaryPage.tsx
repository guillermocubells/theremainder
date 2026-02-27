import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Plus, Loader2, Sprout, Trash2, Pencil, TrendingUp,
  Clock, BarChart3, Calendar,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useGerminationBatches,
  useDeleteBatch,
  useUpdateBatch,
  computeSpeciesStats,
  type GerminationBatch,
} from '@/hooks/garden/useGerminationDiary';
import GerminationBatchDialog from '@/components/garden/GerminationBatchDialog';
import GerminationEntryDialog from '@/components/garden/GerminationEntryDialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

const GerminationDiaryPage = () => {
  const { data: batches, isLoading } = useGerminationBatches();
  const deleteBatch = useDeleteBatch();
  const updateBatch = useUpdateBatch();

  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<GerminationBatch | null>(null);
  const [entryDialogBatchId, setEntryDialogBatchId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(false);

  const speciesStats = useMemo(
    () => (batches ? computeSpeciesStats(batches) : []),
    [batches],
  );

  const openNewBatch = () => { setEditingBatch(null); setBatchDialogOpen(true); };
  const openEditBatch = (b: GerminationBatch) => { setEditingBatch(b); setBatchDialogOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBatch.mutateAsync(deleteTarget);
      toast.success('Lote eliminado');
    } catch { toast.error('Error al eliminar'); }
    finally { setDeleteTarget(null); }
  };

  const handleEndBatch = async (b: GerminationBatch) => {
    try {
      await updateBatch.mutateAsync({ id: b.id, ended_at: new Date().toISOString().split('T')[0] });
      toast.success('Lote finalizado');
    } catch { toast.error('Error'); }
  };

  /* ─── Chart data ─── */
  const chartDataRate = speciesStats.map((s) => ({
    name: s.species.length > 18 ? s.species.slice(0, 16) + '…' : s.species,
    tasa: s.avgRate,
    lotes: s.batchCount,
  }));

  const chartDataDays = speciesStats
    .filter((s) => s.avgDaysToSprout != null)
    .map((s) => ({
      name: s.species.length > 18 ? s.species.slice(0, 16) + '…' : s.species,
      días: s.avgDaysToSprout,
    }));

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Link
            to="/garden"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm mb-5 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Mi jardín
          </Link>

          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Sprout className="h-7 w-7 text-primary" />
                Diario de Germinación
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Registra tus lotes, observa brotes y mide el éxito por especie.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCharts(!showCharts)}
                className={cn(showCharts && 'bg-primary/10')}
              >
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Gráficas
              </Button>
              <Button size="sm" onClick={openNewBatch}>
                <Plus className="h-4 w-4 mr-1.5" />
                Nuevo lote
              </Button>
            </div>
          </div>

          {/* Charts section */}
          {showCharts && speciesStats.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4 mb-8 animate-fade-in">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    Tasa de germinación por especie (%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartDataRate}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ borderRadius: '0.5rem', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => [`${value}%`, 'Tasa']}
                      />
                      <Bar dataKey="tasa" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Días promedio al primer brote
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartDataDays}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{ borderRadius: '0.5rem', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => [`${value} días`, 'Promedio']}
                      />
                      <Bar dataKey="días" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Batch list */}
          {(!batches || batches.length === 0) ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Sprout className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">Sin lotes de germinación</p>
                <p className="text-xs text-muted-foreground mt-1">Crea tu primer lote para empezar a registrar</p>
                <Button onClick={openNewBatch} variant="outline" size="sm" className="mt-4">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Primer lote
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {batches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  onEdit={() => openEditBatch(batch)}
                  onDelete={() => setDeleteTarget(batch.id)}
                  onAddEntry={() => setEntryDialogBatchId(batch.id)}
                  onEnd={() => handleEndBatch(batch)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Dialogs */}
      <GerminationBatchDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        editing={editingBatch}
      />

      {entryDialogBatchId && (
        <GerminationEntryDialog
          open={!!entryDialogBatchId}
          onOpenChange={(open) => !open && setEntryDialogBatchId(null)}
          batchId={entryDialogBatchId}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lote?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas las observaciones asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ─── Batch Card ─── */

interface BatchCardProps {
  batch: GerminationBatch;
  onEdit: () => void;
  onDelete: () => void;
  onAddEntry: () => void;
  onEnd: () => void;
}

const BatchCard = ({ batch, onEdit, onDelete, onAddEntry, onEnd }: BatchCardProps) => {
  const isActive = !batch.ended_at;
  const daysSinceStart = differenceInDays(new Date(), new Date(batch.started_at));
  const rate = batch.germination_rate ?? 0;

  // Timeline mini-chart data
  const timelineData = useMemo(() => {
    if (!batch.entries || batch.entries.length === 0) return [];
    let cumulative = 0;
    return batch.entries.map((e) => {
      cumulative += e.sprout_count;
      return {
        day: differenceInDays(new Date(e.observed_at), new Date(batch.started_at)),
        brotes: cumulative,
      };
    });
  }, [batch]);

  return (
    <Card className={cn(
      'transition-shadow hover:shadow-md',
      isActive && 'ring-1 ring-success/20',
    )}>
      <CardContent className="p-4 sm:p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{batch.species_name}</h3>
              {batch.common_name && (
                <span className="text-xs text-muted-foreground">({batch.common_name})</span>
              )}
              <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                {isActive ? 'Activo' : 'Finalizado'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(batch.started_at), 'd MMM yyyy', { locale: es })}
              </span>
              <span>{batch.seed_count} semillas</span>
              <span className="capitalize">{batch.method.replace('_', ' ')}</span>
              {isActive && <span>· Día {daysSinceStart}</span>}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isActive && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddEntry} title="Registrar brotes">
                <Sprout className="h-3.5 w-3.5 text-success" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{rate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasa</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{batch.total_sprouts ?? 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Brotes</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">
              {batch.days_to_first_sprout != null ? `${batch.days_to_first_sprout}d` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">1er brote</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{batch.total_sprouts ?? 0} / {batch.seed_count} germinadas</span>
            <span>{rate}%</span>
          </div>
          <Progress value={rate} className="h-2" />
        </div>

        {/* Mini sprout timeline */}
        {timelineData.length > 1 && (
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis hide domain={[0, 'auto']} />
                <Line
                  type="monotone"
                  dataKey="brotes"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--success))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* End batch button */}
        {isActive && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={onEnd} className="text-xs">
              Finalizar lote
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GerminationDiaryPage;
