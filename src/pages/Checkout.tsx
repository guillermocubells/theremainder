import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Truck, ShoppingBag, CreditCard, AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCart, calculateTax } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ShippingForm {
  email: string;
  fullName: string;
  phone: string;
  street: string;
  apartment: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
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
  country: "España",
  notes: "",
};

const Checkout = () => {
  const { t, i18n } = useTranslation();
  const { items, getTotalPrice } = useCart();
  const { user } = useAuth();
  const [form, setForm] = useState<ShippingForm>({
    ...INITIAL_FORM,
    email: user?.email || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<ShippingForm>>({});


  const totalPrice = getTotalPrice();
  const taxAmount = calculateTax(totalPrice);

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
    const newErrors: Partial<ShippingForm> = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof ShippingForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t("checkout.errors.fixErrors"));
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare cart items for Stripe
      const cartItems = items.map((item) => ({
        plantId: item.plantId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        containerSize: item.containerSize,
      }));

      // Call the Stripe checkout edge function
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          items: cartItems,
          shippingAddress: form,
          locale: i18n.language,
        },
      });

      if (error) {
        console.error("Checkout function error:", error);
        throw new Error(error.message || "Failed to create checkout session");
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(t("checkout.errors.paymentFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

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
          {t("checkout.backToStore")}
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
          {t("checkout.title")}
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Shipping form */}
            <div className="lg:col-span-2 space-y-6">
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
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-moss" />
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
                    <Label htmlFor="country">{t("checkout.country")}</Label>
                    <Input
                      id="country"
                      value={form.country}
                      onChange={(e) => handleChange("country", e.target.value)}
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
            </div>

            {/* Right: Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {t("checkout.orderSummary")}
                </h2>

                {/* Products list */}
                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={item.plantId} className="flex gap-3">
                      <div className="w-14 h-14 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1 italic">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {item.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        </p>
                        {item.containerSize && (
                          <p className="text-xs text-muted-foreground">{item.containerSize}</p>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {(item.price * item.quantity).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("checkout.subtotal")}</span>
                    <span className="text-foreground">
                      {totalPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-moss" />
                    <span className="text-moss italic text-xs">{t("checkout.shippingTbd")}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-foreground">{t("checkout.total")}</span>
                  <span className="font-bold text-xl text-foreground">
                    {totalPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  {t("checkout.includedTaxes")}:{" "}
                  {taxAmount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </p>

                {/* Payment methods info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Lock className="h-3 w-3" />
                  <span>{t("checkout.securePayment")}</span>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[#635BFF] hover:bg-[#5851DB] text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      {t("checkout.processing")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {t("checkout.placeOrder")}
                    </span>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  {t("checkout.termsNote")}
                </p>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
