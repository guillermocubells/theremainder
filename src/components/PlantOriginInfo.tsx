import { useTranslation } from "react-i18next";
import { MapPin, Thermometer, Sun } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlantOriginInfoProps {
  origin: string;
  climate: string;
  light: string;
}

const PlantOriginInfo = ({ origin, climate, light }: PlantOriginInfoProps) => {
  const { t } = useTranslation();
  
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground text-sm sm:text-base font-semibold">{t('originInfo.title')}</CardTitle>
        <CardDescription className="text-xs">{t('originInfo.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-start space-x-3 group">
            <div className="bg-secondary rounded-full p-1.5 mt-0.5 flex-shrink-0 transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-110">
              <MapPin className="h-3 w-3 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-xs sm:text-sm">{t('originInfo.origin')}</h4>
              <p className="text-muted-foreground text-xs sm:text-sm">{origin}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 group">
            <div className="bg-secondary rounded-full p-1.5 mt-0.5 flex-shrink-0 transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-110">
              <Thermometer className="h-3 w-3 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-xs sm:text-sm">{t('originInfo.climateType')}</h4>
              <p className="text-muted-foreground text-xs sm:text-sm">{climate}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 group">
            <div className="bg-secondary rounded-full p-1.5 mt-0.5 flex-shrink-0 transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-110">
              <Sun className="h-3 w-3 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-xs sm:text-sm">{t('originInfo.bestLocation')}</h4>
              <p className="text-muted-foreground text-xs sm:text-sm">{light}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlantOriginInfo;
