import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";

interface PlantCuriousFactsProps {
  curiousFacts: string[];
}

const PlantCuriousFacts = ({ curiousFacts }: PlantCuriousFactsProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 border border-border transition-all duration-300 hover:shadow-lg">
      <h2 className="text-lg sm:text-xl font-semibold leading-none tracking-tight text-foreground mb-4 sm:mb-6">
        {t('curiousFacts.title')}
      </h2>
      <ul className="space-y-2 sm:space-y-3">
        {curiousFacts?.map((fact, index) => (
          <li 
            key={index} 
            className="flex items-start space-x-2 sm:space-x-3 group"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="bg-amber-100 rounded-full p-0.5 sm:p-1 mt-0.5 sm:mt-1 flex-shrink-0 transition-all duration-200 group-hover:bg-amber-200 group-hover:scale-110">
              <Lightbulb className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-600" />
            </div>
            <span className="text-muted-foreground text-xs sm:text-sm lg:text-base leading-relaxed transition-colors duration-200 group-hover:text-foreground">{fact}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlantCuriousFacts;
