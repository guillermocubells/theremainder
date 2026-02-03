import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ViabilityFactors } from "@/hooks/useRecommendPlants";
import { Info } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ViabilityFactorsTableProps {
  factors: ViabilityFactors;
}

interface FactorInfo {
  label: string;
  description: string;
  criteria: string;
}

const factorInfo: Record<keyof ViabilityFactors, FactorInfo> = {
  globalViability: {
    label: "Viabilidad global",
    description: "Índice compuesto que evalúa la adaptación general de la planta a tu zona climática.",
    criteria: "Combina todos los factores ponderados según su importancia para la supervivencia a largo plazo."
  },
  coldResistance: {
    label: "Rusticidad (resistencia al frío)",
    description: "Capacidad de la planta para soportar temperaturas mínimas en tu zona.",
    criteria: "Basado en la zona de rusticidad USDA/RHS y temperaturas mínimas históricas de tu ubicación."
  },
  humidityTolerance: {
    label: "Tolerancia a la humedad",
    description: "Adaptación a los niveles de humedad ambiental de tu zona.",
    criteria: "Considera humedad relativa media anual, precipitaciones y proximidad al mar."
  },
  clayAdaptation: {
    label: "Adaptación al suelo arcilloso húmedo",
    description: "Tolerancia a suelos pesados con drenaje limitado.",
    criteria: "Evalúa sensibilidad a encharcamiento, necesidades de drenaje y tolerancia a compactación."
  },
  sunExposure: {
    label: "Exposición solar recomendada",
    description: "Compatibilidad con las horas de sol directas disponibles en tu jardín.",
    criteria: "Compara requisitos de luz de la planta con la orientación y sombras de tu espacio."
  },
  pestResistance: {
    label: "Resistencia a plagas",
    description: "Robustez frente a plagas y enfermedades comunes en tu clima.",
    criteria: "Considera susceptibilidad a hongos por humedad, insectos locales y enfermedades endémicas."
  }
};

const getScoreColor = (score: number) => {
  if (score >= 8) return "text-green-700 font-bold";
  if (score >= 7) return "text-green-600 font-semibold";
  if (score >= 6) return "text-yellow-600 font-semibold";
  if (score >= 5) return "text-orange-600 font-semibold";
  if (score >= 4) return "text-red-600 font-semibold";
  return "text-red-700 font-bold";
};

const getScoreLabel = (score: number): string => {
  if (score >= 8) return 'Excelente';
  if (score >= 6) return 'Bueno';
  if (score >= 4) return 'Moderado';
  return 'Desafiante';
};

const FactorTooltipContent = ({ info, score }: { info: FactorInfo; score: number }) => (
  <div className="space-y-2 max-w-xs">
    <div className="flex items-center justify-between gap-2">
      <span className="font-semibold text-sm">{info.label}</span>
      <span className={`text-sm ${getScoreColor(score)}`}>
        {score}/10 - {getScoreLabel(score)}
      </span>
    </div>
    <p className="text-xs text-muted-foreground">{info.description}</p>
    <div className="pt-1 border-t border-border/50">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Criterio:</span> {info.criteria}
      </p>
    </div>
  </div>
);

const ViabilityFactorsTable = ({ factors }: ViabilityFactorsTableProps) => {
  const isMobile = useIsMobile();
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left text-xs">Factor</TableHead>
          <TableHead className="text-center w-16 text-xs">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(Object.entries(factors) as [keyof ViabilityFactors, number][]).map(([key, value]) => {
          const info = factorInfo[key];
          
          return (
            <TableRow key={key} className="h-8">
              <TableCell className="font-medium text-xs py-1.5">
                {isMobile ? (
                  <Popover 
                    open={openPopover === key} 
                    onOpenChange={(open) => setOpenPopover(open ? key : null)}
                  >
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 cursor-pointer text-left hover:text-primary transition-colors">
                        <span>{info.label}</span>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="w-72 p-3">
                      <FactorTooltipContent info={info} score={value} />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help flex items-center gap-1.5 hover:text-primary transition-colors">
                        {info.label}
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="p-3">
                      <FactorTooltipContent info={info} score={value} />
                    </TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell className="text-center py-1.5">
                <span className={`text-xs ${getScoreColor(value)}`}>
                  {value}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default ViabilityFactorsTable;
