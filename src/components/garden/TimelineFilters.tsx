import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Search, CalendarIcon, X, Filter, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ObservationCondition } from '@/hooks/collection/useObservations';

export interface TimelineFilterState {
  search: string;
  condition: string; // 'all' | ObservationCondition
  dateFrom: string;  // yyyy-MM-dd or ''
  dateTo: string;    // yyyy-MM-dd or ''
}

export const EMPTY_FILTERS: TimelineFilterState = {
  search: '',
  condition: 'all',
  dateFrom: '',
  dateTo: '',
};

const conditionOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'healthy', label: 'Saludable' },
  { value: 'okay', label: 'Aceptable' },
  { value: 'concern', label: 'Preocupante' },
  { value: 'critical', label: 'Crítico' },
];

export const hasActiveFilters = (f: TimelineFilterState) =>
  f.search !== '' || f.condition !== 'all' || f.dateFrom !== '' || f.dateTo !== '';

interface Props {
  filters: TimelineFilterState;
  onChange: (f: TimelineFilterState) => void;
  totalCount: number;
  filteredCount: number;
}

const TimelineFilters = ({ filters, onChange, totalCount, filteredCount }: Props) => {
  const active = hasActiveFilters(filters);
  const fromDate = filters.dateFrom ? new Date(filters.dateFrom + 'T00:00:00') : undefined;
  const toDate = filters.dateTo ? new Date(filters.dateTo + 'T00:00:00') : undefined;

  return (
    <div className="space-y-3 mb-4">
      {/* Search + condition row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en notas…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9 h-9"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={filters.condition}
          onValueChange={(v) => onChange({ ...filters, condition: v })}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-9">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {conditionOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range row */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn(
              'h-9 text-xs justify-start font-normal',
              !fromDate && 'text-muted-foreground',
            )}>
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {fromDate ? format(fromDate, 'd MMM yyyy', { locale: es }) : 'Desde'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(d) => onChange({ ...filters, dateFrom: d ? format(d, 'yyyy-MM-dd') : '' })}
              disabled={(d) => d > new Date() || (toDate ? d > toDate : false)}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>

        <span className="text-xs text-muted-foreground hidden sm:block">—</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn(
              'h-9 text-xs justify-start font-normal',
              !toDate && 'text-muted-foreground',
            )}>
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {toDate ? format(toDate, 'd MMM yyyy', { locale: es }) : 'Hasta'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={(d) => onChange({ ...filters, dateTo: d ? format(d, 'yyyy-MM-dd') : '' })}
              disabled={(d) => d > new Date() || (fromDate ? d < fromDate : false)}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>

        {active && (
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="secondary" className="text-xs">
              {filteredCount}/{totalCount}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineFilters;
