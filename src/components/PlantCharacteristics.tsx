
import { useTranslation } from "react-i18next";
import { Leaf } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlantCharacteristicsProps {
  characteristics: string[];
}

const PlantCharacteristics = ({ characteristics }: PlantCharacteristicsProps) => {
  const { t } = useTranslation();
  
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border transition-all duration-300 hover:shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-foreground text-lg sm:text-xl">{t('characteristics.title')}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{t('characteristics.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2 sm:space-y-3">
          {characteristics?.map((characteristic, index) => (
            <li 
              key={index} 
              className="flex items-start space-x-2 sm:space-x-3 group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="bg-secondary rounded-full p-0.5 sm:p-1 mt-0.5 sm:mt-1 flex-shrink-0 transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-110">
                <Leaf className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
              </div>
              <span className="text-muted-foreground text-xs sm:text-sm lg:text-base leading-relaxed transition-colors duration-200 group-hover:text-foreground">{characteristic}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default PlantCharacteristics;
