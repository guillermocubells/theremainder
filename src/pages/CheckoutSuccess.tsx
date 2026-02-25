import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle, Package, ArrowLeft, Leaf, ArrowRight, Loader2,
  ShoppingBag, Truck, Receipt, User,
} from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import AddObservationDialog from "@/components/collection/AddObservationDialog";
import { useOwnedPlants } from "@/hooks/collection/useOwnedPlants";
import { useOrderBySession } from "@/hooks/useOrderBySession";
import type { ShippingAddress } from "@/hooks/useOrders";

const CheckoutSuccess = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [sessionId] = useState(searchParams.get("session_id"));
  const [showObservationPrompt, setShowObservationPrompt] = useState(false);
  const [observationDialogOpen, setObservationDialogOpen] = useState(false);

  const { data: order, isLoading: orderLoading } = useOrderBySession(sessionId);
  const { data: ownedPlants, isLoading: plantsLoading } = useOwnedPlants();

  const recentPlants = ownedPlants?.filter(plant => {
    const createdAt = new Date(plant.created_at);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return createdAt > fiveMinutesAgo;
  }) || [];

  useEffect(() => {
    if (sessionId) {
      clearCart();
      const timer = setTimeout(() => setShowObservationPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [sessionId, clearCart]);

  const shippingAddress = order?.shipping_address as unknown as ShippingAddress | null;
  const taxRate = 0.21;
  const totalAmount = order?.total_amount ?? 0;
  const taxAmount = totalAmount - totalAmount / (1 + taxRate);
  const subtotalBeforeTax = totalAmount / (1 + taxRate);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 px-4 py-10 max-w-3xl mx-auto w-full">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {t("checkout.success.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("checkout.success.message")}
          </p>
        </div>

        {/* Order receipt card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Order number & status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pedido</span>
              </div>
              {orderLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : order ? (
                <span className="font-mono text-sm font-medium text-foreground">
                  {order.order_number}
                </span>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">
                  {sessionId?.slice(0, 20)}...
                </span>
              )}
            </div>

            <Separator className="mb-4" />

            {/* Order items */}
            {orderLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Cargando detalles del pedido...</span>
              </div>
            ) : order?.order_items && order.order_items.length > 0 ? (
              <div className="space-y-3 mb-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1 italic">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatPrice(item.unit_price)}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {formatPrice(item.unit_price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            ) : !orderLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Los detalles del pedido se están procesando...
              </p>
            ) : null}

            {order && (
              <>
                <Separator className="mb-4" />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base imponible</span>
                    <span className="text-foreground">{formatPrice(subtotalBeforeTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA (21%)</span>
                    <span className="text-foreground">{formatPrice(taxAmount)}</span>
                  </div>
                  {(order as any).wallet_amount_used > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Saldo aplicado</span>
                      <span>-{formatPrice((order as any).wallet_amount_used)}</span>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-lg text-foreground">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delivery & Shipping info */}
        {order && shippingAddress && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Shipping address */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Dirección de envío</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>{shippingAddress.full_name}</p>
                    <p>{shippingAddress.street}{shippingAddress.apartment ? `, ${shippingAddress.apartment}` : ''}</p>
                    <p>{shippingAddress.postal_code} {shippingAddress.city}</p>
                    <p>{shippingAddress.province}, {shippingAddress.country}</p>
                  </div>
                </div>

                {/* Delivery ETA */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Entrega estimada</span>
                  </div>
                  <DeliveryEstimate country={shippingAddress.country} />
                </div>
              </div>

              {order.tracking_number && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Seguimiento:</span>
                    {order.tracking_url ? (
                      <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-mono text-primary underline">
                        {order.tracking_number}
                      </a>
                    ) : (
                      <span className="text-sm font-mono text-foreground">{order.tracking_number}</span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plants added to collection */}
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
                    <p className="text-xs text-success">+{recentPlants.length - 3} más...</p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="bg-primary hover:bg-primary/90 flex-1">
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

        {/* Guest prompt */}
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

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {user && (
            <Button asChild variant="outline">
              <Link to="/account" className="inline-flex items-center gap-2">
                <Package className="h-4 w-4" />
                Ver mis pedidos
              </Link>
            </Button>
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

/** Small component to show delivery estimate based on country */
function DeliveryEstimate({ country }: { country: string }) {
  const countryToCode: Record<string, string> = {
    'España': 'ES', 'Spain': 'ES', 'Portugal': 'PT', 'Francia': 'FR', 'France': 'FR',
    'Alemania': 'DE', 'Germany': 'DE', 'Italia': 'IT', 'Italy': 'IT',
  };

  // Estimate ranges by general region
  const code = countryToCode[country] || '';
  let min = 5, max = 10;
  if (code === 'ES') { min = 3; max = 5; }
  else if (['PT', 'FR'].includes(code)) { min = 4; max = 7; }
  else if (['DE', 'IT', 'BE', 'NL', 'AT'].includes(code)) { min = 5; max = 8; }

  const now = new Date();
  const minDate = new Date(now.getTime() + min * 86400000);
  const maxDate = new Date(now.getTime() + max * 86400000);

  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <div className="text-sm text-muted-foreground">
      <p className="text-primary font-medium">{fmt(minDate)} – {fmt(maxDate)}</p>
      <p className="text-xs mt-1">({min}–{max} días laborables)</p>
    </div>
  );
}

export default CheckoutSuccess;
