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
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-green-200 h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 rounded-lg flex items-center justify-center">
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
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-green-200 h-full">
        {/* Main Image */}
        <div 
          className="relative aspect-square rounded-xl overflow-hidden mb-3 cursor-pointer group"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={displayImages[selectedIndex]}
            alt={`${plantName} - imagen ${selectedIndex + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Zoom button */}
          <button 
            className="absolute bottom-3 right-3 bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Thumbnails */}
        {displayImages.length > 1 && (
          <div className="flex gap-2 justify-start">
            {displayImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 ${
                  selectedIndex === index 
                    ? 'ring-2 ring-green-500 ring-offset-2' 
                    : 'opacity-70 hover:opacity-100 hover:ring-1 hover:ring-green-300'
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
