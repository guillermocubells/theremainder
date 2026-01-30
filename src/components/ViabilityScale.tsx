
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ViabilityResult } from "@/utils/viabilityCalculator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ViabilityScaleProps {
  viability: ViabilityResult;
  plantName: string;
}

const ViabilityScale = ({ viability, plantName }: ViabilityScaleProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-700 font-bold";
    if (score >= 7) return "text-green-600 font-semibold";
    if (score >= 6) return "text-yellow-600 font-semibold";
    if (score >= 5) return "text-orange-600 font-semibold";
    if (score >= 4) return "text-red-600 font-semibold";
    return "text-red-700 font-bold";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 8) return "bg-green-100";
    if (score >= 7) return "bg-green-50";
    if (score >= 6) return "bg-yellow-50";
    if (score >= 5) return "bg-orange-50";
    if (score >= 4) return "bg-red-50";
    return "bg-red-100";
  };

  const factorLabels = {
    globalViability: "Viabilidad global",
    coldResistance: "Rusticidad (resistencia al frío)",
    humidityTolerance: "Tolerancia a la humedad",
    clayAdaptation: "Adaptación al suelo arcilloso húmedo",
    sunExposure: "Exposición solar recomendada",
    pestResistance: "Resistencia a plagas"
  };

  return (
    <Card className="mb-4 bg-white/90 backdrop-blur-sm border-green-200">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{plantName}</span>
                <div className={`px-3 py-1 rounded-full text-sm ${getScoreBackground(viability.totalScore)} ${getScoreColor(viability.totalScore)}`}>
                  Puntuación: {viability.totalScore}/10
                </div>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{viability.recommendation}</p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-2">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {isOpen ? "Ocultar detalles" : "Ver detalles"}
                </span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Factor</TableHead>
                  <TableHead className="text-center w-20">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(viability.factors).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {factorLabels[key as keyof typeof factorLabels]}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Escala 1-10: {value >= 8 ? 'Excelente' : value >= 6 ? 'Bueno' : value >= 4 ? 'Moderado' : 'Desafiante'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getScoreColor(value)}>
                        {value}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ViabilityScale;
