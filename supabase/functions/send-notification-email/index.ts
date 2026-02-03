import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

interface EmailRequest {
  type: "stock_available" | "order_shipped" | "order_delivered" | "welcome";
  to: string;
  data: Record<string, unknown>;
}

// Email templates
const templates = {
  stock_available: (data: Record<string, unknown>) => ({
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
          Recibiste este email porque te suscribiste a notificaciones de stock en FrondaPrima.
        </p>
      </div>
    `,
  }),

  order_shipped: (data: Record<string, unknown>) => ({
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

  order_delivered: (data: Record<string, unknown>) => ({
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

  welcome: (data: Record<string, unknown>) => ({
    subject: "Bienvenido a FrondaPrima 🌿",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a472a;">¡Bienvenido a FrondaPrima!</h1>
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
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
        from: "FrondaPrima <noreply@frondaprima.com>",
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
