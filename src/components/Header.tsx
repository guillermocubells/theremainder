
import { TreePalm, Gift } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
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
          <div className="flex items-center space-x-2 text-green-700 flex-shrink-0">
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
  );
};

export default Header;
