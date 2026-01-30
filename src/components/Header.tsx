import { TreePalm, Gift, Search, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlantFinderModal } from "@/components/PlantFinder";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPlantFinderOpen, setIsPlantFinderOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const handleAccountClick = () => {
    if (user) {
      navigate('/account');
    } else {
      navigate('/auth');
    }
  };

  return (
    <>
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="bg-green-600 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                <TreePalm className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">Fronda Prima</h1>
                <p className="text-xs sm:text-sm text-green-600 hidden sm:block">The lost trees of the high altitudes</p>
                <p className="text-xs text-green-600 sm:hidden">High altitude botanica</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 text-green-700 flex-shrink-0">
              {/* Plant Finder CTA */}
              <Button 
                onClick={() => setIsPlantFinderOpen(true)}
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-2 sm:px-4"
              >
                <Search className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Encuentra tu planta</span>
              </Button>

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

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-green-100">
                    <Gift className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[90vw] sm:max-w-md w-full mx-auto text-center">
                  <DialogHeader className="text-center">
                    <DialogTitle className="text-sm sm:text-base lg:text-lg font-bold text-green-800 leading-tight text-center">
                      Condiciones de Frondaprima
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2 text-center">
                    <p className="text-gray-700 leading-relaxed text-xs sm:text-sm lg:text-base text-center">
                      El regalo se entrega a finales de septiembre/principios de octubre para solventar las vacaciones. El regalo no es intercambiable. Se aceptan preguntas y condiciones de cómo plantar. No están obligados a llevarse todas las plantas, son posibilidades dentro del régimen climático Balear y Cantábrico. Es posible que en octubre haya nuevas posibilidades, hablaremos entonces.
                    </p>
                    <div className="flex justify-center pt-2">
                      <Button 
                        onClick={() => setIsDialogOpen(false)} 
                        className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
                      >
                        Aceptamos
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Plant Finder Modal */}
      <PlantFinderModal 
        open={isPlantFinderOpen} 
        onOpenChange={setIsPlantFinderOpen} 
      />
    </>
  );
};

export default Header;
