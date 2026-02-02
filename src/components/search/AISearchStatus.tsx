import { Sparkles, MapPin } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface AISearchStatusProps {
  resultsCount: number;
  postalCode?: string;
}

const AISearchStatus = ({ resultsCount, postalCode }: AISearchStatusProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 text-sm text-primary">
      <Sparkles className="h-4 w-4" />
      <span className="font-medium">{t('filters.aiSearchActive')}</span>
      <span className="text-muted-foreground">— {resultsCount} {t('filters.plantsFound')}</span>
      {postalCode && (
        <span className="inline-flex items-center gap-1 bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-xs font-medium">
          <MapPin className="h-3 w-3" />
          {t('filters.postalCode')}: {postalCode}
        </span>
      )}
    </div>
  );
};

export default AISearchStatus;
