import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

interface NotifyRequest {
  type: "outbid" | "auction_starting" | "auction_ending" | "auction_won" | "auction_lost" | "new_bid_seller" | "listing_approved" | "listing_rejected" | "listing_changes_requested";
  auction_id: string;
  user_ids?: string[];   // specific users to notify
  data?: Record<string, unknown>;
}

// Email templates
function getEmailContent(type: string, data: Record<string, unknown>, lang: string) {
  const isEn = lang === "en";
  const wrap = (body: string) => `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      ${body}
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
      <p style="font-size: 11px; color: #999; text-align: center;">© ${new Date().getFullYear()} The Remainder</p>
    </div>`;
  const cta = (href: string, label: string) =>
    `<a href="${href}" style="display: inline-block; background: #1a472a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">${label}</a>`;

  const auctionUrl = data.auction_url || "#";

  switch (type) {
    case "outbid":
      return {
        subject: isEn ? `You've been outbid on "${data.auction_title}"` : `Te han superado en "${data.auction_title}"`,
        html: wrap(`
          <h1 style="color: #1a472a;">⚡ ${isEn ? "You've been outbid!" : "¡Te han superado!"}</h1>
          <p>${isEn ? `Someone placed a higher bid on <strong>${data.auction_title}</strong>.` : `Alguien ha pujado más alto en <strong>${data.auction_title}</strong>.`}</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${isEn ? "Current price:" : "Precio actual:"}</strong> ${data.current_price}€</p>
            <p style="margin: 8px 0 0 0;"><strong>${isEn ? "Your bid:" : "Tu puja:"}</strong> ${data.your_bid}€</p>
          </div>
          ${cta(String(auctionUrl), isEn ? "Place a new bid" : "Pujar de nuevo")}
        `),
      };

    case "auction_starting":
      return {
        subject: isEn ? `Auction starting soon: "${data.auction_title}"` : `Subasta a punto de empezar: "${data.auction_title}"`,
        html: wrap(`
          <h1 style="color: #1a472a;">🔔 ${isEn ? "Auction starting soon!" : "¡Subasta a punto de empezar!"}</h1>
          <p>${isEn ? `The auction <strong>${data.auction_title}</strong> starts in ${data.time_remaining}.` : `La subasta <strong>${data.auction_title}</strong> comienza en ${data.time_remaining}.`}</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${isEn ? "Starting price:" : "Precio de salida:"}</strong> ${data.starting_price}€</p>
          </div>
          ${cta(String(auctionUrl), isEn ? "View auction" : "Ver subasta")}
        `),
      };

    case "auction_ending":
      return {
        subject: isEn ? `Auction ending soon: "${data.auction_title}"` : `Subasta a punto de terminar: "${data.auction_title}"`,
        html: wrap(`
          <h1 style="color: #1a472a;">⏰ ${isEn ? "Auction ending soon!" : "¡Subasta a punto de terminar!"}</h1>
          <p>${isEn ? `The auction <strong>${data.auction_title}</strong> ends in ${data.time_remaining}.` : `La subasta <strong>${data.auction_title}</strong> termina en ${data.time_remaining}.`}</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${isEn ? "Current price:" : "Precio actual:"}</strong> ${data.current_price}€</p>
          </div>
          ${cta(String(auctionUrl), isEn ? "Place a bid" : "Pujar ahora")}
        `),
      };

    case "auction_won":
      return {
        subject: isEn ? `🎉 You won the auction "${data.auction_title}"!` : `🎉 ¡Has ganado la subasta "${data.auction_title}"!`,
        html: wrap(`
          <h1 style="color: #1a472a;">🎉 ${isEn ? "Congratulations, you won!" : "¡Enhorabuena, has ganado!"}</h1>
          <p>${isEn ? `You've won the auction <strong>${data.auction_title}</strong>.` : `Has ganado la subasta <strong>${data.auction_title}</strong>.`}</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a472a;">
            <p style="margin: 0;"><strong>${isEn ? "Winning bid:" : "Puja ganadora:"}</strong> ${data.winning_price}€</p>
          </div>
          <p>${isEn ? "We'll contact you shortly with payment and delivery details." : "Te contactaremos pronto con los detalles de pago y entrega."}</p>
          ${cta(String(auctionUrl), isEn ? "View details" : "Ver detalles")}
        `),
      };

    case "auction_lost":
      return {
        subject: isEn ? `Auction ended: "${data.auction_title}"` : `Subasta finalizada: "${data.auction_title}"`,
        html: wrap(`
          <h1 style="color: #1a472a;">${isEn ? "Auction ended" : "Subasta finalizada"}</h1>
          <p>${isEn ? `The auction <strong>${data.auction_title}</strong> has ended. Unfortunately, your bid was not the winning one.` : `La subasta <strong>${data.auction_title}</strong> ha finalizado. Lamentablemente, tu puja no fue la ganadora.`}</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${isEn ? "Final price:" : "Precio final:"}</strong> ${data.winning_price}€</p>
            <p style="margin: 8px 0 0 0;"><strong>${isEn ? "Your highest bid:" : "Tu puja más alta:"}</strong> ${data.your_bid}€</p>
          </div>
          <p>${isEn ? "Don't worry, more auctions are coming soon!" : "¡No te preocupes, pronto habrá más subastas!"}</p>
          ${cta("https://theremainder.lovable.app", isEn ? "Browse catalog" : "Ver catálogo")}
        `),
      };

    case "new_bid_seller":
      return {
        subject: isEn ? `New bid on your auction "${data.auction_title}"` : `Nueva puja en tu subasta "${data.auction_title}"`,
        html: wrap(`
          <h1 style="color: #1a472a;">💰 ${isEn ? "New bid received!" : "¡Nueva puja recibida!"}</h1>
          <p>${isEn ? `A new bid has been placed on your auction <strong>${data.auction_title}</strong>.` : `Se ha realizado una nueva puja en tu subasta <strong>${data.auction_title}</strong>.`}</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${isEn ? "Bid amount:" : "Cantidad:"}</strong> ${data.bid_amount}€</p>
            <p style="margin: 8px 0 0 0;"><strong>${isEn ? "Total bids:" : "Total pujas:"}</strong> ${data.total_bids}</p>
          </div>
          ${cta(String(auctionUrl), isEn ? "View auction" : "Ver subasta")}
        `),
      };

    case "listing_approved":
      return {
        subject: isEn ? `Your listing "${data.auction_title}" has been approved! ✅` : `¡Tu lote "${data.auction_title}" ha sido aprobado! ✅`,
        html: wrap(`
          <h1 style="color: #1a472a;">✅ ${isEn ? "Listing approved!" : "¡Lote aprobado!"}</h1>
          <p>${isEn ? `Great news! Your listing <strong>${data.auction_title}</strong> has been reviewed and approved.` : `¡Buenas noticias! Tu lote <strong>${data.auction_title}</strong> ha sido revisado y aprobado.`}</p>
          ${data.starts_at ? `
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a472a;">
            <p style="margin: 0;"><strong>${isEn ? "Auction starts:" : "Inicio de subasta:"}</strong> ${data.starts_at}</p>
            <p style="margin: 8px 0 0 0;"><strong>${isEn ? "Starting price:" : "Precio de salida:"}</strong> ${data.starting_price}€</p>
          </div>
          ` : ""}
          ${cta(String(auctionUrl), isEn ? "View your listing" : "Ver tu lote")}
        `),
      };

    case "listing_rejected":
      return {
        subject: isEn ? `Your listing "${data.auction_title}" was not approved` : `Tu lote "${data.auction_title}" no ha sido aprobado`,
        html: wrap(`
          <h1 style="color: #1a472a;">❌ ${isEn ? "Listing not approved" : "Lote no aprobado"}</h1>
          <p>${isEn ? `Unfortunately, your listing <strong>${data.auction_title}</strong> has not been approved.` : `Lamentablemente, tu lote <strong>${data.auction_title}</strong> no ha sido aprobado.`}</p>
          ${data.admin_notes ? `
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0; font-weight: 600;">${isEn ? "Reason:" : "Motivo:"}</p>
            <p style="margin: 8px 0 0 0;">${data.admin_notes}</p>
          </div>
          ` : ""}
          <p>${isEn ? "If you have questions, please contact us." : "Si tienes preguntas, no dudes en contactarnos."}</p>
        `),
      };

    case "listing_changes_requested":
      return {
        subject: isEn ? `Changes requested for "${data.auction_title}"` : `Cambios solicitados para "${data.auction_title}"`,
        html: wrap(`
          <h1 style="color: #1a472a;">📝 ${isEn ? "Changes requested" : "Cambios solicitados"}</h1>
          <p>${isEn ? `Your listing <strong>${data.auction_title}</strong> requires some changes before it can be approved.` : `Tu lote <strong>${data.auction_title}</strong> necesita algunos cambios antes de poder ser aprobado.`}</p>
          ${data.change_request_message ? `
          <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-weight: 600;">${isEn ? "Requested changes:" : "Cambios solicitados:"}</p>
            <p style="margin: 8px 0 0 0;">${data.change_request_message}</p>
          </div>
          ` : ""}
          ${cta(String(auctionUrl), isEn ? "Update your listing" : "Actualizar tu lote")}
        `),
      };

    default:
      return { subject: "Notification", html: wrap("<p>Notification</p>") };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader || !serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { type, auction_id, user_ids, data: extraData }: NotifyRequest = await req.json();

    if (!type || !auction_id) {
      return new Response(JSON.stringify({ error: "Missing type or auction_id" }), { status: 400, headers: corsHeaders });
    }

    // Get auction info
    const { data: auction } = await supabase.from("auctions").select("*").eq("id", auction_id).single();
    if (!auction) {
      return new Response(JSON.stringify({ error: "Auction not found" }), { status: 404, headers: corsHeaders });
    }

    const auctionUrl = `https://theremainder.lovable.app/subastas/${auction.slug}`;

    // Determine which users to notify based on type
    let targetUserIds: string[] = user_ids || [];

    if (!user_ids || user_ids.length === 0) {
      if (type === "new_bid_seller" && auction.seller_user_id) {
        targetUserIds = [auction.seller_user_id];
      } else if (type === "auction_won" && auction.winner_user_id) {
        targetUserIds = [auction.winner_user_id];
      } else if ((type === "listing_approved" || type === "listing_rejected" || type === "listing_changes_requested") && auction.seller_user_id) {
        targetUserIds = [auction.seller_user_id];
      } else if (type === "auction_lost" || type === "auction_ending" || type === "auction_starting") {
        // Get all bidders except winner
        const { data: bidders } = await supabase
          .from("bids")
          .select("user_id")
          .eq("auction_id", auction_id)
          .neq("user_id", auction.winner_user_id || "");
        const uniqueIds = [...new Set(bidders?.map(b => b.user_id) || [])];
        targetUserIds = uniqueIds;
      }
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_targets" }), { headers: corsHeaders });
    }

    // Map type to preference column
    const prefColumn: Record<string, string> = {
      outbid: "notify_outbid",
      auction_starting: "notify_auction_starting",
      auction_ending: "notify_auction_ending",
      auction_won: "notify_auction_won",
      auction_lost: "notify_auction_lost",
      new_bid_seller: "notify_new_bid_seller",
    };

    // Get preferences + emails for target users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, preferred_language")
      .in("user_id", targetUserIds);

    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .in("user_id", targetUserIds);

    const prefsMap = new Map(prefs?.map(p => [p.user_id, p]) || []);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let sentCount = 0;

    for (const userId of targetUserIds) {
      const profile = profiles?.find(p => p.user_id === userId);
      if (!profile?.email) continue;

      // Check if user has opted in (default true if no pref record)
      const userPref = prefsMap.get(userId);
      const col = prefColumn[type];
      if (userPref && col && (userPref as Record<string, unknown>)[col] === false) continue;
      if (userPref && !userPref.email_enabled) continue;

      // Check dedup: don't send same type to same user for same auction within 5 min
      const { data: recent } = await supabase
        .from("auction_notifications")
        .select("id")
        .eq("auction_id", auction_id)
        .eq("user_id", userId)
        .eq("type", type)
        .gte("sent_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .limit(1);

      if (recent && recent.length > 0) continue;

      const lang = profile.preferred_language === "en" ? "en" : "es";
      const templateData = {
        auction_title: auction.title,
        auction_url: auctionUrl,
        current_price: auction.current_price,
        starting_price: auction.starting_price,
        ...extraData,
      };

      const { subject, html } = getEmailContent(type, templateData, lang);

      // Send email
      if (RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "The Remainder <noreply@theremainder.com>",
            to: [profile.email],
            subject,
            html,
          }),
        });

        if (res.ok) {
          sentCount++;
          // Log notification
          await supabase.from("auction_notifications").insert({
            auction_id,
            user_id: userId,
            type,
            channel: "email",
            metadata: templateData,
          });
        } else {
          console.error(`Failed to send ${type} email to ${profile.email}:`, await res.text());
        }
      }
    }

    console.log(`[auction-notify] Sent ${sentCount} ${type} notifications for auction ${auction_id}`);

    return new Response(JSON.stringify({ success: true, sent: sentCount }), { headers: corsHeaders });
  } catch (error: unknown) {
    console.error("Auction notification error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
