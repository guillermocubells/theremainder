import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, TreePalm, User, ChevronUp, Loader2, ExternalLink, Heart, ChevronDown, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from 'react-i18next';
import { plants, Plant } from "@/data/plants";
import { plantDetails, PlantDetailData } from "@/data/plantDetailData";
import { supabase } from "@/integrations/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useCatalogFavorite } from "@/hooks/wishlist";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatHardinessZones, getZoneTemperatureRange } from "@/utils/hardinessZones";
import { ResponsiveTooltip } from "@/components/ui/responsive-tooltip";
import { cn } from "@/lib/utils";
import PlantImageGallery from "./PlantImageGallery";
import PlantCareBadges from "./PlantCareBadges";
import CareInstructions from "./CareInstructions";
import PlantCharacteristics from "./PlantCharacteristics";
import PlantCuriousFacts from "./PlantCuriousFacts";
import PlantReviews from "./PlantReviews";
import { ProductStructuredData, BreadcrumbStructuredData } from "@/components/seo";
import CartDrawer from "./CartDrawer";
import LanguageSwitcher from "./LanguageSwitcher";
import RelatedPlants from "./RelatedPlants";
import RecentlyViewed from "./RecentlyViewed";
import RecentlyPurchased from "./RecentlyPurchased";
import CompleteYourOrder from "./CompleteYourOrder";
import Footer from "./Footer";
import StickyMobileCTA from "./StickyMobileCTA";
import AddToCartButton from "./AddToCartButton";
import StockNotificationButton from "./StockNotificationButton";
import SocialShareButtons from "./SocialShareButtons";
import TrustBadges from "./TrustBadges";
import ScarcityIndicator from "./ScarcityIndicator";

const PlantDetail = () => {
  const { plantId } = useParams();
  const navigate = useNavigate();
  const isHeaderVisible = useScrollDirection();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const { formatPrice } = useCurrency();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [dbPlant, setDbPlant] = useState<Plant | null>(null);
  const [dbDetail, setDbDetail] = useState<PlantDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Try static data first
  const staticPlant = plants.find(p => p.id === plantId);

  // Fetch from DB if not in static data
  useEffect(() => {
    if (staticPlant || !plantId) return;
    
    let cancelled = false;
    setLoading(true);
    
    const fetchPlant = async () => {
      // Try slug first
      let { data } = await supabase
        .from("plants")
        .select("*")
        .eq("slug", plantId)
        .eq("is_active", true)
        .maybeSingle();
      
      // Fallback: try by UUID id
      if (!data && plantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const res = await supabase
          .from("plants")
          .select("*")
          .eq("id", plantId)
          .maybeSingle();
        data = res.data;
      }

      if (cancelled || !data) {
        setLoading(false);
        return;
      }
        
        const row = data as Record<string, unknown>;
        const images = (row.images as string[] | null) || [];
        const thumbnail = row.thumbnail_url as string | null;
        const allImages = thumbnail && !images.includes(thumbnail)
          ? [thumbnail, ...images]
          : images;
        
        const mapWater = (w: string | null) => {
          if (!w) return undefined;
          if (w === "low") return "Baja" as const;
          if (w === "high") return "Alta" as const;
          return "Moderada" as const;
        };
        const mapLight = (exp: string[] | null) => {
          if (!exp?.length) return "Semisol";
          const f = exp[0];
          if (f === "full_sun" || f === "sol") return "Soleada";
          if (f === "shade" || f === "full_shade" || f === "sombra") return "Sombreada";
          return "Semisol";
        };
        const mapGrowth = (g: string | null) => {
          if (!g) return "Medio";
          if (g.toLowerCase() === "slow") return "Lento";
          if (g.toLowerCase() === "fast") return "Rápido";
          return "Medio";
        };
        
        const mapped: Plant = {
          id: row.slug as string,
          name: row.name as string,
          variety: (row.variety as string) || "",
          quantity: (row.stock_qty as number) ?? 0,
          commonName: (row.common_name as string) || (row.name as string),
          description: (row.short_description as string) || (row.description as string) || "",
          link: (row.reference_url as string) || "",
          location: (row.origin_country as string) || "",
          light: mapLight(row.exposure as string[] | null),
          growthRate: mapGrowth(row.growth_rate as string | null),
          notes: (row.notes as string) || "",
          price: row.sale_price ? (row.sale_price as number) : (row.price as number) ?? 0,
          images: allImages,
          hardinessZones: (row.hardiness_zones as string[] | null) || [],
          climateZones: (row.climate_zones as string[] | null) || [],
          waterNeeds: mapWater(row.water as string | null),
          containerSize: (row.container_size as string) || undefined,
          germinationDate: (row.germination_date as string) || undefined,
        };
        
        setDbPlant(mapped);
        
        const care = row.care_instructions as Record<string, string> | null;
        const facts = row.curious_facts as string[] | null;
        const specs = row.specifications as Record<string, string> | null;
        
        const detail: PlantDetailData = {
          family: specs?.family || (row.plant_type as string) || undefined,
          origin: [row.origin_country, row.origin_region].filter(Boolean).join(", ") || undefined,
          height: (row.mature_height as string) || undefined,
          climate: (row.temperature_range as string) || undefined,
          careInstructions: care ? Object.values(care) : undefined,
          characteristics: [
            row.native_habitat && `Hábitat: ${row.native_habitat}`,
            row.mature_height && `Altura: ${row.mature_height}`,
            row.mature_width && `Ancho: ${row.mature_width}`,
          ].filter(Boolean) as string[],
          curiousFacts: facts || undefined,
        };
        
        setDbDetail(detail);
        setLoading(false);
    };

    fetchPlant();
    
    return () => { cancelled = true; };
  }, [plantId, staticPlant]);

  const plant = staticPlant || dbPlant;
  const detail = staticPlant ? plantDetails[staticPlant.id] : dbDetail;

  const { isFavorite, isToggling, toggleFavorite } = useCatalogFavorite(plant?.id || "");

  const handleFavoriteClick = () => {
    if (!user) { navigate('/auth'); return; }
    if (!plant) return;
    toggleFavorite({
      name: plant.name,
      scientificName: plant.commonName,
      imageUrl: plant.images?.[0],
      price: plant.price,
    });
  };

  // Track scroll position to show/hide the scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    navigate(user ? '/account' : '/auth');
  };

  const totalPrice = plant?.price !== undefined ? plant.price * selectedQuantity : undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  return (
    <TooltipProvider>
      {/* SEO: Structured Data + Meta Tags */}
      <ProductStructuredData plant={plant} />
      <BreadcrumbStructuredData 
        items={[
          { name: "Inicio", url: "/" },
          { name: "Catálogo", url: "/#catalogo" },
          ...(plant.plantGroup ? [{ name: plant.plantGroup, url: `/#catalogo` }] : []),
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

            {/* ====== HERO: Gallery (left) + Product Info (right) ====== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 mb-8 sm:mb-12">
              {/* LEFT — Image Gallery (prominent) */}
              <div className="animate-fade-in">
                <PlantImageGallery
                  images={plant.images}
                  productImages={plant.productImages}
                  primaryImage={plant.primaryImage}
                  plantName={plant.name}
                />
              </div>

              {/* RIGHT — Product Info */}
              <div className="animate-fade-in flex flex-col gap-4" style={{ animationDelay: '50ms' }}>
                {/* Title + favorite */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                      {plant.name}
                    </h1>
                    {plant.variety && (
                      <p className="text-base sm:text-lg font-medium text-primary mt-1">{plant.variety}</p>
                    )}
                    <p className="text-base sm:text-lg text-muted-foreground mt-0.5">{plant.commonName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 pt-1">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleFavoriteClick}
                          disabled={isToggling}
                          className={cn(
                            "h-10 w-10 rounded-full transition-colors",
                            isFavorite ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-destructive"
                          )}
                        >
                          <Heart className={cn("h-5 w-5 sm:h-6 sm:w-6", isFavorite && "fill-current")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                      </TooltipContent>
                    </Tooltip>
                    {plant.link && (
                      <Button asChild variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary hidden sm:flex">
                        <a href={plant.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Care badges */}
                <PlantCareBadges
                  light={plant.light}
                  waterNeeds={plant.waterNeeds}
                  growthRate={plant.growthRate}
                  climateZones={plant.climateZones}
                />

                {/* USDA Hardiness zone badge */}
                {plant.hardinessZones && plant.hardinessZones.length > 0 && (() => {
                  const sorted = [...plant.hardinessZones].sort((a, b) => {
                    const numA = parseInt(a); const numB = parseInt(b);
                    if (numA !== numB) return numA - numB;
                    return a.localeCompare(b);
                  });
                  return (
                    <ResponsiveTooltip
                      contentClassName="text-left max-w-sm w-auto p-3"
                      content={
                        <div className="space-y-2">
                          <p className="font-semibold text-sm">Zona de rusticidad (USDA)</p>
                          <div className="space-y-1 pt-1">
                            {sorted.map((zoneCode) => {
                              const range = getZoneTemperatureRange(zoneCode);
                              return (
                                <p key={zoneCode} className="text-xs font-medium">
                                  <span className="font-bold">{zoneCode.toUpperCase()}</span>
                                  <span className="text-muted-foreground font-normal">
                                    {range ? `: ${range.fromTemp !== null ? `${range.fromTemp}°C` : '< −53.9°C'} a ${range.toTemp !== null ? `${range.toTemp}°C` : '> 18.3°C'}` : ''}
                                  </span>
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      }
                    >
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-accent text-accent-foreground border-border cursor-default w-fit">
                        <Thermometer className="h-3.5 w-3.5" />
                        <span>USDA {sorted.map(z => z.toUpperCase()).join(' · ')}</span>
                      </div>
                    </ResponsiveTooltip>
                  );
                })()}

                {/* Description */}
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{plant.description}</p>

                {/* Product details (container, germination) */}
                {(plant.containerSize || plant.germinationDate) && (
                  <div className="flex flex-wrap gap-3 text-sm">
                    {plant.containerSize && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('specifications.container')}</span>
                        <span className="px-2.5 py-1 text-xs font-medium text-foreground border border-primary/40 rounded-md bg-primary/5">
                          {plant.containerSize}
                        </span>
                      </div>
                    )}
                    {plant.germinationDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('plant.germinationDate')}</span>
                        <span className="px-2.5 py-1 text-xs font-medium text-foreground border border-border rounded-md bg-muted">
                          {plant.germinationDate}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Scarcity */}
                {plant.quantity > 0 && plant.quantity <= 3 && (
                  <ScarcityIndicator quantity={Number(plant.quantity)} />
                )}

                {/* Notes collapsible */}
                {plant.notes && (
                  <Collapsible className="bg-secondary/50 border border-border rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                      <h3 className="font-semibold text-foreground text-sm">{t('plant.notes')}</h3>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-3">
                      <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">{plant.notes}</p>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Price + Add to Cart */}
                {plant.quantity > 0 ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-6 flex-wrap">
                      {totalPrice !== undefined && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-3xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                          <span className="text-xs text-muted-foreground">IVA incl.</span>
                        </div>
                      )}
                    </div>
                    <AddToCartButton
                      plantId={plant.id}
                      plantName={plant.name}
                      maxQuantity={Number(plant.quantity)}
                      price={plant.price || 0}
                      image={plant.images?.[0]}
                      containerSize={plant.containerSize}
                      onQuantityChange={setSelectedQuantity}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-base text-muted-foreground font-medium">{t('stockNotification.outOfStock')}</p>
                    <StockNotificationButton plantId={plant.id} />
                  </div>
                )}

                {/* Social share */}
                <SocialShareButtons
                  plantName={plant.name}
                  plantId={plant.id}
                  price={plant.price}
                  variety={plant.variety}
                  containerSize={plant.containerSize}
                  quantity={plant.quantity !== undefined ? Number(plant.quantity) : undefined}
                  description={plant.description}
                  imageUrl={plant.images?.[0]}
                />

                {/* Trust badges */}
                <TrustBadges />
              </div>
            </div>

            {/* ====== DETAILS SECTION ====== */}
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

            {/* Curious Facts */}
            {detail && (
              <div className="mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <PlantCuriousFacts curiousFacts={detail.curiousFacts} />
              </div>
            )}

            {/* Complete Your Order */}
            <div className="mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '250ms' }}>
              <CompleteYourOrder />
            </div>

            {/* Related Plants */}
            <div className="mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <RelatedPlants currentPlant={plant} />
            </div>

            {/* Reviews */}
            <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
              <PlantReviews plantId={plant.id} plantName={plant.name} />
            </div>

            {/* Recently Viewed */}
            <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
              <RecentlyViewed excludePlantId={plant.id} />
            </div>

            {/* Recently Purchased */}
            <div className="animate-fade-in" style={{ animationDelay: '450ms' }}>
              <RecentlyPurchased currentPlant={plant} />
            </div>
          </div>
          <div className="h-20 sm:hidden" />
        </div>

        {/* Sticky mobile CTA */}
        {plant.quantity > 0 && (
          <StickyMobileCTA
            plantId={plant.id}
            plantName={plant.name}
            price={plant.price || 0}
            maxQuantity={Number(plant.quantity)}
            image={plant.images?.[0]}
            containerSize={plant.containerSize}
          />
        )}

        <Footer />

        {showScrollTop && (
          <button
            onClick={scrollToTop}
            aria-label={t('navigation.backToTop', 'Volver arriba')}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-20 z-40 bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:bg-primary/90 transition-all duration-300 animate-fade-in"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        )}
      </div>
    </TooltipProvider>
  );
};

export default PlantDetail;
