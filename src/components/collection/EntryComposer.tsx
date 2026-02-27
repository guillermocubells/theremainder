import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useCreateObservation,
  useUpdateObservation,
  type ObservationCondition,
  type Observation,
} from '@/hooks/collection/useObservations';
import { OwnedPlant } from '@/hooks/collection/useOwnedPlants';
import { Loader2, Star, Leaf, HeartPulse, Droplets, Scissors, Bug, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import EntryPhotoUploader from './EntryPhotoUploader';

/* ─── Types ─── */

type EntryType = 'observation' | 'watering' | 'pruning' | 'pest' | 'general';

interface EntryComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plants: OwnedPlant[];
  preselectedPlantId?: string;
  /** Pass an existing observation to edit it */
  editingEntry?: Observation | null;
}

/* ─── Config ─── */

const entryTypes: { value: EntryType; label: string; icon: React.ReactNode }[] = [
  { value: 'observation', label: 'Observación', icon: <Eye className="h-4 w-4" /> },
  { value: 'watering', label: 'Riego', icon: <Droplets className="h-4 w-4" /> },
  { value: 'pruning', label: 'Poda', icon: <Scissors className="h-4 w-4" /> },
  { value: 'pest', label: 'Plaga / Enfermedad', icon: <Bug className="h-4 w-4" /> },
  { value: 'general', label: 'General', icon: <Leaf className="h-4 w-4" /> },
];

const conditionOptions: { value: ObservationCondition; label: string; dot: string }[] = [
  { value: 'healthy', label: 'Saludable', dot: 'bg-success' },
  { value: 'okay', label: 'Aceptable', dot: 'bg-warning' },
  { value: 'concern', label: 'Preocupante', dot: 'bg-[hsl(25,80%,50%)]' },
  { value: 'critical', label: 'Crítico', dot: 'bg-destructive' },
];

const typeToConditionHint: Record<EntryType, ObservationCondition> = {
  observation: 'healthy',
  watering: 'healthy',
  pruning: 'okay',
  pest: 'concern',
  general: 'healthy',
};

/* ─── Star Rating ─── */

const StarRating = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star === value ? 0 : star)}
        className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
      >
        <Star
          className={cn(
            'h-5 w-5 transition-colors',
            star <= value
              ? 'fill-warning text-warning'
              : 'text-muted-foreground/30 hover:text-warning/50',
          )}
        />
      </button>
    ))}
  </div>
);

/* ─── Main Component ─── */

const EntryComposer = ({
  open,
  onOpenChange,
  plants,
  preselectedPlantId,
  editingEntry,
}: EntryComposerProps) => {
  const createObservation = useCreateObservation();
  const updateObservation = useUpdateObservation();

  const isEditing = !!editingEntry;

  const [entryType, setEntryType] = useState<EntryType>('observation');
  const [plantId, setPlantId] = useState(preselectedPlantId || '');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split('T')[0]);
  const [condition, setCondition] = useState<ObservationCondition>('healthy');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);

  // Populate form when editing
  useEffect(() => {
    if (editingEntry) {
      setPlantId(editingEntry.owned_plant_id);
      setOccurredAt(editingEntry.observation_date);
      setCondition(editingEntry.condition);
      setNotes(editingEntry.notes || '');
      setPhotos(editingEntry.photos || []);
      // Try to infer entry type from notes prefix
      setEntryType('observation');
      setRating(0);
    } else {
      resetForm();
    }
  }, [editingEntry, open]);

  const resetForm = () => {
    setEntryType('observation');
    setPlantId(preselectedPlantId || '');
    setOccurredAt(new Date().toISOString().split('T')[0]);
    setCondition('healthy');
    setNotes('');
    setRating(0);
    setPhotos([]);
  };

  const handleTypeChange = (type: EntryType) => {
    setEntryType(type);
    if (!isEditing) {
      setCondition(typeToConditionHint[type]);
    }
  };

  const handleSubmit = async () => {
    if (!plantId) {
      toast.error('Selecciona una planta');
      return;
    }

    // Prefix notes with entry type tag + rating
    const tagPrefix = entryType !== 'observation' ? `[${entryTypes.find(t => t.value === entryType)?.label}] ` : '';
    const ratingPrefix = rating > 0 ? `${'⭐'.repeat(rating)} ` : '';
    const fullNotes = `${tagPrefix}${ratingPrefix}${notes}`.trim() || null;

    try {
      if (isEditing && editingEntry) {
        await updateObservation.mutateAsync({
          id: editingEntry.id,
          condition,
          observation_date: occurredAt,
          notes: fullNotes,
          photos,
        });
        toast.success('Entrada actualizada');
      } else {
        await createObservation.mutateAsync({
          owned_plant_id: plantId,
          condition,
          observation_date: occurredAt,
          notes: fullNotes,
          photos,
        });
        toast.success('Entrada registrada');
      }
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error(isEditing ? 'Error al actualizar' : 'Error al registrar');
    }
  };

  const isPending = createObservation.isPending || updateObservation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar entrada' : 'Nueva entrada'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Entry type selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tipo de entrada
            </Label>
            <div className="flex flex-wrap gap-2">
              {entryTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                    entryType === type.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/30 hover:bg-primary/5',
                  )}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plant selector */}
          <div className="space-y-2">
            <Label>Planta *</Label>
            <Select value={plantId} onValueChange={setPlantId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar planta" />
              </SelectTrigger>
              <SelectContent>
                {plants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      {p.photos?.[0] && (
                        <img src={p.photos[0]} alt="" className="h-5 w-5 rounded object-cover" />
                      )}
                      {p.nickname}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Condition row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="occurred-at">Fecha</Label>
              <Input
                id="occurred-at"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as ObservationCondition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', opt.dot)} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Valoración</Label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="entry-notes">Notas</Label>
            <Textarea
              id="entry-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe lo que observas…"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Photo uploader */}
          <div className="space-y-2">
            <Label>Fotos</Label>
            <EntryPhotoUploader photos={photos} onChange={setPhotos} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? 'Guardar cambios' : 'Registrar entrada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EntryComposer;
