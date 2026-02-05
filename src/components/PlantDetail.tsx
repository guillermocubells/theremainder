
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect } from "react";
import { ArrowLeft, TreePalm, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from 'react-i18next';
import { plants } from "@/data/plants";
import { plantDetails } from "@/data/plantDetailData";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import PlantDetailHeader from "./PlantDetailHeader";
import PlantPhotoCarousel from "./PlantPhotoCarousel";
import PlantImageGallery from "./PlantImageGallery";
import CareInstructions from "./CareInstructions";
import PlantCharacteristics from "./PlantCharacteristics";
import PlantCuriousFacts from "./PlantCuriousFacts";
import PlantReviews from "./PlantReviews";
import { ProductStructuredData, BreadcrumbStructuredData } from "@/components/seo";
import CartDrawer from "./CartDrawer";
import LanguageSwitcher from "./LanguageSwitcher";
import RelatedPlants from "./RelatedPlants";
import RecentlyViewed from "./RecentlyViewed";
import Footer from "./Footer";

const PlantDetail = () => {
  const { plantId } = useParams();
  const navigate = useNavigate();
  const isHeaderVisible = useScrollDirection();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const plant = plants.find(p => p.id === plantId);

  // Scroll to top when component mounts or plantId changes (mobile-friendly)
  useLayoutEffect(() => {
    const prevRestoration = window.history.scrollRestoration;

    // Prevent the browser from restoring previous scroll position on navigation
    if (typeof prevRestoration === "string") {
      window.history.scrollRestoration = "manual";
    }

    const scrollTop = () => {
      window.scrollTo({ top: 0, left: 0 });
      // iOS/Safari sometimes needs these as well
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Run immediately, then again after layout/paint to avoid "jump to middle"
    scrollTop();
    const raf1 = window.requestAnimationFrame(() => {
      scrollTop();
      window.requestAnimationFrame(scrollTop);
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      if (typeof prevRestoration === "string") {
        window.history.scrollRestoration = prevRestoration;
      }
    };
  }, [plantId]);

  // Track plant view in recently viewed
  useEffect(() => {
    if (plantId) {
      addToRecentlyViewed(plantId);
    }
  }, [plantId, addToRecentlyViewed]);
  const handleAccountClick = () => {
    if (user) {
      navigate('/account');
    } else {
      navigate('/auth');
    }
  };

  if (!plant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">{t('plant.notFound')}</h1>
          <Link to="/" className="text-primary hover:text-primary/80 text-sm sm:text-base transition-colors">
            ← {t('navigation.backToCatalog')}
          </Link>
        </div>
      </div>
    );
  }

  const detail = plantDetails[plant.id];

  return (
    <TooltipProvider>
      {/* SEO: Structured Data + Meta Tags */}
      <ProductStructuredData plant={plant} />
      <BreadcrumbStructuredData 
        items={[
          { name: "Inicio", url: "/" },
          { name: "Catálogo", url: "/#catalogo" },
          { name: plant.name, url: `/plant/${plant.id}` },
        ]} 
      />
      
      <div className="min-h-screen bg-background">
        {/* Header - matching main header styling */}
        <header className={`bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50 transition-transform duration-300 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left side - Logo and back link */}
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group">
                  <div className="bg-primary p-1.5 sm:p-2 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                    <TreePalm className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{t('header.title')}</h1>
                    <p className="text-xs sm:text-sm text-primary hidden sm:block">{t('header.subtitle')}</p>
                  </div>
                </Link>
              </div>
              
              {/* Right side - Navigation */}
              <div className="flex items-center space-x-1 sm:space-x-2 text-primary flex-shrink-0">
                {/* Language switcher */}
                <LanguageSwitcher />

                {/* Account button */}
                <Button 
                  onClick={handleAccountClick}
                  variant="ghost" 
                  size="sm"
                  className="hover:bg-secondary text-primary"
                >
                  <User className="h-5 w-5" />
                </Button>

                {/* Cart drawer */}
                <CartDrawer />
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">
            {/* Back link */}
            <Link 
              to="/" 
              className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors duration-200 text-sm mb-4 group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              <span>{t('navigation.backToCatalog')}</span>
            </Link>

            {/* Two column layout - Header and Image Gallery - equal heights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8 items-stretch">
              {/* Left column - Plant Header (2/3 width) */}
              <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '0ms' }}>
                <PlantDetailHeader 
                  plant={plant} 
                  origin={detail?.origin}
                  climate={detail?.climate}
                />
              </div>
              
              {/* Right column - Image Gallery (1/3 width) - matches header height */}
              <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                <PlantImageGallery images={plant.images} plantName={plant.name} />
              </div>
            </div>

            {/* Care Instructions and Characteristics Section */}
            {detail && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
                <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                  <CareInstructions instructions={detail.careInstructions} />
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                  <PlantCharacteristics characteristics={detail.characteristics} />
                </div>
              </div>
            )}

            {/* Photo Carousel - Future Visual References */}
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <PlantPhotoCarousel images={plant.images} plantName={plant.name} />
            </div>

            {/* Curious Facts Section - now takes full width */}
            {detail && (
              <div className="mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '250ms' }}>
                <PlantCuriousFacts curiousFacts={detail.curiousFacts} />
              </div>
            )}

            {/* Related Plants Section */}
            <div className="mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '350ms' }}>
              <RelatedPlants currentPlant={plant} />
            </div>

            {/* Reviews Section */}
            <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
              <PlantReviews plantId={plant.id} plantName={plant.name} />
            </div>

            {/* Recently Viewed Section */}
            <div className="animate-fade-in" style={{ animationDelay: '450ms' }}>
              <RecentlyViewed excludePlantId={plant.id} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </TooltipProvider>
  );
};

export default PlantDetail;
