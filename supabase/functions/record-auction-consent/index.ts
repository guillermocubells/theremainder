import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, PRESETS } from "../_shared/rate-limit.ts";
import { validate, schemas } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit
  const rl = checkRateLimit(req, PRESETS.form_submit);
  if (!rl.allowed) {
    return rateLimitResponse(rl.headers, corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // ── Schema validation ──
    const v = validate(schemas.recordAuctionConsent, body, corsHeaders);
    if (v.error) return v.error;

    const { consent_type, terms_version } = v.data;

    // Verify terms_version matches current
    const { data: setting } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "auction_terms_version")
      .single();

    const currentVersion = setting ? (typeof setting.value === "string" ? setting.value : String(setting.value)) : null;
    if (terms_version !== currentVersion) {
      return new Response(JSON.stringify({ error: "Terms version mismatch. Please refresh." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already consented
    const { data: existing } = await supabaseAdmin
      .from("auction_consents")
      .select("id")
      .eq("user_id", user.id)
      .eq("consent_type", consent_type)
      .eq("terms_version", terms_version)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, already_consented: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract IP from request headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || "unknown";

    const userAgent = body.user_agent || req.headers.get("user-agent") || null;

    const { error: insertError } = await supabaseAdmin
      .from("auction_consents")
      .insert({
        user_id: user.id,
        consent_type,
        terms_version,
        ip_address: ip,
        user_agent: userAgent,
        accepted_at: new Date().toISOString(),
        metadata: {
          source: "edge_function",
          recorded_at: new Date().toISOString(),
        },
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("record-auction-consent error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
