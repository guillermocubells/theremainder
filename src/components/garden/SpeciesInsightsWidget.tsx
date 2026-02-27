import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sprout, Heart, Activity, Eye, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpeciesInsight } from '@/hooks/garden/useSpeciesInsights';

const conditionColors: Record<number, string> = {
  4: 'text-success',
  3: 'text-warning',
  2: 'text-caution',
  1: 'text-destructive',
};

interface StatCellProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  className?: string;
}

const StatCell = ({ icon, label, value, subtext, className }: StatCellProps) => (
  <div className={cn('text-center space-y-1', className)}>
    <div className="flex items-center justify-center gap-1 text-muted-foreground">
      {icon}
      <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
    {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
  </div>
);

/* ─── Single species card ─── */

interface SpeciesInsightCardProps {
  insight: SpeciesInsight;
  compact?: boolean;
}

export const SpeciesInsightCard = ({ insight, compact = false }: SpeciesInsightCardProps) => {
  const s = insight;

  if (compact) {
    return (
      <div className="bg-muted/40 rounded-lg p-3 border border-border space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{s.speciesName}</p>
            {s.commonName && <p className="text-xs text-muted-foreground truncate">{s.commonName}</p>}
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {s.totalPlants} {s.totalPlants === 1 ? 'ejemplar' : 'ejemplares'}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatCell
            icon={<Heart className="h-3 w-3" />}
            label="Superv."
            value={`${s.survivalPct}%`}
          />
          <StatCell
            icon={<Activity className={cn('h-3 w-3', conditionColors[s.avgConditionScore])} />}
            label="Estado"
            value={s.avgConditionLabel || '—'}
          />
          <StatCell
            icon={<Sprout className="h-3 w-3" />}
            label="Germ."
            value={s.germinationRatePct != null ? `${s.germinationRatePct}%` : '—'}
          />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Insights · {s.speciesName}
        </CardTitle>
        {s.commonName && (
          <p className="text-xs text-muted-foreground">{s.commonName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCell
            icon={<Heart className="h-3 w-3" />}
            label="Supervivencia"
            value={`${s.survivalPct}%`}
            subtext={`${s.alivePlants}/${s.totalPlants} vivas`}
          />
          <StatCell
            icon={<Activity className={cn('h-3 w-3', conditionColors[s.avgConditionScore])} />}
            label="Estado medio"
            value={s.avgConditionLabel || '—'}
            subtext={`${s.observationCount} obs.`}
          />
          <StatCell
            icon={<Sprout className="h-3 w-3" />}
            label="Germinación"
            value={s.germinationRatePct != null ? `${s.germinationRatePct}%` : '—'}
            subtext={s.germinationBatches > 0 ? `${s.germinationBatches} lotes` : 'sin lotes'}
          />
          <StatCell
            icon={<Eye className="h-3 w-3" />}
            label="Ejemplares"
            value={String(s.totalPlants)}
            subtext={`${s.alivePlants} activos`}
          />
        </div>

        {/* Survival bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Supervivencia</span>
            <span>{s.survivalPct}%</span>
          </div>
          <Progress value={s.survivalPct} className="h-2" />
        </div>

        {s.germinationRatePct != null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tasa de germinación</span>
              <span>{s.germinationRatePct}%</span>
            </div>
            <Progress value={s.germinationRatePct} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ─── Multi-species list ─── */

interface SpeciesInsightsWidgetProps {
  insights: SpeciesInsight[];
  isLoading?: boolean;
  limit?: number;
  compact?: boolean;
  title?: string;
}

export const SpeciesInsightsWidget = ({
  insights,
  isLoading,
  limit,
  compact = false,
  title = 'Insights por especie',
}: SpeciesInsightsWidgetProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) return null;

  const displayed = limit ? insights.slice(0, limit) : insights;

  if (compact) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" />
          {title}
        </h3>
        <div className="space-y-2">
          {displayed.map((insight) => (
            <SpeciesInsightCard key={insight.speciesName} insight={insight} compact />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayed.map((insight) => (
        <SpeciesInsightCard key={insight.speciesName} insight={insight} />
      ))}
    </div>
  );
};

export default SpeciesInsightsWidget;
