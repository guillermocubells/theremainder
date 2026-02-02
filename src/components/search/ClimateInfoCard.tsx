import { MapPin } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { ClimateInfo } from "@/hooks/useAISearch";

interface ClimateInfoCardProps {
  climateInfo: ClimateInfo;
  postalCode: string;
}

const ClimateInfoCard = ({ climateInfo, postalCode }: ClimateInfoCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="bg-accent/50 border border-accent rounded-lg p-3">
      <h4 className="font-medium text-accent-foreground text-sm mb-2 flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {t('filters.climateAnalysis')} — {t('filters.postalCode')} {postalCode}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-accent-foreground/80">
        <div>🌡️ <span className="font-medium">{t('filters.zone')}:</span> {climateInfo.zone}</div>
        <div>❄️ <span className="font-medium">{t('filters.hardiness')}:</span> {climateInfo.hardiness}</div>
        <div>💧 <span className="font-medium">{t('filters.humidity')}:</span> {climateInfo.humidity}</div>
        <div>☀️ <span className="font-medium">{t('filters.sun')}:</span> {climateInfo.sunIntensity}</div>
      </div>
    </div>
  );
};

export default ClimateInfoCard;
