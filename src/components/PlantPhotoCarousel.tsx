import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlantPhotoCarouselProps {
  images: string[];
  plantName: string;
}

const PlantPhotoCarousel = ({ images, plantName }: PlantPhotoCarouselProps) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Touch/swipe handling for lightbox
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (!images || images.length === 0) return;
    if (direction === 'prev') {
      setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    } else {
      setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }
  }, [images]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || !images || images.length <= 1) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = Math.abs((touchStartY.current || 0) - touchEndY);
    const swipeThreshold = 50;

    // Only swipe if horizontal movement is greater than vertical
    if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > diffY) {
      if (diffX > 0) {
        navigateLightbox('next');
      } else {
        navigateLightbox('prev');
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [images, navigateLightbox]);

  if (!images || images.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
  };

  return (
    <>
      <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-border mb-6 sm:mb-8 transition-all duration-300 hover:shadow-lg">
        <h2 className="text-sm sm:text-base font-semibold text-foreground mb-4">
          {t('plant.productForSale', 'Producto en venta')}
        </h2>
        
        {/* Main image with zoom button */}
        <div className="relative mb-4">
          <div 
            className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-xl cursor-pointer group"
            onClick={() => openLightbox(selectedIndex)}
          >
            <img 
              src={images[selectedIndex]} 
              alt={`${plantName} - imagen ${selectedIndex + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Zoom button */}
            <button
              className="absolute bottom-3 right-3 p-2.5 rounded-full bg-foreground/80 hover:bg-foreground text-background transition-all duration-200 hover:scale-110 shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(selectedIndex);
              }}
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={cn(
                  "flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200",
                  selectedIndex === index 
                    ? "border-primary ring-2 ring-primary/30" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <img 
                  src={image} 
                  alt={`${plantName} - thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent 
          className="max-w-4xl w-[95vw] p-0 bg-black/95 border-none gap-0"
        >
          <VisuallyHidden>
            <DialogTitle>{plantName} - Imagen ampliada</DialogTitle>
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
              {images.length > 1 && (
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

              <img
                src={images[lightboxIndex]}
                alt={`${plantName} - imagen ${lightboxIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg select-none"
                draggable={false}
              />
              
              {/* Image counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
                  {lightboxIndex + 1} / {images.length}
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

export default PlantPhotoCarousel;
