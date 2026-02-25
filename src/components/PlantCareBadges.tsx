import { useTranslation } from "react-i18next";
import { Sun, CloudSun, Cloud, Droplets, Gauge, Sprout, TreeDeciduous, Zap } from "lucide-react";
import { ResponsiveTooltip } from "@/components/ui/responsive-tooltip";
import { cn } from "@/lib/utils";

interface PlantCareBadgesProps {
  light?: string;
  waterNeeds?: string;
  growthRate?: string;
  climateZones?: string[];
  className?: string;
}

const LIGHT_CONFIG: Record<string, { icon: typeof Sun; label: string; bg: string }> = {
  soleada: { icon: Sun, label: "Sol directo", bg: "bg-amber-100 text-amber-800 border-amber-200" },
  semisol: { icon: CloudSun, label: "Semisol", bg: "bg-orange-50 text-orange-700 border-orange-200" },
  semisombra: { icon: Cloud, label: "Semisombra", bg: "bg-sky-50 text-sky-700 border-sky-200" },
  sombreada: { icon: Cloud, label: "Sombra", bg: "bg-slate-100 text-slate-700 border-slate-200" },
};

const WATER_CONFIG: Record<string, { label: string; bg: string; dots: number }> = {
  baja: { label: "Riego bajo", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dots: 1 },
  moderada: { label: "Riego moderado", bg: "bg-blue-50 text-blue-700 border-blue-200", dots: 2 },
  alta: { label: "Riego frecuente", bg: "bg-cyan-50 text-cyan-700 border-cyan-200", dots: 3 },
};

const GROWTH_CONFIG: Record<string, { icon: typeof Sprout; label: string; bg: string }> = {
  lento: { icon: Sprout, label: "Crecimiento lento", bg: "bg-stone-50 text-stone-700 border-stone-200" },
  medio: { icon: TreeDeciduous, label: "Crecimiento medio", bg: "bg-lime-50 text-lime-700 border-lime-200" },
  "rápido": { icon: Zap, label: "Crecimiento rápido", bg: "bg-green-50 text-green-700 border-green-200" },
};

const PlantCareBadges = ({ light, waterNeeds, growthRate, climateZones, className }: PlantCareBadgesProps) => {
  const { t } = useTranslation();
  const lightKey = light?.toLowerCase() || "";
  const waterKey = waterNeeds?.toLowerCase() || "";
  const growthKey = growthRate?.toLowerCase() || "";

  const lightCfg = LIGHT_CONFIG[lightKey];
  const waterCfg = WATER_CONFIG[waterKey];
  const growthCfg = GROWTH_CONFIG[growthKey];

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* Light badge */}
      {lightCfg && (() => {
        const LIcon = lightCfg.icon;
        return (
          <ResponsiveTooltip content={<span>{t('light.title')}: {lightCfg.label}</span>}>
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border", lightCfg.bg)}>
              <LIcon className="h-3.5 w-3.5" />
              <span>{lightCfg.label}</span>
            </div>
          </ResponsiveTooltip>
        );
      })()}

      {/* Water badge */}
      {waterCfg && (
        <ResponsiveTooltip content={<span>{t('care.title')}: {waterCfg.label}</span>}>
          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border", waterCfg.bg)}>
            <Droplets className="h-3.5 w-3.5" />
            <span>{waterCfg.label}</span>
            <span className="flex gap-0.5 ml-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    i < waterCfg.dots ? "bg-current opacity-80" : "bg-current opacity-20"
                  )}
                />
              ))}
            </span>
          </div>
        </ResponsiveTooltip>
      )}

      {/* Growth badge */}
      {growthCfg && (() => {
        const GIcon = growthCfg.icon;
        return (
          <ResponsiveTooltip content={<span>{t('growth.title')}: {growthCfg.label}</span>}>
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border", growthCfg.bg)}>
              <GIcon className="h-3.5 w-3.5" />
              <span>{growthCfg.label}</span>
            </div>
          </ResponsiveTooltip>
        );
      })()}

      {/* Climate zones */}
      {climateZones && climateZones.length > 0 && (
        <ResponsiveTooltip content={<span>Zona climática: {climateZones.join(", ")}</span>}>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-secondary text-secondary-foreground border-border capitalize">
            <Gauge className="h-3.5 w-3.5" />
            <span>{climateZones.join(" · ")}</span>
          </div>
        </ResponsiveTooltip>
      )}
    </div>
  );
};

export default PlantCareBadges;
