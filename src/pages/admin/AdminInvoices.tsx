import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Download, Eye, Search, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface InvoiceItem {
  product_name: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  user_id: string;
  seller_name: string;
  seller_address: string | null;
  seller_tax_id: string | null;
  seller_email: string | null;
  buyer_name: string;
  buyer_email: string | null;
  buyer_address: Record<string, unknown> | null;
  items: InvoiceItem[];
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  currency: string;
  status: "issued" | "cancelled" | "refunded";
  issued_at: string;
  cancelled_at: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  issued: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<string, string> = {
  issued: "Emitida",
  cancelled: "Anulada",
  refunded: "Reembolsada",
};

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = invoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(term) ||
        inv.buyer_email?.toLowerCase().includes(term) ||
        inv.buyer_name.toLowerCase().includes(term)
    );
    setFilteredInvoices(filtered);
  }, [searchTerm, invoices]);

  async function fetchInvoices() {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("issued_at", { ascending: false });

      if (error) throw error;
      setInvoices((data as unknown as Invoice[]) || []);
      setFilteredInvoices((data as unknown as Invoice[]) || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Error al cargar las facturas");
    } finally {
      setIsLoading(false);
    }
  }

  const formatCurrency = (amount: number, currency: string = "EUR") =>
    amount.toLocaleString("es-ES", { style: "currency", currency });

  const handleDownloadPDF = async (invoice: Invoice) => {
    setIsDownloading(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoiceId: invoice.id },
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], {
        type: "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Factura descargada");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Error al descargar la factura");
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Facturas</h1>
        <p className="text-muted-foreground">
          Gestiona las facturas generadas automáticamente
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº factura, email o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-moss" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? "No se encontraron facturas" : "No hay facturas"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Factura</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.issued_at), "dd MMM yyyy", {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>
                    <div>{invoice.buyer_name}</div>
                    {invoice.buyer_email && (
                      <div className="text-sm text-muted-foreground">
                        {invoice.buyer_email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[invoice.status] || ""}>
                      {statusLabels[invoice.status] || invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedInvoice(invoice)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadPDF(invoice)}
                        disabled={isDownloading === invoice.id}
                        title="Descargar PDF"
                      >
                        {isDownloading === invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Factura {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Vendedor</h4>
                  <p className="text-sm">{selectedInvoice.seller_name}</p>
                  {selectedInvoice.seller_address && (
                    <p className="text-sm text-muted-foreground">
                      {selectedInvoice.seller_address}
                    </p>
                  )}
                  {selectedInvoice.seller_tax_id && (
                    <p className="text-sm text-muted-foreground">
                      NIF: {selectedInvoice.seller_tax_id}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Cliente</h4>
                  <p className="text-sm">{selectedInvoice.buyer_name}</p>
                  {selectedInvoice.buyer_email && (
                    <p className="text-sm text-muted-foreground">
                      {selectedInvoice.buyer_email}
                    </p>
                  )}
                </div>
              </div>

              {/* Status & Date */}
              <div className="flex items-center justify-between py-3 border-y border-border">
                <div>
                  <span className="text-sm text-muted-foreground">Fecha: </span>
                  <span className="text-sm font-medium">
                    {format(new Date(selectedInvoice.issued_at), "dd/MM/yyyy HH:mm", {
                      locale: es,
                    })}
                  </span>
                </div>
                <Badge className={statusColors[selectedInvoice.status]}>
                  {statusLabels[selectedInvoice.status]}
                </Badge>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-3">Detalle</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price, selectedInvoice.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.subtotal, selectedInvoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedInvoice.subtotal, selectedInvoice.currency)}</span>
                </div>
                {selectedInvoice.shipping_cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span>
                      {formatCurrency(selectedInvoice.shipping_cost, selectedInvoice.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                  <span>Total</span>
                  <span>
                    {formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  disabled={isDownloading === selectedInvoice.id}
                >
                  {isDownloading === selectedInvoice.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
