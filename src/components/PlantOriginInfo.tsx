
import { MapPin, Thermometer, Sun } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlantOriginInfoProps {
  origin: string;
  climate: string;
  light: string;
}

const PlantOriginInfo = ({ origin, climate, light }: PlantOriginInfoProps) => {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-green-200">
      <CardHeader>
        <CardTitle className="text-green-800 flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Información de Origen</span>
        </CardTitle>
        <CardDescription>Datos sobre el hábitat natural y condiciones ideales</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-2">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Origen</h4>
              <p className="text-gray-600">{origin}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-orange-100 rounded-full p-2">
              <Thermometer className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Tipo de Clima</h4>
              <p className="text-gray-600">{climate}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-yellow-100 rounded-full p-2">
              <Sun className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Mejor Ubicación</h4>
              <p className="text-gray-600">{light}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlantOriginInfo;
