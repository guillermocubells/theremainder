
import { useTranslation } from "react-i18next";
import { Leaf } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlantCharacteristicsProps {
  characteristics: string[];
}

const PlantCharacteristics = ({ characteristics }: PlantCharacteristicsProps) => {
  const { t } = useTranslation();
  
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-green-200 transition-all duration-300 hover:shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-green-800">{t('characteristics.title')}</CardTitle>
        <CardDescription>{t('characteristics.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2 sm:space-y-3">
          {characteristics?.map((characteristic, index) => (
            <li 
              key={index} 
              className="flex items-start space-x-2 sm:space-x-3 group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="bg-green-100 rounded-full p-0.5 sm:p-1 mt-0.5 sm:mt-1 flex-shrink-0 transition-all duration-200 group-hover:bg-green-200 group-hover:scale-110">
                <Leaf className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600" />
              </div>
              <span className="text-gray-700 text-xs sm:text-sm lg:text-base leading-relaxed transition-colors duration-200 group-hover:text-gray-900">{characteristic}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default PlantCharacteristics;
