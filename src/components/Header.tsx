import { TreePalm, Search, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PlantFinderModal } from "@/components/PlantFinder";
import { useAuth } from "@/contexts/AuthContext";
import CartDrawer from "@/components/CartDrawer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useScrollDirection } from "@/hooks/useScrollDirection";

const Header = () => {
  const [isPlantFinderOpen, setIsPlantFinderOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHeaderVisible = useScrollDirection();
  const { t } = useTranslation();
  
  const handleAccountClick = () => {
    if (user) {
      navigate('/account');
    } else {
      navigate('/auth');
    }
  };

  return (
    <>
      <header className={`bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50 transition-transform duration-300 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="bg-green-600 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                <TreePalm className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">{t('header.title')}</h1>
                <p className="text-xs sm:text-sm text-green-600 hidden sm:block">{t('header.subtitle')}</p>
                <p className="text-xs text-green-600 sm:hidden">{t('header.subtitleMobile')}</p>
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
                <span className="hidden sm:inline">{t('header.findPlant')}</span>
              </Button>

              {/* Language switcher */}
              <LanguageSwitcher />

              {/* Account button */}
              <Button 
                onClick={handleAccountClick}
                variant="ghost" 
                size="sm"
                className="hover:bg-green-100 text-green-700"
              >
                <User className="h-5 w-5 sm:mr-1" />
                {user && (
                  <span className="hidden sm:inline">{t('header.myAccount')}</span>
                )}
              </Button>

              {/* Cart drawer */}
              <CartDrawer />
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
