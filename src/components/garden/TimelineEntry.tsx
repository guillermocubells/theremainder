import { type Observation } from '@/hooks/collection/useObservations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Camera, Pencil, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const conditionConfig: Record<string, { label: string; color: string; dot: string }> = {
  healthy: { label: 'Saludable', color: 'bg-success-muted text-success-muted-foreground', dot: 'bg-success' },
  okay: { label: 'Aceptable', color: 'bg-warning-muted text-warning-muted-foreground', dot: 'bg-warning' },
  concern: { label: 'Preocupante', color: 'bg-caution-muted text-caution-muted-foreground', dot: 'bg-caution' },
  critical: { label: 'Crítico', color: 'bg-danger-muted text-danger-muted-foreground', dot: 'bg-danger' },
};

export { conditionConfig };

interface TimelineEntryProps {
  observation: Observation;
  isFirst: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPhotoClick: (src: string) => void;
  searchQuery?: string;
}

const highlightMatch = (text: string, query: string) => {
  if (!query || query.length < 2) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">{part}</mark> : part
  );
};

const TimelineEntry = ({ observation, isFirst, onEdit, onDelete, onPhotoClick, searchQuery }: TimelineEntryProps) => {
  const config = conditionConfig[observation.condition] ?? conditionConfig.healthy;
  const obsDate = new Date(observation.observation_date);
  const relativeTime = formatDistanceToNow(obsDate, { addSuffix: true, locale: es });

  return (
    <div className="relative flex gap-4 animate-fade-in">
      <div className="relative z-10 mt-1.5 flex-shrink-0">
        <div className={cn('h-[10px] w-[10px] rounded-full ring-4 ring-background', config.dot)} />
      </div>

      <Card className={cn(
        'flex-1 transition-shadow hover:shadow-md',
        isFirst && 'ring-1 ring-primary/20',
      )}>
        <CardContent className="p-4 space-y-3">
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
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {observation.notes && (
            <p className="text-sm text-foreground leading-relaxed">
              {searchQuery ? highlightMatch(observation.notes, searchQuery) : observation.notes}
            </p>
          )}

          {observation.photos && observation.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {observation.photos.map((photo, i) => (
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

export default TimelineEntry;
