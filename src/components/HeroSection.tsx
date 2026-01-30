import { useTranslation } from 'react-i18next';
import heroBackground from '@/assets/hero-background.jpeg';

const HeroSection = () => {
  const { t } = useTranslation();
  
  return (
    <section 
      className="py-16 sm:py-24 lg:py-32 px-4 relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${heroBackground})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-green-50/40 via-green-50/30 to-emerald-100/50"></div>
      <div className="container mx-auto text-center relative z-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-green-700/80 mb-3 sm:mb-4 font-medium">A Botanical Archive</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-light text-gray-800 mb-4 sm:mb-6 italic">{t('header.subtitle')}</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-700 mb-4 sm:mb-6 leading-relaxed max-w-2xl mx-auto">{t('hero.subtitle')}</p>
          <div className="w-16 h-px bg-green-600/50 mx-auto"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
