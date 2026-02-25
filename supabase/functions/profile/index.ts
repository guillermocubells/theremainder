import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse, PRESETS, extractUserIdFromJwt } from "../_shared/rate-limit.ts";
import { validate, schemas } from "../_shared/validation.ts";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
};

// ---------- Auth helper ----------

async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header" };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims) {
    return { error: "Unauthorized" };
  }

  return { userId: data.claims.sub as string, supabase };
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { log, requestId } = createLogger("profile", req);
  const rh = withCorrelationId(corsHeaders, requestId);

  const jwtUserId = extractUserIdFromJwt(req.headers.get("Authorization"));
  const rl = checkRateLimit(req, PRESETS.auth_write, jwtUserId);
  if (!rl.allowed) {
    return rateLimitResponse(rl.headers, corsHeaders);
  }

  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      throw new AppError(auth.error, 401, "UNAUTHORIZED");
    }

    const { userId, supabase } = auth;

    log.info("Profile request", { method: req.method, user_id: userId });

    // GET — fetch own profile
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, phone, created_at, updated_at")
        .eq("user_id", userId)
        .single();

      if (error) {
        log.error("GET profile error", { error: error.message });
        throw new AppError("Profile not found", 404, "PROFILE_NOT_FOUND");
      }

      return new Response(JSON.stringify({ profile: data }), {
        headers: { ...rh, "Content-Type": "application/json" },
      });
    }

    // PATCH — update own profile
    if (req.method === "PATCH") {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new AppError("Invalid JSON body", 400, "INVALID_JSON");
      }

      const validation = validate(schemas.profileUpdate, body, rh);
      if (validation.error) return validation.error;

      const { data, error } = await supabase
        .from("profiles")
        .update(validation.data!)
        .eq("user_id", userId)
        .select("id, user_id, full_name, email, phone, created_at, updated_at")
        .single();

      if (error) {
        log.error("PATCH profile error", { error: error.message });
        throw new AppError("Failed to update profile", 500, "UPDATE_FAILED");
      }

      log.info("Profile updated", { user_id: userId });

      return new Response(JSON.stringify({ profile: data }), {
        headers: { ...rh, "Content-Type": "application/json" },
      });
    }

    throw new AppError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return handleError(err, { ...corsHeaders, "Content-Type": "application/json" }, requestId, log);
  }
});
