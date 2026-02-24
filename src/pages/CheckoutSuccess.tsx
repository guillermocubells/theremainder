import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, Package, ArrowLeft, Leaf, ArrowRight, Loader2 } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import AddObservationDialog from "@/components/collection/AddObservationDialog";
import { useOwnedPlants } from "@/hooks/collection/useOwnedPlants";

const CheckoutSuccess = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const [sessionId] = useState(searchParams.get("session_id"));
  const [showObservationPrompt, setShowObservationPrompt] = useState(false);
  const [observationDialogOpen, setObservationDialogOpen] = useState(false);
  
  // Get recently added plants (from this order)
  const { data: ownedPlants, isLoading: plantsLoading } = useOwnedPlants();
  
  // Filter plants that were just added (last 5 minutes)
  const recentPlants = ownedPlants?.filter(plant => {
    const createdAt = new Date(plant.created_at);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return createdAt > fiveMinutesAgo;
  }) || [];

  // Clear the cart on successful payment
  useEffect(() => {
    if (sessionId) {
      clearCart();
      // Show observation prompt after a short delay
      const timer = setTimeout(() => {
        setShowObservationPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [sessionId, clearCart]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-primary" />
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

          {/* Plants added to collection notification */}
          {user && (
            <Card className="mb-6 bg-gradient-to-br from-success-muted to-success-muted/60 border-success/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-success-muted p-2 rounded-full">
                    <Leaf className="h-6 w-6 text-success" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-success-muted-foreground">
                      ¡Plantas añadidas a tu colección!
                    </h3>
                    <p className="text-sm text-success">
                      {plantsLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Procesando...
                        </span>
                      ) : recentPlants.length > 0 ? (
                        `${recentPlants.length} planta${recentPlants.length > 1 ? 's' : ''} con código serial único`
                      ) : (
                        "Tus plantas se están añadiendo..."
                      )}
                    </p>
                  </div>
                </div>
                
                {recentPlants.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {recentPlants.slice(0, 3).map(plant => (
                      <div key={plant.id} className="flex items-center gap-2 text-sm text-success-muted-foreground bg-background/50 rounded-lg p-2">
                        <span className="font-mono text-xs bg-success-muted px-2 py-0.5 rounded">
                          {plant.serial_code}
                        </span>
                        <span className="truncate">{plant.nickname}</span>
                      </div>
                    ))}
                    {recentPlants.length > 3 && (
                      <p className="text-xs text-success">
                        +{recentPlants.length - 3} más...
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    asChild 
                    className="bg-primary hover:bg-primary/90 flex-1"
                  >
                    <Link to="/collection">
                      Ir a mi colección
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  {showObservationPrompt && recentPlants.length > 0 && (
                    <Button 
                      variant="outline"
                      className="border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => setObservationDialogOpen(true)}
                    >
                      Añadir observación inicial
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guest user prompt */}
          {!user && (
            <Card className="mb-6 bg-warning-muted border-warning/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Leaf className="h-6 w-6 text-warning" />
                  <h3 className="font-semibold text-warning-muted-foreground">
                    ¿Quieres guardar tus plantas?
                  </h3>
                </div>
                <p className="text-sm text-warning-muted-foreground mb-4">
                  Crea una cuenta para añadir tus plantas a tu colección personal y hacer seguimiento de su cuidado.
                </p>
                <Button asChild variant="outline" className="border-warning/30 text-warning-muted-foreground hover:bg-warning-muted/50">
                  <Link to="/auth">
                    Crear cuenta
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Button asChild variant="outline">
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("checkout.success.backToStore")}
            </Link>
          </Button>
        </div>
      </main>

      <Footer />

      {/* Observation dialog for initial observation */}
      {recentPlants.length > 0 && (
        <AddObservationDialog
          open={observationDialogOpen}
          onOpenChange={setObservationDialogOpen}
          plants={recentPlants}
          preselectedPlantId={recentPlants[0]?.id}
        />
      )}
    </div>
  );
};

export default CheckoutSuccess;
