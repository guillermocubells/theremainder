import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ViabilityFactors } from "@/hooks/useRecommendPlants";

interface ViabilityFactorsTableProps {
  factors: ViabilityFactors;
}

const factorLabels: Record<keyof ViabilityFactors, string> = {
  globalViability: "Viabilidad global",
  coldResistance: "Rusticidad (resistencia al frío)",
  humidityTolerance: "Tolerancia a la humedad",
  clayAdaptation: "Adaptación al suelo arcilloso húmedo",
  sunExposure: "Exposición solar recomendada",
  pestResistance: "Resistencia a plagas"
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

const ViabilityFactorsTable = ({ factors }: ViabilityFactorsTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left text-xs">Factor</TableHead>
          <TableHead className="text-center w-16 text-xs">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(Object.entries(factors) as [keyof ViabilityFactors, number][]).map(([key, value]) => (
          <TableRow key={key} className="h-8">
            <TableCell className="font-medium text-xs py-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    {factorLabels[key]}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Escala 1-10: {getScoreLabel(value)}</p>
                </TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell className="text-center py-1.5">
              <span className={`text-xs ${getScoreColor(value)}`}>
                {value}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ViabilityFactorsTable;
