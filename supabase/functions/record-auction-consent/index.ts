import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, PRESETS } from "../_shared/rate-limit.ts";
import { validate, schemas } from "../_shared/validation.ts";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("record-auction-consent", req);
  const rh = withCorrelationId(corsHeaders, requestId);

  const rl = checkRateLimit(req, PRESETS.form_submit);
  if (!rl.allowed) {
    return rateLimitResponse(rl.headers, corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new AppError("Not authenticated", 401, "UNAUTHORIZED");
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
      throw new AppError("Invalid token", 401, "INVALID_TOKEN");
    }

    const body = await req.json();

    const v = validate(schemas.recordAuctionConsent, body, rh);
    if (v.error) return v.error;

    const { consent_type, terms_version } = v.data;

    log.info("Consent recording", { consent_type, terms_version, user_id: user.id });

    const { data: setting } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "auction_terms_version")
      .single();

    const currentVersion = setting ? (typeof setting.value === "string" ? setting.value : String(setting.value)) : null;
    if (terms_version !== currentVersion) {
      throw new AppError("Terms version mismatch. Please refresh.", 409, "VERSION_MISMATCH");
    }

    const { data: existing } = await supabaseAdmin
      .from("auction_consents")
      .select("id")
      .eq("user_id", user.id)
      .eq("consent_type", consent_type)
      .eq("terms_version", terms_version)
      .maybeSingle();

    if (existing) {
      log.info("Already consented", { consent_id: existing.id });
      return new Response(JSON.stringify({ success: true, already_consented: true }), {
        headers: { ...rh, "Content-Type": "application/json" },
      });
    }

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
          request_id: requestId,
        },
      });

    if (insertError) throw insertError;

    log.info("Consent recorded", { user_id: user.id, consent_type });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...rh, "Content-Type": "application/json" },
    });
  } catch (err) {
    return handleError(err, { ...corsHeaders, "Content-Type": "application/json" }, requestId, log);
  }
});
