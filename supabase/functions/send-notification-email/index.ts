import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

interface EmailRequest {
  type: "stock_available" | "order_shipped" | "order_delivered" | "welcome" | "order_confirmed";
  to: string;
  lang?: "es" | "en";
  data: Record<string, unknown>;
}

function formatCurrency(amount: number, lang: string): string {
  const locale = lang === "en" ? "en-GB" : "es-ES";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(amount);
}

// ---------- Shared styles ----------
const wrapHtml = (body: string) => `
  <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
    ${body}
    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
    <p style="font-size: 11px; color: #999; text-align: center;">
      © ${new Date().getFullYear()} The Remainder · theremainder.lovable.app
    </p>
  </div>
`;

const ctaButton = (href: string, label: string) =>
  `<a href="${href}" style="display: inline-block; background: #1a472a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">${label}</a>`;

// ---------- Template definitions ----------
type TemplateGenerator = (data: Record<string, unknown>, lang: string) => { subject: string; html: string };

const templates: Record<string, TemplateGenerator> = {

  // ─── Stock available ───
  stock_available: (data, lang) => {
    const isEn = lang === "en";
    return {
      subject: isEn
        ? `${data.plant_name} is now available!`
        : `¡${data.plant_name} ya está disponible!`,
      html: wrapHtml(`
        <h1 style="color: #1a472a;">${isEn ? "Great news!" : "¡Buenas noticias!"}</h1>
        <p>${isEn ? "The plant you were waiting for is now available:" : "La planta que estabas esperando ya está disponible:"}</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0; color: #333;">${data.plant_name}</h2>
          <p style="margin: 0; color: #666; font-style: italic;">${data.scientific_name || ""}</p>
          <p style="margin: 10px 0 0 0; font-size: 18px; color: #1a472a; font-weight: bold;">${data.price}€</p>
        </div>
        ${ctaButton(String(data.plant_url), isEn ? "View plant" : "Ver planta")}
        <p style="margin-top: 30px; color: #888; font-size: 12px;">
          ${isEn ? "You received this email because you subscribed to stock notifications on The Remainder." : "Recibiste este email porque te suscribiste a notificaciones de stock en The Remainder."}
        </p>
      `),
    };
  },

  // ─── Order shipped ───
  order_shipped: (data, lang) => {
    const isEn = lang === "en";
    return {
      subject: isEn
        ? `Your order ${data.order_number} has been shipped`
        : `Tu pedido ${data.order_number} ha sido enviado`,
      html: wrapHtml(`
        <h1 style="color: #1a472a;">${isEn ? "Your order is on its way! 🌿" : "¡Tu pedido está en camino! 🌿"}</h1>
        <p>${isEn ? `We've shipped your order <strong>${data.order_number}</strong>.` : `Hemos enviado tu pedido <strong>${data.order_number}</strong>.`}</p>
        ${data.tracking_number ? `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${isEn ? "Tracking number:" : "Número de seguimiento:"}</strong> ${data.tracking_number}</p>
            ${data.tracking_url ? `<a href="${data.tracking_url}" style="color: #1a472a;">${isEn ? "Track shipment" : "Seguir envío"}</a>` : ""}
          </div>
        ` : ""}
        <p>${isEn ? `Estimated delivery: ${data.delivery_days_min}–${data.delivery_days_max} business days.` : `Tiempo estimado de entrega: ${data.delivery_days_min}-${data.delivery_days_max} días laborables.`}</p>
        ${ctaButton(String(data.order_url), isEn ? "View order" : "Ver pedido")}
      `),
    };
  },

  // ─── Order delivered ───
  order_delivered: (data, lang) => {
    const isEn = lang === "en";
    return {
      subject: isEn
        ? `Your order ${data.order_number} has been delivered`
        : `Tu pedido ${data.order_number} ha sido entregado`,
      html: wrapHtml(`
        <h1 style="color: #1a472a;">${isEn ? "Order delivered! 🎉" : "¡Pedido entregado! 🎉"}</h1>
        <p>${isEn ? `Your order <strong>${data.order_number}</strong> has been delivered successfully.` : `Tu pedido <strong>${data.order_number}</strong> ha sido entregado correctamente.`}</p>
        <p>${isEn ? "Your new plants are now in your collection. Enjoy them!" : "Tus nuevas plantas ya están en tu colección. ¡Disfrútalas!"}</p>
        ${ctaButton(String(data.collection_url), isEn ? "View my collection" : "Ver mi colección")}
        <p style="margin-top: 20px; color: #666;">
          ${isEn ? "If you have any issues with your order, don't hesitate to contact us." : "Si tienes algún problema con tu pedido, no dudes en contactarnos."}
        </p>
      `),
    };
  },

  // ─── Welcome ───
  welcome: (data, lang) => {
    const isEn = lang === "en";
    return {
      subject: isEn ? "Welcome to The Remainder 🌿" : "Bienvenido a The Remainder 🌿",
      html: wrapHtml(`
        <h1 style="color: #1a472a;">${isEn ? "Welcome to The Remainder!" : "¡Bienvenido a The Remainder!"}</h1>
        <p>${isEn ? `Hello ${data.name || "plant lover"},` : `Hola ${data.name || "amante de las plantas"},`}</p>
        <p>${isEn ? "Thank you for joining our community of exotic plant enthusiasts." : "Gracias por unirte a nuestra comunidad de entusiastas de plantas exóticas."}</p>
        <h2 style="color: #333;">${isEn ? "What can you do now?" : "¿Qué puedes hacer ahora?"}</h2>
        <ul style="color: #666;">
          <li>${isEn ? "Browse our catalog of palms, ferns and more" : "Explorar nuestro catálogo de palmeras, helechos y más"}</li>
          <li>${isEn ? "Set up your garden profile for personalised recommendations" : "Configurar tu perfil de jardín para recomendaciones personalizadas"}</li>
          <li>${isEn ? "Add plants to your wishlist" : "Añadir plantas a tu lista de deseos"}</li>
          <li>${isEn ? "Manage your personal collection" : "Gestionar tu colección personal"}</li>
        </ul>
        ${ctaButton(String(data.site_url), isEn ? "Browse catalog" : "Explorar catálogo")}
      `),
    };
  },

  // ─── Order confirmed (receipt) ───
  order_confirmed: (data, lang) => {
    const isEn = lang === "en";
    const fc = (n: number) => formatCurrency(n, lang);
    const items = (data.items as Array<{ product_name: string; quantity: number; unit_price: number }>) || [];

    const itemsHTML = items.map(item => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: right;">${fc(item.unit_price * item.quantity)}</td>
      </tr>
    `).join("");

    const shippingCost = Number(data.shipping_cost) || 0;
    const totalAmount = Number(data.total_amount) || 0;
    const taxRate = Number(data.tax_rate) || 21;
    const baseImponible = Number(data.base_imponible) || 0;
    const taxAmount = Number(data.tax_amount) || 0;
    const showVat = baseImponible > 0 || taxAmount > 0;

    return {
      subject: isEn
        ? `Order confirmation ${data.order_number} — The Remainder`
        : `Confirmación de pedido ${data.order_number} — The Remainder`,
      html: wrapHtml(`
        <h1 style="color: #1a472a;">${isEn ? "Thank you for your purchase! 🌿" : "¡Gracias por tu compra! 🌿"}</h1>
        <p>${isEn ? `We've received your order <strong>${data.order_number}</strong> successfully.` : `Hemos recibido tu pedido <strong>${data.order_number}</strong> correctamente.`}</p>

        ${data.invoice_number ? `
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a472a;">
          <p style="margin: 0; font-weight: 600; color: #1a472a;">📄 ${isEn ? "Invoice" : "Factura"}: ${data.invoice_number}</p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">
            ${isEn ? "You can download your invoice at any time from your account." : "Podrás descargar tu factura en cualquier momento desde tu cuenta."}
          </p>
        </div>
        ` : ""}

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 12px; text-align: left; font-weight: 600;">${isEn ? "Product" : "Producto"}</th>
              <th style="padding: 10px 12px; text-align: center; font-weight: 600;">${isEn ? "Qty" : "Cant."}</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 600;">${isEn ? "Amount" : "Importe"}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div style="border-top: 1px solid #eee; margin-top: 8px; padding-top: 8px;">
          ${showVat ? `
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 12px; color: #666;">${isEn ? "Subtotal (excl. VAT)" : "Base imponible"}</td>
              <td style="padding: 6px 12px; text-align: right; color: #666;">${fc(baseImponible)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; color: #666;">${isEn ? `VAT (${taxRate}%)` : `IVA (${taxRate}%)`}</td>
              <td style="padding: 6px 12px; text-align: right; color: #666;">${fc(taxAmount)}</td>
            </tr>
            ${shippingCost > 0 ? `
            <tr>
              <td style="padding: 6px 12px; color: #666;">${isEn ? "Shipping" : "Gastos de envío"}</td>
              <td style="padding: 6px 12px; text-align: right; color: #666;">${fc(shippingCost)}</td>
            </tr>
            ` : ""}
          </table>
          ` : `
          ${shippingCost > 0 ? `
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 12px; color: #666;">${isEn ? "Shipping" : "Gastos de envío"}</td>
              <td style="padding: 6px 12px; text-align: right; color: #666;">${fc(shippingCost)}</td>
            </tr>
          </table>
          ` : ""}
          `}
        </div>

        <div style="display: flex; justify-content: space-between; padding: 12px; font-size: 18px; font-weight: bold; border-top: 2px solid #1a472a; margin-top: 8px;">
          <span>Total</span>
          <span style="color: #1a472a;">${fc(totalAmount)}</span>
        </div>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">${isEn ? "Shipping address" : "Dirección de envío"}</h3>
          <p style="margin: 0; color: #666; font-size: 13px;">${data.shipping_name || ""}</p>
          <p style="margin: 0; color: #666; font-size: 13px;">${data.shipping_address || ""}</p>
        </div>

        ${ctaButton(String(data.account_url || "https://theremainder.lovable.app/account"), isEn ? "View my orders" : "Ver mis pedidos")}

        <p style="margin-top: 30px; color: #888; font-size: 12px;">
          ${isEn ? "You'll receive an email when your order is shipped." : "Recibirás un email cuando tu pedido sea enviado."}
        </p>
      `),
    };
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Authentication: require service role key ---
    const authHeader = req.headers.get("authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!authHeader || !serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
      console.error("Unauthorized send-notification-email attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured - email sending disabled");
      return new Response(JSON.stringify({
        success: false,
        error: "Email service not configured. Set RESEND_API_KEY to enable.",
        configured: false,
      }), { status: 503, headers: corsHeaders });
    }

    const { type, to, lang: rawLang, data }: EmailRequest = await req.json();
    const lang = rawLang === "en" ? "en" : "es";

    if (!type || !to || !data) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required fields: type, to, data",
      }), { status: 400, headers: corsHeaders });
    }

    const template = templates[type];
    if (!template) {
      return new Response(JSON.stringify({
        success: false,
        error: `Unknown email type: ${type}`,
        available_types: Object.keys(templates),
      }), { status: 400, headers: corsHeaders });
    }

    const { subject, html } = template(data, lang);

    // Send via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Remainder <noreply@theremainder.com>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({
        success: false,
        error: result.message || "Failed to send email",
      }), { status: 500, headers: corsHeaders });
    }

    console.log(`Email sent: ${type} to ${to} (${lang})`);

    return new Response(JSON.stringify({
      success: true,
      message_id: result.id,
    }), { headers: corsHeaders });

  } catch (error: unknown) {
    console.error("Email send error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), { status: 500, headers: corsHeaders });
  }
});
