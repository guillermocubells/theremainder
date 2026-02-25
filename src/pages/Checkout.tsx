import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ShoppingBag, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { CountrySelector } from "@/components/checkout/CountrySelector";
import { ShippingPreview } from "@/components/checkout/ShippingPreview";
import { StripeEmbeddedCheckout } from "@/components/checkout/StripeEmbeddedCheckout";
import { CheckoutOrderSummary } from "@/components/checkout/CheckoutOrderSummary";
import { useShippingQuote } from "@/hooks/useShippingQuote";
import { COUNTRY_NAMES } from "@/utils/shippingCalculator";
import {
  CheckoutAccordionItem,
  StepNavigation,
  CheckoutStep,
  STEP_ICONS,
} from "@/components/checkout/CheckoutAccordion";
import ReferralCodeField from "@/components/checkout/ReferralCodeField";
import ReferralBanner from "@/components/ReferralBanner";
import { CheckoutConsent, ConsentState, INITIAL_CONSENT, validateConsent } from "@/components/checkout/CheckoutConsent";
import { logConsent } from "@/hooks/useConsentLog";

interface ShippingForm {
  email: string;
  fullName: string;
  phone: string;
  street: string;
  apartment: string;
  postalCode: string;
  city: string;
  province: string;
  notes: string;
}

const INITIAL_FORM: ShippingForm = {
  email: "",
  fullName: "",
  phone: "",
  street: "",
  apartment: "",
  postalCode: "",
  city: "",
  province: "",
  notes: "",
};

const STEPS_ORDER: CheckoutStep[] = ["shipping", "contact", "address", "notes", "payment"];

const Checkout = () => {
  const { t } = useTranslation();
  const { items } = useCart();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>("shipping");
  const [completedSteps, setCompletedSteps] = useState<CheckoutStep[]>([]);
  const [shippingCountry, setShippingCountry] = useState<string>("ES");
  const [appliedReferralCode, setAppliedReferralCode] = useState<string | null>(null);
  const [referrerUserId, setReferrerUserId] = useState<string | null>(null);
  const [consent, setConsent] = useState<ConsentState>(INITIAL_CONSENT);
  const [consentErrors, setConsentErrors] = useState<{ terms?: string; privacy?: string; withdrawal?: string; platformFee?: string }>({});
  const [form, setForm] = useState<ShippingForm>({
    ...INITIAL_FORM,
    email: user?.email || "",
  });
  const [errors, setErrors] = useState<Partial<ShippingForm & { country: string }>>({});

  // Get shipping quote from backend
  const { quote, isLoading: isQuoteLoading, error: quoteError } = useShippingQuote({
    items,
    countryCode: shippingCountry,
  });

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">
            {t("checkout.emptyCart")}
          </h1>
          <p className="text-muted-foreground mb-6">{t("checkout.emptyCartMessage")}</p>
          <Button asChild variant="default" className="bg-moss hover:bg-moss/90">
            <Link to="/">{t("common.continueShopping")}</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const completeStep = (step: CheckoutStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps((prev) => [...prev, step]);
    }
  };

  const goToStep = (step: CheckoutStep) => {
    setCurrentStep(step);
  };

  const goToNextStep = () => {
    const currentIndex = STEPS_ORDER.indexOf(currentStep);
    if (currentIndex < STEPS_ORDER.length - 1) {
      completeStep(currentStep);
      setCurrentStep(STEPS_ORDER[currentIndex + 1]);
    }
  };

  const validateShippingStep = (): boolean => {
    if (!shippingCountry) {
      setErrors({ country: t("common.form.required") });
      return false;
    }
    if (!quote?.supported) {
      toast.error(t("checkout.noShippingAvailable"));
      return false;
    }
    setErrors({});
    return true;
  };

  const validateContactStep = (): boolean => {
    const newErrors: Partial<ShippingForm> = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = t("common.form.invalidEmail");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAddressStep = (): boolean => {
    const newErrors: Partial<ShippingForm> = {};
    if (!form.fullName.trim()) newErrors.fullName = t("common.form.required");
    if (!form.street.trim()) newErrors.street = t("common.form.required");
    if (!form.postalCode.trim()) newErrors.postalCode = t("common.form.required");
    if (!form.city.trim()) newErrors.city = t("common.form.required");
    if (!form.province.trim()) newErrors.province = t("common.form.required");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStepContinue = (step: CheckoutStep) => {
    let isValid = false;
    switch (step) {
      case "shipping":
        isValid = validateShippingStep();
        break;
      case "contact":
        isValid = validateContactStep();
        break;
      case "address":
        isValid = validateAddressStep();
        break;
      case "notes":
        const consentValidation = validateConsent(consent, t);
        if (consentValidation) {
          setConsentErrors(consentValidation);
          isValid = false;
        } else {
          setConsentErrors({});
          // Log consent to audit trail
          logConsent({
            eventType: "order_checkout",
            consents: {
              termsAccepted: consent.termsAccepted,
              privacyAccepted: consent.privacyAccepted,
              withdrawalWaiver: consent.withdrawalWaiver,
              platformFeeAck: consent.platformFeeAck,
              analyticsOptIn: consent.analyticsOptIn,
              marketingOptIn: consent.marketingOptIn,
            },
          });
          isValid = true;
        }
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      goToNextStep();
    } else {
      toast.error(t("checkout.errors.fixErrors"));
    }
  };

  const handleChange = (field: keyof ShippingForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCountryChange = (value: string) => {
    setShippingCountry(value);
    if (errors.country) {
      setErrors((prev) => ({ ...prev, country: undefined }));
    }
  };

  const canProceedShipping = quote?.supported && !isQuoteLoading;

  // Build summaries for collapsed steps
  const getSummary = (step: CheckoutStep): string | undefined => {
    switch (step) {
      case "shipping":
        const shippingEuros = quote ? quote.shippingCostCents / 100 : 0;
        return quote ? `${COUNTRY_NAMES[shippingCountry]} - ${shippingEuros === 0 ? "Envío gratis" : `${shippingEuros.toFixed(2)}€`}` : undefined;
      case "contact":
        return form.email || undefined;
      case "address":
        return form.street ? `${form.street}, ${form.city}` : undefined;
      case "notes":
        return form.notes ? form.notes.substring(0, 50) + (form.notes.length > 50 ? "..." : "") : "Sin notas";
      default:
        return undefined;
    }
  };

  const stepConfigs = [
    { id: "shipping" as CheckoutStep, title: t("checkout.shippingDestination"), icon: STEP_ICONS.shipping },
    { id: "contact" as CheckoutStep, title: t("checkout.contact"), icon: STEP_ICONS.contact },
    { id: "address" as CheckoutStep, title: t("checkout.shippingAddress"), icon: STEP_ICONS.address },
    { id: "notes" as CheckoutStep, title: t("checkout.orderNotes"), icon: STEP_ICONS.notes },
    { id: "payment" as CheckoutStep, title: t("checkout.payment"), icon: STEP_ICONS.payment },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.backToStore")}
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
          {t("checkout.title")}
        </h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main checkout flow */}
          <div className="flex-1 space-y-4">
          {/* Referral banner above checkout steps */}
          <ReferralBanner compact />
          {/* Step 1: Shipping Destination */}
          <CheckoutAccordionItem
            step={{ ...stepConfigs[0], summary: getSummary("shipping") }}
            stepNumber={1}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
          >
            <div className="space-y-4">
              <CountrySelector
                value={shippingCountry}
                onChange={handleCountryChange}
                error={errors.country}
              />
              <ShippingPreview
                quote={quote}
                isLoading={isQuoteLoading}
                error={quoteError}
                countryCode={shippingCountry}
              />
              <StepNavigation
                onContinue={() => handleStepContinue("shipping")}
                continueLabel={t("checkout.continue")}
                disabled={!canProceedShipping}
                isLoading={isQuoteLoading}
              />
            </div>
          </CheckoutAccordionItem>

          {/* Step 2: Contact */}
          <CheckoutAccordionItem
            step={{ ...stepConfigs[1], summary: getSummary("contact") }}
            stepNumber={2}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">{t("common.form.email")} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder={t("common.form.emailPlaceholder")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>
              <StepNavigation
                onContinue={() => handleStepContinue("contact")}
                continueLabel={t("checkout.continue")}
              />
            </div>
          </CheckoutAccordionItem>

          {/* Step 3: Address */}
          <CheckoutAccordionItem
            step={{ ...stepConfigs[2], summary: getSummary("address") }}
            stepNumber={3}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="fullName">{t("common.form.fullName")} *</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder={t("common.form.fullNamePlaceholder")}
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive mt-1">{errors.fullName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">{t("common.form.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder={t("common.form.phonePlaceholder")}
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="street">{t("checkout.street")} *</Label>
                <Input
                  id="street"
                  value={form.street}
                  onChange={(e) => handleChange("street", e.target.value)}
                  placeholder={t("checkout.streetPlaceholder")}
                  className={errors.street ? "border-destructive" : ""}
                />
                {errors.street && (
                  <p className="text-xs text-destructive mt-1">{errors.street}</p>
                )}
              </div>

              <div>
                <Label htmlFor="apartment">{t("checkout.apartment")}</Label>
                <Input
                  id="apartment"
                  value={form.apartment}
                  onChange={(e) => handleChange("apartment", e.target.value)}
                  placeholder={t("checkout.apartmentPlaceholder")}
                />
              </div>

              <div>
                <Label htmlFor="postalCode">{t("checkout.postalCode")} *</Label>
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  placeholder={t("checkout.postalCodePlaceholder")}
                  className={errors.postalCode ? "border-destructive" : ""}
                />
                {errors.postalCode && (
                  <p className="text-xs text-destructive mt-1">{errors.postalCode}</p>
                )}
              </div>

              <div>
                <Label htmlFor="city">{t("checkout.city")} *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder={t("checkout.cityPlaceholder")}
                  className={errors.city ? "border-destructive" : ""}
                />
                {errors.city && (
                  <p className="text-xs text-destructive mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <Label htmlFor="province">{t("checkout.province")} *</Label>
                <Input
                  id="province"
                  value={form.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                  placeholder={t("checkout.provincePlaceholder")}
                  className={errors.province ? "border-destructive" : ""}
                />
                {errors.province && (
                  <p className="text-xs text-destructive mt-1">{errors.province}</p>
                )}
              </div>

              <div>
                <Label>{t("checkout.country")}</Label>
                <Input
                  value={COUNTRY_NAMES[shippingCountry] || shippingCountry}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="sm:col-span-2">
                <StepNavigation
                  onContinue={() => handleStepContinue("address")}
                  continueLabel={t("checkout.continue")}
                />
              </div>
            </div>
          </CheckoutAccordionItem>

          {/* Step 4: Notes */}
          <CheckoutAccordionItem
            step={{ ...stepConfigs[3], summary: getSummary("notes") }}
            stepNumber={4}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
          >
            <div className="space-y-4">
              <Textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder={t("checkout.notesPlaceholder")}
                rows={3}
              />
              
              {/* Referral Code Field */}
              <ReferralCodeField
                appliedCode={appliedReferralCode}
                onApply={(code, userId) => {
                  setAppliedReferralCode(code);
                  setReferrerUserId(userId);
                }}
                onRemove={() => {
                  setAppliedReferralCode(null);
                  setReferrerUserId(null);
                }}
              />

              {/* GDPR Consent */}
              <CheckoutConsent
                consent={consent}
                onChange={(c) => {
                  setConsent(c);
                  if (consentErrors.terms || consentErrors.privacy) setConsentErrors({});
                }}
                errors={consentErrors}
              />

              <StepNavigation
                onContinue={() => handleStepContinue("notes")}
                continueLabel={t("checkout.continueToPayment")}
              />
            </div>
          </CheckoutAccordionItem>

          {/* Step 5: Payment */}
          <CheckoutAccordionItem
            step={stepConfigs[4]}
            stepNumber={5}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
            canEdit={completedSteps.includes("notes")}
          >
            <StripeEmbeddedCheckout
              items={items}
              shippingCountry={shippingCountry}
              shippingForm={form}
              referralCode={appliedReferralCode}
              referrerUserId={referrerUserId}
            />
            </CheckoutAccordionItem>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:w-[380px] lg:flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <CheckoutOrderSummary
                items={items}
                quote={quote}
                isQuoteLoading={isQuoteLoading}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
