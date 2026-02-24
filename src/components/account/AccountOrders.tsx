import { useState } from 'react';
import { useOrders, Order } from '@/hooks/useOrders';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, ChevronRight, Loader2, ExternalLink, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AccountOrders = () => {
  const { data: orders, isLoading } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning-muted text-warning-muted-foreground';
      case 'paid': return 'bg-info-muted text-info-muted-foreground';
      case 'shipped': return 'bg-highlight-muted text-highlight-muted-foreground';
      case 'delivered': return 'bg-success-muted text-success-muted-foreground';
      case 'cancelled': return 'bg-danger-muted text-danger-muted-foreground';
      default: return 'bg-neutral-muted text-neutral-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'paid': return 'Pagado';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const handleDownloadInvoice = async (order: Order) => {
    if (!order.invoice_id) {
      toast.error("No hay factura disponible para este pedido");
      return;
    }

    setDownloadingInvoice(order.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoiceId: order.invoice_id },
      });

      if (error) throw error;

      // Decode base64 HTML and open in a new tab for print-to-PDF
      const htmlContent = atob(data.pdf);
      const blob = new Blob([htmlContent], { type: "text/html; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Factura abierta — usa Ctrl+P para guardar como PDF");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Error al descargar la factura");
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const canDownloadInvoice = (order: Order) =>
    order.invoice_id && ['paid', 'shipped', 'delivered'].includes(order.status);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis pedidos</h1>
        <p className="text-muted-foreground mt-1">Consulta el estado de tus compras</p>
      </div>

      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card 
              key={order.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.order_items?.length || 0} artículo(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <p className="text-lg font-bold text-foreground mt-1">
                        {order.total_amount.toFixed(2)}€
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Sin pedidos</h3>
            <p className="text-muted-foreground">
              Aún no has realizado ningún pedido. ¡Explora nuestra colección de plantas!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Order detail modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del pedido {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status and date */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusLabel(selectedOrder.status)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedOrder.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                </span>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-medium text-foreground mb-3">Artículos</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      {item.product_image && (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">Cantidad: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-foreground">
                        {(item.unit_price * item.quantity).toFixed(2)}€
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping address */}
              <div>
                <h3 className="font-medium text-foreground mb-3">Dirección de envío</h3>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{selectedOrder.shipping_address.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.shipping_address.street}</p>
                  {selectedOrder.shipping_address.apartment && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.shipping_address.apartment}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.shipping_address.postal_code} {selectedOrder.shipping_address.city}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.shipping_address.province}, {selectedOrder.shipping_address.country}
                  </p>
                </div>
              </div>

              {/* Tracking */}
              {selectedOrder.tracking_url && (
                <div>
                  <h3 className="font-medium text-foreground mb-3">Seguimiento</h3>
                  <Button asChild variant="outline" className="w-full">
                    <a href={selectedOrder.tracking_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Seguir envío
                    </a>
                  </Button>
                </div>
              )}

              {/* Total + Invoice */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {selectedOrder.total_amount.toFixed(2)}€
                  </span>
                </div>

                {canDownloadInvoice(selectedOrder) && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadInvoice(selectedOrder);
                    }}
                    disabled={downloadingInvoice === selectedOrder.id}
                  >
                    {downloadingInvoice === selectedOrder.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Descargar factura
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountOrders;
