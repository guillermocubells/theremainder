import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCreateBatch, useUpdateBatch, type GerminationBatch, type BatchInput } from '@/hooks/garden/useGerminationDiary';
import { Loader2, CalendarIcon, Sprout } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const methods = [
  { value: 'soil', label: 'Sustrato / Tierra' },
  { value: 'paper_towel', label: 'Papel húmedo' },
  { value: 'water', label: 'Remojo en agua' },
  { value: 'perlite', label: 'Perlita' },
  { value: 'sphagnum', label: 'Musgo sphagnum' },
  { value: 'other', label: 'Otro' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: GerminationBatch | null;
}

const GerminationBatchDialog = ({ open, onOpenChange, editing }: Props) => {
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();

  const [form, setForm] = useState<BatchInput>({
    species_name: '',
    common_name: '',
    seed_count: 10,
    method: 'soil',
    substrate: '',
    temperature_c: null,
    humidity_pct: null,
    light_hours: null,
    notes: '',
    started_at: new Date().toISOString().split('T')[0],
  });

  const [startDate, setStartDate] = useState<Date>(new Date());

  useEffect(() => {
    if (editing) {
      setForm({
        species_name: editing.species_name,
        common_name: editing.common_name,
        seed_count: editing.seed_count,
        method: editing.method,
        substrate: editing.substrate,
        temperature_c: editing.temperature_c,
        humidity_pct: editing.humidity_pct,
        light_hours: editing.light_hours,
        notes: editing.notes,
        started_at: editing.started_at,
      });
      setStartDate(new Date(editing.started_at));
    } else {
      setForm({
        species_name: '', common_name: '', seed_count: 10, method: 'soil',
        substrate: '', temperature_c: null, humidity_pct: null, light_hours: null,
        notes: '', started_at: new Date().toISOString().split('T')[0],
      });
      setStartDate(new Date());
    }
  }, [editing, open]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      setForm({ ...form, started_at: format(date, 'yyyy-MM-dd') });
    }
  };

  const handleSubmit = async () => {
    if (!form.species_name.trim()) {
      toast.error('Indica el nombre de la especie');
      return;
    }
    if (form.seed_count < 1) {
      toast.error('El número de semillas debe ser al menos 1');
      return;
    }
    try {
      if (editing) {
        await updateBatch.mutateAsync({ id: editing.id, ...form });
        toast.success('Lote actualizado');
      } else {
        await createBatch.mutateAsync(form);
        toast.success('Lote de germinación creado');
      }
      onOpenChange(false);
    } catch {
      toast.error('Error al guardar');
    }
  };

  const isPending = createBatch.isPending || updateBatch.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            {editing ? 'Editar lote' : 'Nuevo lote de germinación'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Species */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Especie *</Label>
              <Input
                value={form.species_name}
                onChange={(e) => setForm({ ...form, species_name: e.target.value })}
                placeholder="Ej: Monstera deliciosa"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre común</Label>
              <Input
                value={form.common_name || ''}
                onChange={(e) => setForm({ ...form, common_name: e.target.value })}
                placeholder="Ej: Costilla de Adán"
              />
            </div>
          </div>

          {/* Seeds & method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nº de semillas *</Label>
              <Input
                type="number"
                min={1}
                value={form.seed_count}
                onChange={(e) => setForm({ ...form, seed_count: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start date */}
          <div className="space-y-2">
            <Label>Fecha de inicio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, 'PPP', { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Environment */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Temp. (°C)</Label>
              <Input
                type="number"
                step="0.5"
                value={form.temperature_c ?? ''}
                onChange={(e) => setForm({ ...form, temperature_c: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="25"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Humedad (%)</Label>
              <Input
                type="number"
                min={0} max={100}
                value={form.humidity_pct ?? ''}
                onChange={(e) => setForm({ ...form, humidity_pct: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="80"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Luz (h/día)</Label>
              <Input
                type="number"
                step="0.5"
                min={0} max={24}
                value={form.light_hours ?? ''}
                onChange={(e) => setForm({ ...form, light_hours: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="12"
              />
            </div>
          </div>

          {/* Substrate */}
          <div className="space-y-2">
            <Label>Sustrato</Label>
            <Input
              value={form.substrate || ''}
              onChange={(e) => setForm({ ...form, substrate: e.target.value })}
              placeholder="Ej: Fibra de coco + perlita 70/30"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Tratamiento previo, proveedor, etc."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editing ? 'Guardar' : 'Crear lote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GerminationBatchDialog;
