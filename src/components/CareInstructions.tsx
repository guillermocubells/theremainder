
import { Droplets } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CareInstructionsProps {
  instructions: string[];
}

const CareInstructions = ({ instructions }: CareInstructionsProps) => {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-green-200">
      <CardHeader>
        <CardTitle className="text-green-800">Instrucciones de Cuidado</CardTitle>
        <CardDescription>Consejos esenciales para un crecimiento saludable</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {instructions?.map((instruction, index) => (
            <li key={index} className="flex items-start space-x-3">
              <div className="bg-green-100 rounded-full p-1 mt-1">
                <Droplets className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-gray-700">{instruction}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CareInstructions;
