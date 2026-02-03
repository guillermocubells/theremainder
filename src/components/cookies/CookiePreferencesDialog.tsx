import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, BarChart3, Megaphone, Settings2, Lock } from "lucide-react";
import type { CookiePreferences } from "./CookieConsentBanner";

interface CookiePreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (preferences: CookiePreferences) => void;
  initialPreferences: CookiePreferences;
}

interface CookieCategory {
  key: keyof CookiePreferences;
  icon: React.ElementType;
  required?: boolean;
}

const COOKIE_CATEGORIES: CookieCategory[] = [
  { key: "essential", icon: Shield, required: true },
  { key: "functional", icon: Settings2 },
  { key: "analytics", icon: BarChart3 },
  { key: "marketing", icon: Megaphone },
];

export const CookiePreferencesDialog = ({
  open,
  onOpenChange,
  onSave,
  initialPreferences,
}: CookiePreferencesDialogProps) => {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<CookiePreferences>(initialPreferences);

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === "essential") return; // Cannot disable essential cookies
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSave(preferences);
  };

  const acceptAll = () => {
    onSave({
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {t('cookies.preferences.title', 'Preferencias de cookies')}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t('cookies.preferences.description', 'Configura qué tipos de cookies deseas permitir. Las cookies esenciales son necesarias para el funcionamiento del sitio.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {COOKIE_CATEGORIES.map(({ key, icon: Icon, required }) => (
            <div
              key={key}
              className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/30"
            >
              <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor={`cookie-${key}`} className="font-medium text-sm">
                    {t(`cookies.categories.${key}.title`, key)}
                  </Label>
                  {required && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      <Lock className="h-2.5 w-2.5" />
                      {t('cookies.required', 'Requeridas')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(`cookies.categories.${key}.description`, '')}
                </p>
              </div>
              <Switch
                id={`cookie-${key}`}
                checked={preferences[key]}
                onCheckedChange={() => handleToggle(key)}
                disabled={required}
                className="flex-shrink-0"
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSave} className="sm:flex-1">
            {t('cookies.preferences.saveSelection', 'Guardar selección')}
          </Button>
          <Button onClick={acceptAll} className="sm:flex-1">
            {t('cookies.preferences.acceptAll', 'Aceptar todas')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
