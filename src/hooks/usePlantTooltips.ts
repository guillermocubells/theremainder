import { useTranslation } from "react-i18next";

export const usePlantTooltips = () => {
  const { t } = useTranslation();

  const getLightTooltip = (light: string) => {
    switch (light.toLowerCase()) {
      case 'soleada':
        return t('light.sunnyTooltip');
      case 'semisol':
        return t('light.semiSunTooltip');
      case 'semisombra':
        return t('light.semiShadeTooltip');
      case 'sombreada':
        return t('light.shadedTooltip');
      default:
        return t('light.defaultTooltip');
    }
  };

  const getGrowthTooltip = (growth: string) => {
    switch (growth.toLowerCase()) {
      case 'rápido':
        return t('growth.fastTooltip');
      case 'medio':
        return t('growth.mediumTooltip');
      case 'lento':
        return t('growth.slowTooltip');
      default:
        return t('growth.defaultTooltip');
    }
  };

  return { getLightTooltip, getGrowthTooltip };
};
