
import { useTranslation } from "react-i18next";
import { Droplets } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CareInstructionsProps {
  instructions: string[];
}

const CareInstructions = ({ instructions }: CareInstructionsProps) => {
  const { t } = useTranslation();
  
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border transition-all duration-300 hover:shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-foreground">{t('care.title')}</CardTitle>
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
              <div className="bg-secondary rounded-full p-1 mt-1 transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-110">
                <Droplets className="h-3 w-3 text-primary" />
              </div>
              <span className="text-muted-foreground transition-colors duration-200 group-hover:text-foreground">{instruction}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CareInstructions;
