
import { useTranslation } from "react-i18next";
import { Droplets } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CareInstructionsProps {
  instructions: string[];
}

const CareInstructions = ({ instructions }: CareInstructionsProps) => {
  const { t } = useTranslation();
  
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-green-200 transition-all duration-300 hover:shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-green-800">{t('care.title')}</CardTitle>
        <CardDescription>{t('care.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {instructions?.map((instruction, index) => (
            <li 
              key={index} 
              className="flex items-start space-x-3 group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="bg-green-100 rounded-full p-1 mt-1 transition-all duration-200 group-hover:bg-green-200 group-hover:scale-110">
                <Droplets className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-gray-700 transition-colors duration-200 group-hover:text-gray-900">{instruction}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CareInstructions;
