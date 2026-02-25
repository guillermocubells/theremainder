import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import { getDisplayImages, getMainImage } from "@/utils/plantImageUtils";

interface PlantImageGalleryProps {
  images?: string[];
  productImages?: string[];
  primaryImage?: string | null;
  plantName: string;
}

const PlantImageGallery = ({ images, productImages, primaryImage, plantName }: PlantImageGalleryProps) => {
  const { t } = useTranslation();
  const galleryImages = getDisplayImages(images, productImages);
  const mainImg = getMainImage(images, productImages, primaryImage);
  const initialIndex = mainImg ? Math.max(0, galleryImages.indexOf(mainImg)) : 0;
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  // Touch/swipe handling for lightbox
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const displayImages = galleryImages.slice(0, 4);

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (displayImages.length === 0) return;
    if (direction === 'prev') {
      setSelectedIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
    } else {
      setSelectedIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
    }
  }, [displayImages.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || displayImages.length <= 1) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = Math.abs((touchStartY.current || 0) - touchEndY);
    const swipeThreshold = 50;

    if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > diffY) {
      if (diffX > 0) {
        navigateLightbox('next');
      } else {
        navigateLightbox('prev');
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [displayImages.length, navigateLightbox]);

  if (galleryImages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center min-h-[300px]">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-2 bg-muted rounded-lg flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <p className="text-sm">{t('lightbox.noImages', 'Sin imágenes')}</p>
        </div>
      </div>
    );
  }

  const openLightbox = () => {
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="h-full flex flex-col w-full">
        {/* Main Image - grows to fill available space */}
        <div className="relative flex-1 min-h-0 mb-3">
          <div 
            className="relative h-full w-full overflow-hidden rounded-xl cursor-pointer group shadow-lg bg-muted flex items-center justify-center"
            onClick={openLightbox}
          >
            <OptimizedImage
              src={displayImages[selectedIndex]}
              alt={`${plantName} - imagen ${selectedIndex + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              wrapperClassName="w-full h-full"
              loading="eager"
            />
            {/* Zoom button */}
            <button 
              className="absolute bottom-3 right-3 bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                openLightbox();
              }}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thumbnails - fixed height at the bottom */}
        {displayImages.length > 1 && (
          <div className="flex-shrink-0 flex gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {displayImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200",
                  selectedIndex === index 
                    ? "border-primary ring-2 ring-primary/30" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <OptimizedImage
                  src={image}
                  alt={`${plantName} - miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal - Same structure as PlantPhotoCarousel */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent 
          className="max-w-4xl w-[95vw] p-0 bg-black/95 border-none gap-0"
        >
          <VisuallyHidden>
            <DialogTitle>{plantName} - {t('lightbox.enlargedImage', 'Imagen ampliada')}</DialogTitle>
          </VisuallyHidden>
          
          <div className="relative">
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-white/90 hover:bg-white text-foreground px-3 py-1.5 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            >
              <X className="h-4 w-4" />
              <span className="text-sm font-medium">{t('common.close', 'Cerrar')}</span>
            </button>

            {/* Image container with swipe support */}
            <div 
              className="p-2 relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Navigation arrows - hidden on mobile, visible on desktop */}
              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={() => navigateLightbox('prev')}
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-all duration-200 hover:scale-110"
                  >
                    <ChevronLeft className="h-6 w-6 text-white" />
                  </button>
                  <button
                    onClick={() => navigateLightbox('next')}
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-all duration-200 hover:scale-110"
                  >
                    <ChevronRight className="h-6 w-6 text-white" />
                  </button>
                </>
              )}

              <OptimizedImage
                src={displayImages[selectedIndex]}
                alt={`${plantName} - imagen ${selectedIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg select-none"
                draggable={false}
                placeholder={false}
                loading="eager"
              />
              
              {/* Image counter */}
              {displayImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
                  {selectedIndex + 1} / {displayImages.length}
                </div>
              )}
            </div>

            {/* Hint text for mobile */}
            <p className="text-center text-white/60 text-xs pb-3 sm:hidden">
              {t('lightbox.swipeHint', 'Desliza para navegar')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlantImageGallery;
