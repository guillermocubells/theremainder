import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { CookiePreferencesDialog } from "./CookiePreferencesDialog";
import { STORAGE_KEYS } from "@/config/store";

export interface CookiePreferences {
  essential: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  functional: false,
};

const COOKIE_CONSENT_KEY = STORAGE_KEYS.cookieConsent;
const COOKIE_PREFERENCES_KEY = STORAGE_KEYS.cookiePreferences;

export const getCookiePreferences = (): CookiePreferences | null => {
  const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const hasGivenConsent = (): boolean => {
  return localStorage.getItem(COOKIE_CONSENT_KEY) === "true";
};

const CookieConsentBanner = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    if (!hasGivenConsent()) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = (preferences: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
    setIsVisible(false);
    setShowPreferences(false);
  };

  const acceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    });
  };

  const acceptEssentialOnly = () => {
    savePreferences(DEFAULT_PREFERENCES);
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
              {/* Icon & Text */}
              <div className="flex gap-3 flex-1">
                <div className="bg-primary/10 p-2.5 rounded-xl flex-shrink-0 h-fit">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">
                    {t('cookies.banner.title', 'Utilizamos cookies')}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {t('cookies.banner.description', 'Usamos cookies para mejorar tu experiencia, analizar el tráfico y personalizar el contenido. Puedes configurar tus preferencias o aceptar todas las cookies.')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreferences(true)}
                  className="text-xs sm:text-sm h-9 rounded-lg"
                >
                  {t('cookies.banner.customize', 'Personalizar')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={acceptEssentialOnly}
                  className="text-xs sm:text-sm h-9 rounded-lg"
                >
                  {t('cookies.banner.essentialOnly', 'Solo esenciales')}
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="text-xs sm:text-sm h-9 rounded-lg"
                >
                  {t('cookies.banner.acceptAll', 'Aceptar todas')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CookiePreferencesDialog
        open={showPreferences}
        onOpenChange={setShowPreferences}
        onSave={savePreferences}
        initialPreferences={getCookiePreferences() || DEFAULT_PREFERENCES}
      />
    </>
  );
};

export default CookieConsentBanner;
