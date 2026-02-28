import { Thermometer, Droplets, Sun, ShieldCheck, ShieldAlert, ShieldQuestion, AlertTriangle, Info, TrendingUp, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useClimateFit, type ClimateFitData, type HardinessBadge, type ClimateFitWarning } from "@/hooks/useClimateFit";
import { useLocationPreference } from "@/hooks/useLocationPreference";
import LocationEmptyState from "@/components/location/LocationEmptyState";
import LocationSelector from "@/components/search/LocationSelector";

// ── Score ring ───────────────────────────────────────────────────────

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const pct = Math.min(Math.max(score, 0), 10);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 10) * circumference;

  const color =
    pct >= 8 ? "hsl(var(--success))"
    : pct >= 6 ? "hsl(var(--warning))"
    : pct >= 4 ? "hsl(var(--caution))"
    : "hsl(var(--destructive))";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`Puntuación de adaptación climática: ${pct.toFixed(1)} de 10`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={5}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-lg font-bold text-foreground" aria-hidden="true">
        {pct.toFixed(1)}
      </span>
    </div>
  );
}

// ── Hardiness badge ──────────────────────────────────────────────────

const HARDINESS_CONFIG: Record<HardinessBadge, { icon: typeof ShieldCheck; label: string; className: string }> = {
  ok: {
    icon: ShieldCheck,
    label: "Rusticidad OK",
    className: "bg-success-muted text-success-muted-foreground border-success/20",
  },
  borderline: {
    icon: ShieldAlert,
    label: "Límite",
    className: "bg-warning-muted text-warning-muted-foreground border-warning/20",
  },
  risky: {
    icon: ShieldAlert,
    label: "Fuera de rango",
    className: "bg-danger-muted text-danger-muted-foreground border-danger/20",
  },
  unknown: {
    icon: ShieldQuestion,
    label: "Sin datos",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function HardinessBadgeChip({ badge, zones }: { badge: HardinessBadge; zones?: string }) {
  const config = HARDINESS_CONFIG[badge];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
          config.className
        )} role="status" aria-label={`Rusticidad: ${config.label}`}>
          <Icon className="h-3 w-3" aria-hidden="true" />
          {config.label}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <p className="text-xs">
          {badge === "ok" && `Tu zona de rusticidad es compatible con el rango ${zones || "de la especie"}.`}
          {badge === "borderline" && `Tu zona está en el borde del rango tolerado (${zones || "?"}). Protección recomendada.`}
          {badge === "risky" && `Tu zona está fuera del rango seguro (${zones || "?"}). No recomendado al exterior.`}
          {badge === "unknown" && "No hay suficientes datos de rusticidad para evaluar la compatibilidad."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ── Confidence indicator ─────────────────────────────────────────────

function ConfidenceIndicator({ confidence, sampleCount }: { confidence: string; sampleCount: number }) {
  const dots = confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
  const label = confidence === "high" ? "Alta" : confidence === "medium" ? "Media" : "Baja";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1" role="status" aria-label={`Confianza: ${label} (${sampleCount} muestras)`}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                i <= dots ? "bg-primary" : "bg-muted"
              )}
              aria-hidden="true"
            />
          ))}
          <span className="text-[10px] text-muted-foreground ml-0.5">{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">
          Confianza {label.toLowerCase()} basada en {sampleCount} {sampleCount === 1 ? "muestra" : "muestras"} de datos.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ── Factor bar ───────────────────────────────────────────────────────

const FACTOR_ICONS: Record<string, typeof Thermometer> = {
  temperature: Thermometer,
  humidity: Droplets,
  exposure: Sun,
  hardiness: ShieldCheck,
};

const FACTOR_LABELS: Record<string, string> = {
  temperature: "Temperatura",
  humidity: "Humedad",
  hardiness: "Rusticidad",
  soil: "Suelo",
  exposure: "Exposición",
};

function FactorBar({ name, value }: { name: string; value: number }) {
  const Icon = FACTOR_ICONS[name] || TrendingUp;
  const label = FACTOR_LABELS[name] || name;
  const pctValue = Math.round((value / 10) * 100);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Icon className="h-3 w-3" aria-hidden="true" />
          {label}
        </span>
        <span className="font-medium text-foreground">{value.toFixed(1)}</span>
      </div>
      <Progress value={pctValue} className="h-1.5" aria-label={`${label}: ${value.toFixed(1)} de 10`} />
    </div>
  );
}

// ── Warning item ─────────────────────────────────────────────────────

function WarningItem({ warning }: { warning: ClimateFitWarning }) {
  const severityClass =
    warning.severity === "danger"
      ? "bg-danger-muted text-danger-muted-foreground border-danger/20"
      : warning.severity === "warning"
      ? "bg-warning-muted text-warning-muted-foreground border-warning/20"
      : "bg-info-muted text-info-muted-foreground border-info/20";

  const Icon = warning.severity === "danger" || warning.severity === "warning" ? AlertTriangle : Info;

  return (
    <div className={cn("flex items-start gap-2 rounded-md border p-2 text-xs", severityClass)} role="alert">
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
      <p>{warning.message}</p>
    </div>
  );
}

// ── No-location prompt ───────────────────────────────────────────────
// Replaced by LocationEmptyState

// ── Loading skeleton ─────────────────────────────────────────────────

function ClimateFitSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-44" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-[72px] w-[72px] rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Widget ──────────────────────────────────────────────────────

interface ClimateFitWidgetProps {
  plantId: string | undefined;
  className?: string;
}

const ClimateFitWidget = ({ plantId, className }: ClimateFitWidgetProps) => {
  const { location } = useLocationPreference();
  const { data: fit, isLoading } = useClimateFit(plantId);

  if (!location) return <LocationEmptyState variant="card" contextLabel={undefined} className={className} />;
  if (isLoading) return <ClimateFitSkeleton />;
  if (!fit) return null;

  const zonesLabel = [fit.thresholds?.hardiness_zone_min, fit.thresholds?.hardiness_zone_max]
    .filter(Boolean)
    .join("–");

  const factorEntries = Object.entries(fit.factors).filter(
    ([, v]) => v != null && typeof v === "number"
  ) as [string, number][];

  return (
    <Card className={cn("overflow-hidden", className)} role="region" aria-label="Adaptación climática">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            Adaptación climática
          </CardTitle>
          <ConfidenceIndicator confidence={fit.confidence} sampleCount={fit.sampleCount} />
        </div>
        {fit.regionLabel && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {fit.regionLabel}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score + badges row */}
        <div className="flex items-center gap-4">
          <ScoreRing score={fit.score} />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <HardinessBadgeChip badge={fit.hardinessBadge} zones={zonesLabel} />
              {zonesLabel && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                  Zona {zonesLabel}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {fit.score >= 8
                ? "Excelente adaptación a tu zona"
                : fit.score >= 6
                ? "Buena adaptación con algunos cuidados"
                : fit.score >= 4
                ? "Adaptación moderada, requiere atención"
                : "Adaptación difícil, no recomendado sin protección"}
            </p>
          </div>
        </div>

        {/* Factor bars */}
        {factorEntries.length > 0 && (
          <div className="space-y-2" aria-label="Factores de adaptación">
            {factorEntries.map(([name, value]) => (
              <FactorBar key={name} name={name} value={value} />
            ))}
          </div>
        )}

        {/* Thresholds summary */}
        {fit.thresholds && (
          <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
            {fit.thresholds.min_temp_c != null && (
              <div className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" aria-hidden="true" />
                <span>Mín: {fit.thresholds.min_temp_c}°C</span>
              </div>
            )}
            {fit.thresholds.max_temp_c != null && (
              <div className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" aria-hidden="true" />
                <span>Máx: {fit.thresholds.max_temp_c}°C</span>
              </div>
            )}
            {fit.thresholds.frost_warning_temp_c != null && (
              <div className="flex items-center gap-1">
                <span>❄️</span>
                <span>Helada: {fit.thresholds.frost_warning_temp_c}°C</span>
              </div>
            )}
            {fit.thresholds.heat_warning_temp_c != null && (
              <div className="flex items-center gap-1">
                <span>🔥</span>
                <span>Calor: {fit.thresholds.heat_warning_temp_c}°C</span>
              </div>
            )}
          </div>
        )}

        {/* Warnings */}
        {fit.warnings.length > 0 && (
          <div className="space-y-1.5" role="region" aria-label="Avisos climáticos">
            {fit.warnings.map((w, i) => (
              <WarningItem key={i} warning={w} />
            ))}
          </div>
        )}

        {/* Change location hint */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            {location?.source === "ip" ? "Ubicación aproximada" : "Tu ubicación"}
          </span>
          <LocationSelector compact />
        </div>
      </CardContent>
    </Card>
  );
};

export default ClimateFitWidget;
