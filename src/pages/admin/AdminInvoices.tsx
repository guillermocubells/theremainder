import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Download, Eye, Search, X, FileText, Building2, User } from "lucide-react";
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
  invoice_type: "standard" | "rectificativa";
  customer_type: "b2c" | "b2b";
  order_id: string;
  user_id: string;
  seller_name: string;
  seller_address: string | null;
  seller_tax_id: string | null;
  seller_email: string | null;
  buyer_name: string;
  buyer_legal_name: string | null;
  buyer_email: string | null;
  buyer_tax_id: string | null;
  buyer_address: Record<string, unknown> | null;
  rectifies_invoice_id: string | null;
  rectifies_invoice_number: string | null;
  rectification_reason: string | null;
  items: InvoiceItem[];
  base_imponible: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  currency: string;
  status: "issued" | "cancelled" | "refunded" | "partially_refunded" | "void";
  issued_at: string;
  cancelled_at: string | null;
  snapshot_hash: string | null;
  created_at: string;
}

interface InvoiceSeries {
  id: string;
  code: string;
  name: string;
  prefix: string;
  year: number;
  series_type: string;
}

const statusColors: Record<string, string> = {
  issued: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
  partially_refunded: "bg-amber-100 text-amber-800",
  void: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  issued: "Emitida",
  cancelled: "Anulada",
  refunded: "Reembolsada",
  partially_refunded: "Parcial",
  void: "Anulada",
};

const invoiceTypeLabels: Record<string, string> = {
  standard: "Factura",
  rectificativa: "Rectificativa",
};

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [series, setSeries] = useState<InvoiceSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
    fetchSeries();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [searchTerm, typeFilter, customerTypeFilter, seriesFilter, invoices]);

  async function fetchInvoices() {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("issued_at", { ascending: false });

      if (error) throw error;
      setInvoices((data as unknown as Invoice[]) || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Error al cargar las facturas");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchSeries() {
    try {
      const { data, error } = await supabase
        .from("invoice_series")
        .select("*")
        .eq("is_active", true)
        .order("year", { ascending: false });

      if (error) throw error;
      setSeries((data as unknown as InvoiceSeries[]) || []);
    } catch (error) {
      console.error("Error fetching series:", error);
    }
  }

  function filterInvoices() {
    let filtered = [...invoices];

    // Text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(term) ||
          inv.buyer_email?.toLowerCase().includes(term) ||
          inv.buyer_name.toLowerCase().includes(term) ||
          inv.buyer_tax_id?.toLowerCase().includes(term) ||
          inv.buyer_legal_name?.toLowerCase().includes(term)
      );
    }

    // Invoice type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((inv) => inv.invoice_type === typeFilter);
    }

    // Customer type filter
    if (customerTypeFilter !== "all") {
      filtered = filtered.filter((inv) => inv.customer_type === customerTypeFilter);
    }

    // Series filter
    if (seriesFilter !== "all") {
      filtered = filtered.filter((inv) => 
        inv.invoice_number.startsWith(seriesFilter)
      );
    }

    setFilteredInvoices(filtered);
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

      // Decode base64 HTML and open in new tab for print-to-PDF
      const htmlContent = atob(data.pdf);
      const blob = new Blob([htmlContent], { type: "text/html; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      toast.success("Factura abierta — usa Ctrl+P para guardar como PDF");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Error al descargar la factura");
    } finally {
      setIsDownloading(null);
    }
  };

  const getInvoiceTypeIcon = (invoice: Invoice) => {
    if (invoice.invoice_type === "rectificativa") {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (invoice.customer_type === "b2b") {
      return <Building2 className="h-4 w-4 text-blue-500" />;
    }
    return <User className="h-4 w-4 text-purple-500" />;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setCustomerTypeFilter("all");
    setSeriesFilter("all");
  };

  const hasActiveFilters = searchTerm || typeFilter !== "all" || customerTypeFilter !== "all" || seriesFilter !== "all";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Facturas</h1>
        <p className="text-muted-foreground">
          Sistema de facturación española (B2C/B2B) con rectificativas
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº, email, NIF o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="standard">Facturas</SelectItem>
            <SelectItem value="rectificativa">Rectificativas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">B2C + B2B</SelectItem>
            <SelectItem value="b2c">B2C</SelectItem>
            <SelectItem value="b2b">B2B</SelectItem>
          </SelectContent>
        </Select>

        <Select value={seriesFilter} onValueChange={setSeriesFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Serie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las series</SelectItem>
            {series.map((s) => (
              <SelectItem key={s.id} value={s.prefix + "-" + s.year}>
                {s.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} size="sm">
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total facturas</p>
          <p className="text-2xl font-bold">{invoices.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">B2B</p>
          <p className="text-2xl font-bold text-blue-600">
            {invoices.filter(i => i.customer_type === "b2b" && i.invoice_type === "standard").length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">B2C</p>
          <p className="text-2xl font-bold text-purple-600">
            {invoices.filter(i => i.customer_type === "b2c" && i.invoice_type === "standard").length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Rectificativas</p>
          <p className="text-2xl font-bold text-red-600">
            {invoices.filter(i => i.invoice_type === "rectificativa").length}
          </p>
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
              {hasActiveFilters ? "No se encontraron facturas con estos filtros" : "No hay facturas"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getInvoiceTypeIcon(invoice)}
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">
                          {invoiceTypeLabels[invoice.invoice_type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {invoice.customer_type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono font-medium">
                      {invoice.invoice_number}
                    </div>
                    {invoice.rectifies_invoice_number && (
                      <div className="text-xs text-muted-foreground">
                        Rectifica: {invoice.rectifies_invoice_number}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.issued_at), "dd MMM yyyy", {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>
                    <div>
                      {invoice.customer_type === "b2b" && invoice.buyer_legal_name 
                        ? invoice.buyer_legal_name 
                        : invoice.buyer_name}
                    </div>
                    {invoice.buyer_tax_id && (
                      <div className="text-xs text-blue-600 font-medium">
                        {invoice.buyer_tax_id}
                      </div>
                    )}
                    {invoice.buyer_email && (
                      <div className="text-xs text-muted-foreground">
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
                        title="Descargar"
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
            <DialogTitle className="flex items-center gap-2">
              {selectedInvoice && getInvoiceTypeIcon(selectedInvoice)}
              {selectedInvoice?.invoice_type === "rectificativa" ? "Rectificativa" : "Factura"}{" "}
              {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Rectificativa notice */}
              {selectedInvoice.invoice_type === "rectificativa" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="font-medium text-amber-800">Factura Rectificativa</p>
                  {selectedInvoice.rectifies_invoice_number && (
                    <p className="text-sm text-amber-700">
                      Rectifica a: <strong>{selectedInvoice.rectifies_invoice_number}</strong>
                    </p>
                  )}
                  {selectedInvoice.rectification_reason && (
                    <p className="text-sm text-amber-700">
                      Motivo: {selectedInvoice.rectification_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Header info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Emisor</h4>
                  <p className="text-sm">{selectedInvoice.seller_name}</p>
                  {selectedInvoice.seller_tax_id && (
                    <p className="text-sm font-medium text-foreground">
                      NIF: {selectedInvoice.seller_tax_id}
                    </p>
                  )}
                  {selectedInvoice.seller_address && (
                    <p className="text-sm text-muted-foreground">
                      {selectedInvoice.seller_address}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">
                    Receptor ({selectedInvoice.customer_type.toUpperCase()})
                  </h4>
                  {selectedInvoice.customer_type === "b2b" && selectedInvoice.buyer_legal_name ? (
                    <>
                      <p className="text-sm font-medium">{selectedInvoice.buyer_legal_name}</p>
                      {selectedInvoice.buyer_tax_id && (
                        <p className="text-sm text-blue-600 font-medium">
                          NIF/CIF: {selectedInvoice.buyer_tax_id}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm">{selectedInvoice.buyer_name}</p>
                  )}
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
                      <TableHead className="text-right">Importe</TableHead>
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
                    {selectedInvoice.shipping_cost > 0 && (
                      <TableRow>
                        <TableCell>Gastos de envío</TableCell>
                        <TableCell className="text-center">1</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(selectedInvoice.shipping_cost, selectedInvoice.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(selectedInvoice.shipping_cost, selectedInvoice.currency)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Imponible</span>
                  <span>{formatCurrency(selectedInvoice.base_imponible, selectedInvoice.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA ({selectedInvoice.tax_rate}%)</span>
                  <span>{formatCurrency(selectedInvoice.tax_amount, selectedInvoice.currency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                  <span>Total</span>
                  <span>
                    {formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}
                  </span>
                </div>
              </div>

              {/* Hash info */}
              {selectedInvoice.snapshot_hash && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">Hash VERI*FACTU:</p>
                  <p className="text-xs font-mono break-all text-muted-foreground">
                    {selectedInvoice.snapshot_hash}
                  </p>
                </div>
              )}

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
                  Descargar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
