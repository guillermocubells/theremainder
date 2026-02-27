import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCreateEntry } from '@/hooks/garden/useGerminationDiary';
import { Loader2, CalendarIcon, SproutIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
}

const GerminationEntryDialog = ({ open, onOpenChange, batchId }: Props) => {
  const createEntry = useCreateEntry();
  const [date, setDate] = useState<Date>(new Date());
  const [sproutCount, setSproutCount] = useState(0);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    try {
      await createEntry.mutateAsync({
        batch_id: batchId,
        observed_at: format(date, 'yyyy-MM-dd'),
        sprout_count: sproutCount,
        notes: notes || null,
      });
      toast.success('Observación registrada');
      onOpenChange(false);
      setSproutCount(0);
      setNotes('');
      setDate(new Date());
    } catch {
      toast.error('Error al registrar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SproutIcon className="h-5 w-5 text-success" />
            Registrar brotes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fecha de observación</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'PPP', { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Brotes nuevos hoy</Label>
            <Input
              type="number"
              min={0}
              value={sproutCount}
              onChange={(e) => setSproutCount(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones sobre los brotes…"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createEntry.isPending}>
            {createEntry.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GerminationEntryDialog;
