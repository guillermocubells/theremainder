import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvoiceItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
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
  status: string;
  issued_at: string;
}

function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateInvoiceHTML(invoice: Invoice): string {
  const itemsHTML = invoice.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.product_name)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_price, invoice.currency)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.subtotal, invoice.currency)}</td>
    </tr>
  `
    )
    .join("");

  const buyerAddressLines: string[] = [];
  if (invoice.buyer_address) {
    const addr = invoice.buyer_address as Record<string, string>;
    if (addr.street) buyerAddressLines.push(addr.street);
    if (addr.apartment) buyerAddressLines.push(addr.apartment);
    if (addr.postal_code || addr.city) {
      buyerAddressLines.push(`${addr.postal_code || ""} ${addr.city || ""}`.trim());
    }
    if (addr.province) buyerAddressLines.push(addr.province);
    if (addr.country) buyerAddressLines.push(addr.country);
  }

  const statusLabel: Record<string, string> = {
    issued: "Emitida",
    cancelled: "Anulada",
    refunded: "Reembolsada",
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${escapeHtml(invoice.invoice_number)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      background: #fff;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #4a7c59; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: bold; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    .party h3 { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
    .party p { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { 
      background: #f9fafb; 
      padding: 12px; 
      text-align: left; 
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .totals-row.total { border-top: 2px solid #1f2937; font-size: 18px; font-weight: bold; margin-top: 8px; padding-top: 16px; }
    .status { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 4px; 
      font-size: 12px; 
      font-weight: 600;
    }
    .status-issued { background: #dcfce7; color: #166534; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .status-refunded { background: #fed7aa; color: #9a3412; }
    .footer { margin-top: 60px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo">🌿 ${escapeHtml(invoice.seller_name)}</div>
        ${invoice.seller_address ? `<p style="color: #6b7280; margin-top: 8px;">${escapeHtml(invoice.seller_address)}</p>` : ""}
        ${invoice.seller_tax_id ? `<p style="color: #6b7280;">NIF: ${escapeHtml(invoice.seller_tax_id)}</p>` : ""}
        ${invoice.seller_email ? `<p style="color: #6b7280;">${escapeHtml(invoice.seller_email)}</p>` : ""}
      </div>
      <div class="invoice-info">
        <div class="invoice-number">${escapeHtml(invoice.invoice_number)}</div>
        <p style="color: #6b7280; margin-top: 8px;">Fecha: ${formatDate(invoice.issued_at)}</p>
        <p style="margin-top: 8px;">
          <span class="status status-${invoice.status}">${statusLabel[invoice.status] || invoice.status}</span>
        </p>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>Facturado a</h3>
        <p><strong>${escapeHtml(invoice.buyer_name)}</strong></p>
        ${invoice.buyer_email ? `<p>${escapeHtml(invoice.buyer_email)}</p>` : ""}
        ${buyerAddressLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Precio</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(invoice.subtotal, invoice.currency)}</span>
      </div>
      ${
        invoice.shipping_cost > 0
          ? `
      <div class="totals-row">
        <span>Envío</span>
        <span>${formatCurrency(invoice.shipping_cost, invoice.currency)}</span>
      </div>
      `
          : ""
      }
      <div class="totals-row total">
        <span>Total</span>
        <span>${formatCurrency(invoice.total_amount, invoice.currency)}</span>
      </div>
    </div>

    <div class="footer">
      <p>Gracias por tu compra</p>
      <p style="margin-top: 4px;">${escapeHtml(invoice.seller_name)}</p>
    </div>
  </div>
</body>
</html>
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    
    if (!userData.user) {
      throw new Error("No autorizado");
    }

    // Check admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Acceso denegado: se requiere rol de administrador");
    }

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      throw new Error("Se requiere invoiceId");
    }

    // Fetch invoice using service role for full access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Factura no encontrada");
    }

    // Generate HTML
    const html = generateInvoiceHTML(invoice as Invoice);

    // Convert HTML to base64 (for now, return HTML that can be printed as PDF)
    // In production, you might want to use a PDF generation service
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);
    const base64 = btoa(String.fromCharCode(...htmlBytes));

    return new Response(
      JSON.stringify({ 
        pdf: base64,
        contentType: "text/html",
        filename: `${invoice.invoice_number}.html`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error generating invoice PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
