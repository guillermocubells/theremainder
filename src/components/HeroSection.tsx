import { useTranslation } from 'react-i18next';

const HeroSection = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-8 sm:py-12 lg:py-16 px-4">
      <div className="container mx-auto text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-green-700/70 mb-3 sm:mb-4">A Botanical Archive</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-light text-gray-800 mb-4 sm:mb-6 italic">{t('header.subtitle')}</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6 leading-relaxed max-w-2xl mx-auto">{t('hero.subtitle')}</p>
          <div className="w-16 h-px bg-green-600/40 mx-auto"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
