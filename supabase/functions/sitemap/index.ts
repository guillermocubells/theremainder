import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkRateLimit, rateLimitResponse, PRESETS } from "../_shared/rate-limit.ts";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { handleError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("sitemap", req);
  const rh = withCorrelationId(corsHeaders, requestId);

  const rl = checkRateLimit(req, PRESETS.public_read);
  if (!rl.allowed) {
    return rateLimitResponse(rl.headers, corsHeaders);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const baseUrl = "https://theremainder.lovable.app";

    const { data: plants, error } = await supabase
      .from("plants")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      log.error("Error fetching plants", { error: error.message });
      throw error;
    }

    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/faq", priority: "0.5", changefreq: "monthly" },
      { loc: "/shipping-info", priority: "0.5", changefreq: "monthly" },
      { loc: "/contact", priority: "0.5", changefreq: "monthly" },
      { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
      { loc: "/terms-of-sale", priority: "0.3", changefreq: "yearly" },
    ];

    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    if (plants) {
      for (const plant of plants) {
        const lastmod = plant.updated_at
          ? new Date(plant.updated_at).toISOString().split("T")[0]
          : today;
        xml += `
  <url>
    <loc>${baseUrl}/plant/${plant.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    xml += `
</urlset>`;

    const urlCount = staticPages.length + (plants?.length || 0);
    log.info("Sitemap generated", { url_count: urlCount });

    return new Response(xml, {
      headers: {
        ...rh,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return handleError(err, { ...corsHeaders, "Content-Type": "application/json" }, requestId, log);
  }
});
