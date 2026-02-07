import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

interface EmailRequest {
  type: "stock_available" | "order_shipped" | "order_delivered" | "welcome" | "order_confirmed";
  to: string;
  data: Record<string, unknown>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
}

// Email templates
const templates: Record<string, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  stock_available: (data) => ({
    subject: `¡${data.plant_name} ya está disponible!`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a472a;">¡Buenas noticias!</h1>
        <p>La planta que estabas esperando ya está disponible:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0; color: #333;">${data.plant_name}</h2>
          <p style="margin: 0; color: #666; font-style: italic;">${data.scientific_name || ''}</p>
          <p style="margin: 10px 0 0 0; font-size: 18px; color: #1a472a; font-weight: bold;">${data.price}€</p>
        </div>
        <a href="${data.plant_url}" style="display: inline-block; background: #1a472a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver planta</a>
        <p style="margin-top: 30px; color: #888; font-size: 12px;">
          Recibiste este email porque te suscribiste a notificaciones de stock en The Remainder.
        </p>
      </div>
    `,
  }),

  order_shipped: (data) => ({
    subject: `Tu pedido ${data.order_number} ha sido enviado`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a472a;">¡Tu pedido está en camino! 🌿</h1>
        <p>Hemos enviado tu pedido <strong>${data.order_number}</strong>.</p>
        ${data.tracking_number ? `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Número de seguimiento:</strong> ${data.tracking_number}</p>
            ${data.tracking_url ? `<a href="${data.tracking_url}" style="color: #1a472a;">Seguir envío</a>` : ''}
          </div>
        ` : ''}
        <p>Tiempo estimado de entrega: ${data.delivery_days_min}-${data.delivery_days_max} días laborables.</p>
        <a href="${data.order_url}" style="display: inline-block; background: #1a472a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver pedido</a>
      </div>
    `,
  }),

  order_delivered: (data) => ({
    subject: `Tu pedido ${data.order_number} ha sido entregado`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a472a;">¡Pedido entregado! 🎉</h1>
        <p>Tu pedido <strong>${data.order_number}</strong> ha sido entregado correctamente.</p>
        <p>Tus nuevas plantas ya están en tu colección. ¡Disfrútalas!</p>
        <a href="${data.collection_url}" style="display: inline-block; background: #1a472a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver mi colección</a>
        <p style="margin-top: 20px; color: #666;">
          Si tienes algún problema con tu pedido, no dudes en contactarnos.
        </p>
      </div>
    `,
  }),

  welcome: (data) => ({
    subject: "Bienvenido a The Remainder 🌿",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a472a;">¡Bienvenido a The Remainder!</h1>
        <p>Hola ${data.name || 'amante de las plantas'},</p>
        <p>Gracias por unirte a nuestra comunidad de entusiastas de plantas exóticas.</p>
        <h2 style="color: #333;">¿Qué puedes hacer ahora?</h2>
        <ul style="color: #666;">
          <li>Explorar nuestro catálogo de palmeras, helechos y más</li>
          <li>Configurar tu perfil de jardín para recomendaciones personalizadas</li>
          <li>Añadir plantas a tu lista de deseos</li>
          <li>Gestionar tu colección personal</li>
        </ul>
        <a href="${data.site_url}" style="display: inline-block; background: #1a472a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Explorar catálogo</a>
      </div>
    `,
  }),

  order_confirmed: (data) => {
    const items = (data.items as Array<{ product_name: string; quantity: number; unit_price: number }>) || [];
    const itemsHTML = items.map(item => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unit_price * item.quantity)}</td>
      </tr>
    `).join("");

    return {
      subject: `Confirmación de pedido ${data.order_number} — The Remainder`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a472a;">¡Gracias por tu compra! 🌿</h1>
          <p>Hemos recibido tu pedido <strong>${data.order_number}</strong> correctamente.</p>
          
          ${data.invoice_number ? `
          <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a472a;">
            <p style="margin: 0; font-weight: 600; color: #1a472a;">📄 Factura: ${data.invoice_number}</p>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">
              Podrás descargar tu factura en cualquier momento desde tu cuenta.
            </p>
          </div>
          ` : ''}

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px 12px; text-align: left; font-weight: 600;">Producto</th>
                <th style="padding: 8px 12px; text-align: center; font-weight: 600;">Cant.</th>
                <th style="padding: 8px 12px; text-align: right; font-weight: 600;">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          ${data.shipping_cost && Number(data.shipping_cost) > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 12px; color: #666;">
            <span>Gastos de envío</span>
            <span>${formatCurrency(Number(data.shipping_cost))}</span>
          </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; padding: 12px; font-size: 18px; font-weight: bold; border-top: 2px solid #1a472a; margin-top: 8px;">
            <span>Total</span>
            <span style="color: #1a472a;">${formatCurrency(Number(data.total_amount))}</span>
          </div>

          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">Dirección de envío</h3>
            <p style="margin: 0; color: #666; font-size: 13px;">${data.shipping_name || ''}</p>
            <p style="margin: 0; color: #666; font-size: 13px;">${data.shipping_address || ''}</p>
          </div>

          <a href="${data.account_url || 'https://theremainder.lovable.app/account'}" style="display: inline-block; background: #1a472a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver mis pedidos</a>

          <p style="margin-top: 30px; color: #888; font-size: 12px;">
            Recibirás un email cuando tu pedido sea enviado.
          </p>
        </div>
      `,
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

    const { type, to, data }: EmailRequest = await req.json();

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

    const { subject, html } = template(data);

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

    console.log(`Email sent: ${type} to ${to}`);

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
