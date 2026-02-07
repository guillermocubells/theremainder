import { useTranslation } from 'react-i18next';
import heroBackground from '@/assets/hero-background.jpeg';
const HeroSection = () => {
  const {
    t
  } = useTranslation();
  return <section className="py-16 sm:py-24 lg:py-28 px-4 relative bg-cover bg-center bg-no-repeat min-h-[45vh] sm:min-h-[50vh] flex items-center" style={{
    backgroundImage: `url(${heroBackground})`
  }}>
      {/* Overlay oscuro para mejorar legibilidad */}
      <div className="absolute inset-0 bg-black/35" />
      
      <div className="container mx-auto text-center relative z-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-white mb-3 sm:mb-4 font-semibold drop-shadow-lg [text-shadow:_1px_1px_3px_rgb(0_0_0_/_80%)]">PLANTAS DE ALTURA. GERMINADAS Y COMPARTIDAS UNA VEZ</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-light text-white mb-4 sm:mb-6 italic drop-shadow-xl [text-shadow:_2px_2px_12px_rgb(0_0_0_/_80%)]">
            {t('header.subtitle')}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-white mb-4 sm:mb-6 leading-relaxed max-w-2xl mx-auto drop-shadow-lg [text-shadow:_1px_1px_6px_rgb(0_0_0_/_70%)]">
            {t('hero.subtitle')}
          </p>
          <div className="w-16 h-px bg-white/90 mx-auto shadow-lg"></div>
        </div>
      </div>
    </section>;
};
export default HeroSection;