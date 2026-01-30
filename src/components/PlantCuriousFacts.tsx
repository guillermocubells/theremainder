
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlantCuriousFactsProps {
  curiousFacts: string[];
}

const PlantCuriousFacts = ({ curiousFacts }: PlantCuriousFactsProps) => {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-green-200">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="text-green-800 flex items-center space-x-2 text-base sm:text-lg lg:text-xl">
          <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Datos Curiosos</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Hechos fascinantes y únicos sobre esta planta</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2 sm:space-y-3">
          {curiousFacts?.map((fact, index) => (
            <li key={index} className="flex items-start space-x-2 sm:space-x-3">
              <div className="bg-amber-100 rounded-full p-0.5 sm:p-1 mt-0.5 sm:mt-1 flex-shrink-0">
                <Lightbulb className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-600" />
              </div>
              <span className="text-gray-700 text-xs sm:text-sm lg:text-base leading-relaxed">{fact}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default PlantCuriousFacts;
