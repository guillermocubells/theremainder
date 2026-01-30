import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PlantImageGalleryProps {
  images?: string[];
  plantName: string;
}

const PlantImageGallery = ({ images, plantName }: PlantImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center min-h-[300px]">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-2 bg-muted rounded-lg flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <p className="text-sm">Sin imágenes</p>
        </div>
      </div>
    );
  }

  // Limit to 4 images max
  const displayImages = images.slice(0, 4);

  return (
    <>
      <div className="h-full flex flex-col w-full">
        {/* Main Image - fills available space */}
        <div 
          className="relative flex-1 min-h-[300px] rounded-xl overflow-hidden mb-3 cursor-pointer group shadow-lg"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={displayImages[selectedIndex]}
            alt={`${plantName} - imagen ${selectedIndex + 1}`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Zoom button */}
          <button 
            className="absolute bottom-3 right-3 bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnails - fixed height */}
        {displayImages.length > 1 && (
          <div className="flex gap-2 justify-start flex-shrink-0">
            {displayImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 shadow-md ${
                  selectedIndex === index 
                    ? 'ring-2 ring-primary ring-offset-2' 
                    : 'opacity-80 hover:opacity-100 hover:ring-1 hover:ring-primary/50'
                }`}
              >
                <img
                  src={image}
                  alt={`${plantName} - miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-full p-2 bg-black/95 border-none">
          <div className="relative">
            <img
              src={displayImages[selectedIndex]}
              alt={`${plantName} - imagen ampliada`}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg animate-scale-in"
            />
            {/* Thumbnail navigation in lightbox */}
            {displayImages.length > 1 && (
              <div className="flex gap-2 justify-center mt-4">
                {displayImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden transition-all duration-200 ${
                      selectedIndex === index 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black' 
                        : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${plantName} - miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlantImageGallery;
