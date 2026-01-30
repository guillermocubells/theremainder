
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { plants } from "@/data/plants";
import { plantDetails } from "@/data/plantDetailData";
import { TooltipProvider } from "@/components/ui/tooltip";
import PlantDetailHeader from "./PlantDetailHeader";
import PlantPhotoCarousel from "./PlantPhotoCarousel";
import CareInstructions from "./CareInstructions";
import PlantCharacteristics from "./PlantCharacteristics";
import PlantCuriousFacts from "./PlantCuriousFacts";

const PlantDetail = () => {
  const { plantId } = useParams();
  const plant = plants.find(p => p.id === plantId);

  if (!plant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Planta no encontrada</h1>
          <Link to="/" className="text-green-600 hover:text-green-700 text-sm sm:text-base">
            ← Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const detail = plantDetails[plant.id];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Link 
                to="/" 
                className="flex items-center space-x-2 text-green-700 hover:text-green-800 transition-colors text-sm sm:text-base"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Volver al catálogo</span>
                <span className="sm:hidden">Volver</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">
            {/* Plant Header with origin info */}
            <PlantDetailHeader 
              plant={plant} 
              origin={detail?.origin}
              climate={detail?.climate}
            />

            {/* Photo Carousel */}
            <PlantPhotoCarousel images={plant.images} plantName={plant.name} />

            {/* Care Instructions and Characteristics Section */}
            {detail && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
                <CareInstructions instructions={detail.careInstructions} />
                <PlantCharacteristics characteristics={detail.characteristics} />
              </div>
            )}

            {/* Curious Facts Section - now takes full width */}
            {detail && (
              <div className="mb-6 sm:mb-8">
                <PlantCuriousFacts curiousFacts={detail.curiousFacts} />
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PlantDetail;
