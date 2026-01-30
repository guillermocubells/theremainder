
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, TreePalm } from "lucide-react";
import { plants } from "@/data/plants";
import { plantDetails } from "@/data/plantDetailData";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import PlantDetailHeader from "./PlantDetailHeader";
import PlantPhotoCarousel from "./PlantPhotoCarousel";
import CareInstructions from "./CareInstructions";
import PlantCharacteristics from "./PlantCharacteristics";
import PlantCuriousFacts from "./PlantCuriousFacts";
import PlantReviews from "./PlantReviews";
import CartDrawer from "./CartDrawer";

const PlantDetail = () => {
  const { plantId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHeaderVisible = useScrollDirection();
  const plant = plants.find(p => p.id === plantId);

  const handleAccountClick = () => {
    if (user) {
      navigate('/account');
    } else {
      navigate('/auth');
    }
  };

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
        {/* Header - matching main header styling */}
        <header className={`bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50 transition-transform duration-300 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left side - Logo and back link */}
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
                  <div className="bg-green-600 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                    <TreePalm className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">Fronda Prima</h1>
                    <p className="text-xs sm:text-sm text-green-600 hidden sm:block">The lost trees of the high altitudes</p>
                  </div>
                </Link>
              </div>
              
              {/* Right side - Navigation */}
              <div className="flex items-center space-x-1 sm:space-x-2 text-green-700 flex-shrink-0">
                {/* Cart drawer */}
                <CartDrawer />

                {/* Account button */}
                <Button 
                  onClick={handleAccountClick}
                  variant="ghost" 
                  size="sm"
                  className="hover:bg-green-100 text-green-700"
                >
                  <User className="h-5 w-5 sm:mr-1" />
                  <span className="hidden sm:inline">
                    {user ? 'Mi cuenta' : 'Entrar'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">
            {/* Back link */}
            <Link 
              to="/" 
              className="inline-flex items-center space-x-2 text-green-700 hover:text-green-800 transition-colors text-sm mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al catálogo</span>
            </Link>

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

            {/* Reviews Section */}
            <div className="mb-6 sm:mb-8">
              <PlantReviews plantId={plant.id} plantName={plant.name} />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PlantDetail;
