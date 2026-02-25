import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ShoppingBag, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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

// ── Postal code patterns by country ──
const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  ES: /^\d{5}$/,
  PT: /^\d{4}-?\d{3}$/,
  FR: /^\d{5}$/,
  DE: /^\d{5}$/,
  BE: /^\d{4}$/,
  NL: /^\d{4}\s?[A-Z]{2}$/i,
  LU: /^\d{4}$/,
  AT: /^\d{4}$/,
  IT: /^\d{5}$/,
  SE: /^\d{3}\s?\d{2}$/,
  DK: /^\d{4}$/,
  FI: /^\d{5}$/,
  PL: /^\d{2}-?\d{3}$/,
  CZ: /^\d{3}\s?\d{2}$/,
  SK: /^\d{3}\s?\d{2}$/,
  HU: /^\d{4}$/,
  RO: /^\d{6}$/,
  BG: /^\d{4}$/,
  HR: /^\d{5}$/,
  SI: /^\d{4}$/,
  EE: /^\d{5}$/,
  LV: /^LV-?\d{4}$/i,
  LT: /^LT-?\d{5}$/i,
  IE: /^[A-Z\d]{3}\s?[A-Z\d]{4}$/i,
  MT: /^[A-Z]{3}\s?\d{4}$/i,
  CY: /^\d{4}$/,
  GR: /^\d{3}\s?\d{2}$/,
};

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
  // Track which fields have been touched (for blur validation)
  const [touched, setTouched] = useState<Partial<Record<keyof ShippingForm | "country", boolean>>>({});

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


  // ── Zod schemas (depend on country for postal code) ──
  const contactSchema = z.object({
    email: z.string().trim()
      .min(1, { message: t("common.form.required") })
      .email({ message: t("common.form.invalidEmail") })
      .max(255, { message: t("common.form.tooLong", { max: 255 }) }),
  });

  const postalCodePattern = POSTAL_CODE_PATTERNS[shippingCountry];

  const addressSchema = z.object({
    fullName: z.string().trim()
      .min(2, { message: t("common.form.nameTooShort") })
      .max(100, { message: t("common.form.tooLong", { max: 100 }) }),
    phone: z.string().trim()
      .refine(
        (val) => !val || /^\+?[\d\s\-().]{7,20}$/.test(val),
        { message: t("common.form.invalidPhone") }
      ),
    street: z.string().trim()
      .min(1, { message: t("common.form.required") })
      .max(200, { message: t("common.form.tooLong", { max: 200 }) }),
    apartment: z.string().trim().max(50, { message: t("common.form.tooLong", { max: 50 }) }),
    postalCode: z.string().trim()
      .min(1, { message: t("common.form.required") })
      .max(15, { message: t("common.form.tooLong", { max: 15 }) })
      .refine(
        (val) => !postalCodePattern || postalCodePattern.test(val),
        { message: t("common.form.invalidPostalCode") }
      ),
    city: z.string().trim()
      .min(1, { message: t("common.form.required") })
      .max(100, { message: t("common.form.tooLong", { max: 100 }) }),
    province: z.string().trim()
      .min(1, { message: t("common.form.required") })
      .max(100, { message: t("common.form.tooLong", { max: 100 }) }),
  });

  // ── Field-level validation on blur ──
  const validateField = (field: keyof ShippingForm) => {
    let fieldError: string | undefined;

    if (field === "email") {
      const result = contactSchema.shape.email.safeParse(form.email);
      if (!result.success) fieldError = result.error.issues[0]?.message;
    } else if (field in addressSchema.shape) {
      const shape = addressSchema.shape as Record<string, z.ZodType>;
      const validator = shape[field];
      if (validator) {
        const result = validator.safeParse(form[field]);
        if (!result.success) fieldError = result.error.issues[0]?.message;
      }
    }

    setErrors((prev) => ({ ...prev, [field]: fieldError }));
    return !fieldError;
  };

  const handleBlur = (field: keyof ShippingForm) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
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
    const result = contactSchema.safeParse({ email: form.email });
    if (!result.success) {
      const fieldErrors: Partial<ShippingForm> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof ShippingForm;
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      setTouched((prev) => ({ ...prev, email: true }));
      return false;
    }
    setErrors((prev) => ({ ...prev, email: undefined }));
    return true;
  };

  const validateAddressStep = (): boolean => {
    const result = addressSchema.safeParse({
      fullName: form.fullName,
      phone: form.phone,
      street: form.street,
      apartment: form.apartment,
      postalCode: form.postalCode,
      city: form.city,
      province: form.province,
    });
    if (!result.success) {
      const fieldErrors: Partial<ShippingForm> = {};
      const touchAll: Partial<Record<keyof ShippingForm, boolean>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof ShippingForm;
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
        touchAll[path] = true;
      });
      setErrors(fieldErrors);
      setTouched((prev) => ({ ...prev, ...touchAll }));
      return false;
    }
    setErrors((prev) => {
      const next = { ...prev };
      (["fullName", "phone", "street", "apartment", "postalCode", "city", "province"] as const).forEach((k) => { next[k] = undefined; });
      return next;
    });
    return true;
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
    // Re-validate on change if field was already touched and has an error
    if (touched[field] && errors[field]) {
      // Defer validation to next tick so state is updated
      setTimeout(() => validateField(field), 0);
    }
  };

  const handleCountryChange = (value: string) => {
    setShippingCountry(value);
    if (errors.country) {
      setErrors((prev) => ({ ...prev, country: undefined }));
    }
    // Re-validate postal code when country changes if already touched
    if (touched.postalCode && form.postalCode) {
      setTimeout(() => validateField("postalCode"), 0);
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
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder={t("common.form.emailPlaceholder")}
                  maxLength={255}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
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
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  onBlur={() => handleBlur("fullName")}
                  placeholder={t("common.form.fullNamePlaceholder")}
                  maxLength={100}
                  aria-invalid={!!errors.fullName}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  className={errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.fullName && (
                  <p id="fullName-error" role="alert" className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">{t("common.form.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  onBlur={() => handleBlur("phone")}
                  placeholder={t("common.form.phonePlaceholder")}
                  maxLength={20}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.phone && (
                  <p id="phone-error" role="alert" className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="street">{t("checkout.street")} *</Label>
                <Input
                  id="street"
                  autoComplete="street-address"
                  value={form.street}
                  onChange={(e) => handleChange("street", e.target.value)}
                  onBlur={() => handleBlur("street")}
                  placeholder={t("checkout.streetPlaceholder")}
                  maxLength={200}
                  aria-invalid={!!errors.street}
                  aria-describedby={errors.street ? "street-error" : undefined}
                  className={errors.street ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.street && (
                  <p id="street-error" role="alert" className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {errors.street}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="apartment">{t("checkout.apartment")}</Label>
                <Input
                  id="apartment"
                  autoComplete="address-line2"
                  value={form.apartment}
                  onChange={(e) => handleChange("apartment", e.target.value)}
                  placeholder={t("checkout.apartmentPlaceholder")}
                  maxLength={50}
                />
              </div>

              <div>
                <Label htmlFor="postalCode">{t("checkout.postalCode")} *</Label>
                <Input
                  id="postalCode"
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  onBlur={() => handleBlur("postalCode")}
                  placeholder={t("checkout.postalCodePlaceholder")}
                  maxLength={15}
                  aria-invalid={!!errors.postalCode}
                  aria-describedby={errors.postalCode ? "postalCode-error" : undefined}
                  className={errors.postalCode ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.postalCode && (
                  <p id="postalCode-error" role="alert" className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {errors.postalCode}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="city">{t("checkout.city")} *</Label>
                <Input
                  id="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  onBlur={() => handleBlur("city")}
                  placeholder={t("checkout.cityPlaceholder")}
                  maxLength={100}
                  aria-invalid={!!errors.city}
                  aria-describedby={errors.city ? "city-error" : undefined}
                  className={errors.city ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.city && (
                  <p id="city-error" role="alert" className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {errors.city}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="province">{t("checkout.province")} *</Label>
                <Input
                  id="province"
                  autoComplete="address-level1"
                  value={form.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                  onBlur={() => handleBlur("province")}
                  placeholder={t("checkout.provincePlaceholder")}
                  maxLength={100}
                  aria-invalid={!!errors.province}
                  aria-describedby={errors.province ? "province-error" : undefined}
                  className={errors.province ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.province && (
                  <p id="province-error" role="alert" className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {errors.province}
                  </p>
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
                maxLength={500}
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
