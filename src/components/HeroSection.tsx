import { useTranslation } from 'react-i18next';
import heroBackground from '@/assets/hero-background.jpeg';

const HeroSection = () => {
  const { t } = useTranslation();
  
  return (
    <section 
      className="py-16 sm:py-24 lg:py-28 px-4 relative bg-cover bg-center bg-no-repeat min-h-[45vh] sm:min-h-[50vh] flex items-center"
      style={{ backgroundImage: `url(${heroBackground})` }}
    >
      <div className="container mx-auto text-center relative z-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-white/90 mb-3 sm:mb-4 font-medium drop-shadow-lg">
            A Botanical Archive
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-light text-white mb-4 sm:mb-6 italic drop-shadow-xl [text-shadow:_2px_2px_8px_rgb(0_0_0_/_60%)]">
            {t('header.subtitle')}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-white/95 mb-4 sm:mb-6 leading-relaxed max-w-2xl mx-auto drop-shadow-lg [text-shadow:_1px_1px_4px_rgb(0_0_0_/_50%)]">
            {t('hero.subtitle')}
          </p>
          <div className="w-16 h-px bg-white/70 mx-auto shadow-lg"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
