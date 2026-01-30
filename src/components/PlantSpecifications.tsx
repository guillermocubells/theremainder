import { useTranslation } from 'react-i18next';

interface PlantSpecificationsProps {
  containerSize?: string;
  height?: string;
  origin?: string;
  family?: string;
}

const PlantSpecifications = ({ containerSize, height, origin, family }: PlantSpecificationsProps) => {
  const { t } = useTranslation();
  
  const specifications = [
    { label: t('specifications.container'), value: containerSize },
    { label: t('specifications.height'), value: height },
    { label: t('specifications.origin'), value: origin },
    { label: t('specifications.family'), value: family },
  ].filter(spec => spec.value);

  if (specifications.length === 0) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-green-200 mb-6 sm:mb-8">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">
        {t('specifications.title')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {specifications.map((spec, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
              {spec.label}
            </span>
            <span className="px-3 py-1.5 text-sm font-medium text-green-800 border-2 border-green-600 rounded">
              {spec.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlantSpecifications;
