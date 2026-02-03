import { useTranslation } from 'react-i18next';

interface PlantSpecificationsProps {
  containerSize?: string;
}

const PlantSpecifications = ({ containerSize }: PlantSpecificationsProps) => {
  const { t } = useTranslation();
  
  if (!containerSize) return null;

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-border mb-6 transition-all duration-300 hover:shadow-lg">
      <h3 className="text-sm sm:text-base font-semibold text-foreground mb-4">
        {t('specifications.title')}
      </h3>
      <div className="flex items-center gap-3 group">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide transition-colors duration-200 group-hover:text-foreground">
          {t('specifications.container')}
        </span>
        <span className="px-3 py-1.5 text-xs sm:text-sm font-medium text-primary border-2 border-primary rounded transition-all duration-200 group-hover:bg-secondary group-hover:shadow-sm">
          {containerSize}
        </span>
      </div>
    </div>
  );
};

export default PlantSpecifications;
