import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, Package, ArrowLeft } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

const CheckoutSuccess = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [sessionId] = useState(searchParams.get("session_id"));

  // Clear the cart on successful payment
  useEffect(() => {
    if (sessionId) {
      clearCart();
    }
  }, [sessionId, clearCart]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-moss/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-moss" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            {t("checkout.success.title")}
          </h1>

          <p className="text-muted-foreground mb-6">
            {t("checkout.success.message")}
          </p>

          {sessionId && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{t("checkout.success.orderNumber")}:</span>
              </div>
              <p className="font-mono text-sm text-foreground mt-1">
                {sessionId.slice(0, 20)}...
              </p>
            </div>
          )}

          <Button asChild variant="default" className="bg-moss hover:bg-moss/90">
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("checkout.success.backToStore")}
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutSuccess;
