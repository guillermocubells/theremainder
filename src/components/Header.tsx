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
      <header className={`bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-transform duration-300 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Logo & Brand */}
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 sm:gap-3 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="bg-primary p-1.5 sm:p-2 rounded-xl flex-shrink-0">
                <TreePalm className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0 text-left">
                <h1 className="text-base sm:text-2xl font-bold text-foreground leading-tight">{t('header.title')}</h1>
                <p className="text-[10px] sm:text-sm text-primary leading-tight">{t('header.subtitleMobile')}</p>
              </div>
            </button>

            {/* Actions - optimized for mobile */}
            <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
              {/* Plant Finder CTA */}
              <Button 
                onClick={() => setIsPlantFinderOpen(true)}
                variant="default"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-auto sm:px-4 rounded-xl"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">{t('header.findPlant')}</span>
              </Button>

              {/* Language switcher - hidden on mobile, shown in footer */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* Account button */}
              <Button 
                onClick={handleAccountClick}
                variant="ghost" 
                size="icon"
                className="h-9 w-9 hover:bg-secondary text-primary relative rounded-xl"
              >
                <User className="h-5 w-5" />
                {user && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-moss rounded-full border-2 border-card" />
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
