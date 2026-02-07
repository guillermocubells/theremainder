import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

interface RestockPayload {
  plant_id: string;
  plant_name: string;
  plant_slug: string;
  new_stock_qty: number;
  price: number;
  scientific_name?: string;
  thumbnail_url?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify internal call via service role or shared secret
    const authHeader = req.headers.get("authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!authHeader || !authHeader.includes(serviceRoleKey || "")) {
      // Also accept a simple shared secret for DB webhook calls
      const webhookSecret = Deno.env.get("RESTOCK_WEBHOOK_SECRET");
      const providedSecret = req.headers.get("x-webhook-secret");
      
      if (!webhookSecret || providedSecret !== webhookSecret) {
        console.error("Unauthorized restock notification attempt");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }
    }

    const payload: RestockPayload = await req.json();
    const { plant_id, plant_name, plant_slug, new_stock_qty, price, scientific_name, thumbnail_url } = payload;

    if (!plant_id || !plant_name) {
      return new Response(JSON.stringify({ error: "Missing plant_id or plant_name" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log(`[notify-restock] Processing restock for: ${plant_name} (${plant_id}), new qty: ${new_stock_qty}`);

    // Create admin client to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all subscribers who haven't been notified yet
    const { data: subscribers, error: subError } = await supabase
      .from("stock_notifications")
      .select("id, email, user_id")
      .eq("plant_id", plant_id)
      .is("notified_at", null);

    if (subError) {
      console.error("[notify-restock] Error fetching subscribers:", subError);
      throw subError;
    }

    if (!subscribers || subscribers.length === 0) {
      console.log("[notify-restock] No subscribers to notify");
      return new Response(JSON.stringify({ 
        success: true, 
        notified: 0,
        message: "No pending subscribers" 
      }), { headers: corsHeaders });
    }

    console.log(`[notify-restock] Found ${subscribers.length} subscriber(s) to notify`);

    // Check if Resend is configured
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.warn("[notify-restock] RESEND_API_KEY not configured — marking subscribers but not sending emails");
      
      // Still mark them as notified so we don't retry
      const subscriberIds = subscribers.map(s => s.id);
      await supabase
        .from("stock_notifications")
        .update({ notified_at: new Date().toISOString() })
        .in("id", subscriberIds);

      return new Response(JSON.stringify({
        success: true,
        notified: subscribers.length,
        emails_sent: false,
        message: "RESEND_API_KEY not configured - subscribers marked but emails not sent",
      }), { headers: corsHeaders });
    }

    // Build plant URL
    const siteUrl = Deno.env.get("SITE_URL") || "https://frondaprima.lovable.app";
    const plantUrl = `${siteUrl}/plant/${plant_slug}`;

    // Send emails
    let emailsSent = 0;
    let emailsFailed = 0;
    const errors: string[] = [];

    for (const subscriber of subscribers) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FrondaPrima <noreply@frondaprima.com>",
            to: [subscriber.email],
            subject: `¡${plant_name} ya está disponible! 🌿`,
            html: `
              <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 0;">
                <!-- Header -->
                <div style="background: #1a472a; padding: 24px; text-align: center;">
                  <h1 style="color: #fff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.05em;">FRONDAPRIMA</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 32px 24px;">
                  <h2 style="color: #1a472a; margin: 0 0 16px; font-size: 22px;">¡Buenas noticias!</h2>
                  <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                    La planta que estabas esperando ya está disponible en nuestra tienda.
                  </p>
                  
                  <!-- Plant card -->
                  <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; margin: 0 0 24px;">
                    ${thumbnail_url ? `
                      <div style="height: 200px; overflow: hidden;">
                        <img src="${thumbnail_url}" alt="${plant_name}" style="width: 100%; height: 100%; object-fit: cover;" />
                      </div>
                    ` : ''}
                    <div style="padding: 20px;">
                      <h3 style="margin: 0 0 4px; color: #1a472a; font-size: 18px;">${plant_name}</h3>
                      ${scientific_name ? `<p style="margin: 0 0 12px; color: #888; font-style: italic; font-size: 14px;">${scientific_name}</p>` : ''}
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 20px; color: #1a472a; font-weight: bold;">${price}€</span>
                        <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                          ${new_stock_qty} disponible${new_stock_qty > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- CTA -->
                  <div style="text-align: center;">
                    <a href="${plantUrl}" style="display: inline-block; background: #1a472a; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      Ver planta →
                    </a>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="padding: 20px 24px; border-top: 1px solid #e5e5e5; text-align: center;">
                  <p style="color: #999; font-size: 12px; margin: 0; line-height: 1.5;">
                    Recibiste este email porque te suscribiste a notificaciones de stock en FrondaPrima.<br/>
                    Las unidades son limitadas, ¡no te lo pierdas!
                  </p>
                </div>
              </div>
            `,
          }),
        });

        if (emailResponse.ok) {
          emailsSent++;
          // Mark as notified
          await supabase
            .from("stock_notifications")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", subscriber.id);
          
          console.log(`[notify-restock] Email sent to ${subscriber.email}`);
        } else {
          const errData = await emailResponse.json();
          emailsFailed++;
          errors.push(`${subscriber.email}: ${errData.message || 'Unknown error'}`);
          console.error(`[notify-restock] Failed to send to ${subscriber.email}:`, errData);
        }
      } catch (emailErr: any) {
        emailsFailed++;
        errors.push(`${subscriber.email}: ${emailErr.message}`);
        console.error(`[notify-restock] Error sending to ${subscriber.email}:`, emailErr);
      }
    }

    console.log(`[notify-restock] Done — sent: ${emailsSent}, failed: ${emailsFailed}`);

    return new Response(JSON.stringify({
      success: true,
      notified: subscribers.length,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      errors: errors.length > 0 ? errors : undefined,
    }), { headers: corsHeaders });

  } catch (error: any) {
    console.error("[notify-restock] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Internal server error",
    }), { status: 500, headers: corsHeaders });
  }
});
