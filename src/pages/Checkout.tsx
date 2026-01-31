import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Truck, ShoppingBag, AlertCircle } from "lucide-react";
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
import { useShippingQuote } from "@/hooks/useShippingQuote";
import { COUNTRY_NAMES } from "@/utils/shippingCalculator";

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

const Checkout = () => {
  const { t } = useTranslation();
  const { items } = useCart();
  const { user } = useAuth();

  const [shippingCountry, setShippingCountry] = useState<string>("ES");
  const [form, setForm] = useState<ShippingForm>({
    ...INITIAL_FORM,
    email: user?.email || "",
  });
  const [errors, setErrors] = useState<Partial<ShippingForm & { country: string }>>({});
  const [showPayment, setShowPayment] = useState(false);

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
            <Link to="/">{t("checkout.continueShopping")}</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingForm & { country: string }> = {};

    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = t("checkout.errors.invalidEmail");
    }
    if (!form.fullName.trim()) {
      newErrors.fullName = t("checkout.errors.required");
    }
    if (!form.street.trim()) {
      newErrors.street = t("checkout.errors.required");
    }
    if (!form.postalCode.trim()) {
      newErrors.postalCode = t("checkout.errors.required");
    }
    if (!form.city.trim()) {
      newErrors.city = t("checkout.errors.required");
    }
    if (!form.province.trim()) {
      newErrors.province = t("checkout.errors.required");
    }
    if (!shippingCountry) {
      newErrors.country = t("checkout.errors.required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof ShippingForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Hide payment form when form changes
    if (showPayment) {
      setShowPayment(false);
    }
  };

  const handleCountryChange = (value: string) => {
    setShippingCountry(value);
    if (errors.country) {
      setErrors((prev) => ({ ...prev, country: undefined }));
    }
    // Hide payment form when country changes
    if (showPayment) {
      setShowPayment(false);
    }
  };

  const handleContinueToPayment = () => {
    if (!validateForm()) {
      toast.error(t("checkout.errors.fixErrors"));
      return;
    }

    if (!quote || !quote.supported) {
      toast.error(t("checkout.noShippingAvailable"));
      return;
    }

    setShowPayment(true);
  };

  const canProceed = quote?.supported && !isQuoteLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("checkout.backToStore")}
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
          {t("checkout.title")}
        </h1>

        <div className="space-y-6">
          {/* Shipping country - FIRST */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-moss" />
              {t("checkout.shippingDestination")}
            </h2>

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
            </div>
          </section>

          {/* Contact section */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t("checkout.contact")}
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">{t("checkout.email")} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder={t("checkout.emailPlaceholder")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Shipping address section */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t("checkout.shippingAddress")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="fullName">{t("checkout.fullName")} *</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder={t("checkout.fullNamePlaceholder")}
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive mt-1">{errors.fullName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">{t("checkout.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder={t("checkout.phonePlaceholder")}
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
            </div>
          </section>

          {/* Notes section */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t("checkout.orderNotes")}
            </h2>
            <Textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder={t("checkout.notesPlaceholder")}
              rows={3}
            />
          </section>

          {/* Continue to Payment button (only shown before payment form) */}
          {!showPayment && (
            <div className="flex justify-end">
              <Button
                type="button"
                size="lg"
                onClick={handleContinueToPayment}
                disabled={!canProceed}
                className="bg-moss hover:bg-moss/90 text-white min-w-[200px]"
              >
                {t("checkout.continueToPayment")}
              </Button>
            </div>
          )}

          {/* Stripe Embedded Checkout */}
          {showPayment && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {t("checkout.payment")}
              </h2>
              <StripeEmbeddedCheckout
                items={items}
                shippingCountry={shippingCountry}
                shippingForm={form}
              />
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
