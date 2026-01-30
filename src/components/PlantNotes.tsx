
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlantNotesProps {
  notes: string;
}

const PlantNotes = ({ notes }: PlantNotesProps) => {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-green-200">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="text-green-800 flex items-center space-x-2 text-base sm:text-lg lg:text-xl">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Notas Especiales</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Observaciones y consejos específicos para esta planta</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <p className="text-gray-700 leading-relaxed text-xs sm:text-sm lg:text-base">{notes}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlantNotes;
