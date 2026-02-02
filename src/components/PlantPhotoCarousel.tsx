import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface PlantPhotoCarouselProps {
  images: string[];
  plantName: string;
}

const PlantPhotoCarousel = ({ images, plantName }: PlantPhotoCarouselProps) => {
  const { t } = useTranslation();
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setLightboxOpen(false);
    }
  };

  return (
    <>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 border border-green-200 mb-6 sm:mb-8 transition-all duration-300 hover:shadow-lg">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-green-800 mb-4 sm:mb-6">
          {t('plant.visualReferences', 'Referencias visuales futuras')}
        </h2>
        <Carousel className="w-full max-w-4xl mx-auto">
          <CarouselContent className="-ml-2 md:-ml-4">
            {images.map((image, index) => (
              <CarouselItem key={index} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card 
                    className="cursor-pointer overflow-hidden group transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                    onClick={() => openLightbox(index)}
                  >
                    <CardContent className="flex aspect-square items-center justify-center p-0 relative">
                      <img 
                        src={image} 
                        alt={`${plantName} - imagen ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-lg" />
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex transition-all duration-200 hover:scale-110 hover:bg-green-100" />
          <CarouselNext className="hidden sm:flex transition-all duration-200 hover:scale-110 hover:bg-green-100" />
        </Carousel>
      </div>

      {/* Lightbox Modal - Matching PlantImageGallery style */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] w-auto p-0 bg-transparent border-none shadow-none [&>button]:hidden"
          onInteractOutside={() => setLightboxOpen(false)}
        >
          <VisuallyHidden>
            <DialogTitle>{plantName} - Imagen ampliada</DialogTitle>
          </VisuallyHidden>
          
          {/* Full overlay for click-outside detection */}
          <div 
            className="fixed inset-0 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
          >
            <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              {/* Close button - prominent */}
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute -top-12 right-0 sm:top-2 sm:right-2 z-50 flex items-center gap-2 bg-white/90 hover:bg-white text-foreground px-4 py-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
              >
                <X className="h-5 w-5" />
                <span className="text-sm font-medium">Cerrar</span>
              </button>

              {/* Image container with swipe support */}
              <div 
                className="bg-black/95 rounded-xl overflow-hidden p-2 relative"
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
                  className="w-full h-auto max-h-[75vh] object-contain rounded-lg animate-scale-in select-none"
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
              <p className="text-center text-white/60 text-xs mt-3 sm:hidden">
                Desliza para navegar · Toca fuera para cerrar
              </p>
              <p className="text-center text-white/60 text-xs mt-3 hidden sm:block">
                Toca fuera de la imagen para cerrar
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlantPhotoCarousel;
