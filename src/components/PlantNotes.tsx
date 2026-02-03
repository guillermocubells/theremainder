import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlantNotesProps {
  notes: string;
}

const PlantNotes = ({ notes }: PlantNotesProps) => {
  const { t } = useTranslation();
  
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground text-sm sm:text-base font-semibold">
          {t('notes.title', 'Notas Especiales')}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('notes.subtitle', 'Observaciones y consejos específicos para esta planta')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="bg-secondary border border-border rounded-lg p-3">
          <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">{notes}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlantNotes;
