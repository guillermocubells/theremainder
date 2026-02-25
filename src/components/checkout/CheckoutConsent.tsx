import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { getCookiePreferences } from "@/components/cookies/CookieConsentBanner";

export interface ConsentState {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  withdrawalWaiver: boolean;
  platformFeeAck: boolean;
  analyticsOptIn: boolean;
  marketingOptIn: boolean;
}

interface CheckoutConsentProps {
  consent: ConsentState;
  onChange: (consent: ConsentState) => void;
  errors?: { terms?: string; privacy?: string; withdrawal?: string; platformFee?: string };
}

export const INITIAL_CONSENT: ConsentState = {
  termsAccepted: false,
  privacyAccepted: false,
  withdrawalWaiver: false,
  platformFeeAck: false,
  analyticsOptIn: getCookiePreferences()?.analytics ?? false,
  marketingOptIn: getCookiePreferences()?.marketing ?? false,
};

export function validateConsent(
  consent: ConsentState,
  t: (key: string, options?: Record<string, string>) => string
): { terms?: string; privacy?: string; withdrawal?: string; platformFee?: string } | null {
  const errors: { terms?: string; privacy?: string; withdrawal?: string; platformFee?: string } = {};
  if (!consent.termsAccepted) errors.terms = t("checkout.consent.termsRequired", { defaultValue: "Debes aceptar las condiciones de venta" });
  if (!consent.privacyAccepted) errors.privacy = t("checkout.consent.privacyRequired", { defaultValue: "Debes aceptar la política de privacidad" });
  if (!consent.withdrawalWaiver) errors.withdrawal = t("checkout.consent.withdrawalRequired", { defaultValue: "Debes aceptar la renuncia al derecho de desistimiento" });
  if (!consent.platformFeeAck) errors.platformFee = t("checkout.consent.platformFeeRequired", { defaultValue: "Debes reconocer la comisión de plataforma" });
  return Object.keys(errors).length > 0 ? errors : null;
}

export function CheckoutConsent({ consent, onChange, errors }: CheckoutConsentProps) {
  const { t } = useTranslation();

  const update = (field: keyof ConsentState, value: boolean) => {
    onChange({ ...consent, [field]: value });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-sm font-medium text-foreground">
        {t("checkout.consent.title", "Consentimiento y privacidad")}
      </p>

      {/* Terms of sale — required */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent-terms"
          checked={consent.termsAccepted}
          onCheckedChange={(v) => update("termsAccepted", v === true)}
          className={errors?.terms ? "border-destructive" : ""}
        />
        <div className="space-y-1">
          <Label htmlFor="consent-terms" className="text-sm leading-snug cursor-pointer">
            {t("checkout.consent.termsLabel", "Acepto las")}{" "}
            <Link to="/condiciones-de-venta" target="_blank" className="underline text-primary hover:text-primary/80">
              {t("checkout.consent.termsLink", "condiciones de venta")}
            </Link>{" "}
            *
          </Label>
          {errors?.terms && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.terms}
            </p>
          )}
        </div>
      </div>

      {/* Privacy policy — required */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent-privacy"
          checked={consent.privacyAccepted}
          onCheckedChange={(v) => update("privacyAccepted", v === true)}
          className={errors?.privacy ? "border-destructive" : ""}
        />
        <div className="space-y-1">
          <Label htmlFor="consent-privacy" className="text-sm leading-snug cursor-pointer">
            {t("checkout.consent.privacyLabel", "He leído y acepto la")}{" "}
            <Link to="/politica-de-privacidad" target="_blank" className="underline text-primary hover:text-primary/80">
              {t("checkout.consent.privacyLink", "política de privacidad")}
            </Link>{" "}
            *
          </Label>
          {errors?.privacy && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.privacy}
            </p>
          )}
        </div>
      </div>

      {/* Withdrawal waiver — required (perishable goods Art. 16(d)) */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent-withdrawal"
          checked={consent.withdrawalWaiver}
          onCheckedChange={(v) => update("withdrawalWaiver", v === true)}
          className={errors?.withdrawal ? "border-destructive" : ""}
        />
        <div className="space-y-1">
          <Label htmlFor="consent-withdrawal" className="text-sm leading-snug cursor-pointer">
            {t("checkout.consent.withdrawalLabel", "Acepto que, al tratarse de productos perecederos (plantas vivas), renuncio al derecho de desistimiento de 14 días conforme al art. 103.d) del RDL 1/2007")}{" "}
            *
          </Label>
          {errors?.withdrawal && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.withdrawal}
            </p>
          )}
        </div>
      </div>

      {/* Platform fee acknowledgment — required */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent-platform-fee"
          checked={consent.platformFeeAck}
          onCheckedChange={(v) => update("platformFeeAck", v === true)}
          className={errors?.platformFee ? "border-destructive" : ""}
        />
        <div className="space-y-1">
          <Label htmlFor="consent-platform-fee" className="text-sm leading-snug cursor-pointer">
            {t("checkout.consent.platformFeeLabel", "Entiendo que se aplica una comisión de plataforma del 6% incluida en el precio final mostrado")}{" "}
            *
          </Label>
          {errors?.platformFee && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.platformFee}
            </p>
          )}
        </div>
      </div>

      {/* Analytics opt-in — optional */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent-analytics"
          checked={consent.analyticsOptIn}
          onCheckedChange={(v) => update("analyticsOptIn", v === true)}
        />
        <Label htmlFor="consent-analytics" className="text-sm leading-snug text-muted-foreground cursor-pointer">
          {t("checkout.consent.analyticsLabel", "Acepto el uso de cookies analíticas para mejorar la experiencia de compra")}
        </Label>
      </div>

      {/* Marketing opt-in — optional */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent-marketing"
          checked={consent.marketingOptIn}
          onCheckedChange={(v) => update("marketingOptIn", v === true)}
        />
        <Label htmlFor="consent-marketing" className="text-sm leading-snug text-muted-foreground cursor-pointer">
          {t("checkout.consent.marketingLabel", "Deseo recibir comunicaciones comerciales y ofertas personalizadas")}
        </Label>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("checkout.consent.footnote", "* Campos obligatorios. Puedes ejercer tus derechos de acceso, rectificación, supresión y portabilidad en cualquier momento.")}
      </p>
    </div>
  );
}
