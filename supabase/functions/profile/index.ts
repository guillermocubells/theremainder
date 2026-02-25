import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}

// ---------- Validation helpers ----------

const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 20;
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

interface ProfileUpdate {
  full_name?: string;
  phone?: string;
}

function validateProfileUpdate(body: unknown): { data?: ProfileUpdate; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object" };
  }

  const input = body as Record<string, unknown>;
  const update: ProfileUpdate = {};
  const allowedFields = ["full_name", "phone"];

  // Reject unknown fields
  for (const key of Object.keys(input)) {
    if (!allowedFields.includes(key)) {
      return { error: `Unknown field: ${key}` };
    }
  }

  if ("full_name" in input) {
    if (input.full_name !== null && typeof input.full_name !== "string") {
      return { error: "full_name must be a string or null" };
    }
    if (typeof input.full_name === "string") {
      const trimmed = input.full_name.trim();
      if (trimmed.length === 0) {
        return { error: "full_name cannot be empty" };
      }
      if (trimmed.length > MAX_NAME_LENGTH) {
        return { error: `full_name must be at most ${MAX_NAME_LENGTH} characters` };
      }
      update.full_name = trimmed;
    } else {
      update.full_name = undefined; // null → clear
    }
  }

  if ("phone" in input) {
    if (input.phone !== null && typeof input.phone !== "string") {
      return { error: "phone must be a string or null" };
    }
    if (typeof input.phone === "string") {
      const trimmed = input.phone.trim();
      if (trimmed.length > 0 && !PHONE_REGEX.test(trimmed)) {
        return { error: "Invalid phone number format" };
      }
      if (trimmed.length > MAX_PHONE_LENGTH) {
        return { error: `phone must be at most ${MAX_PHONE_LENGTH} characters` };
      }
      update.phone = trimmed.length > 0 ? trimmed : undefined;
    } else {
      update.phone = undefined;
    }
  }

  if (Object.keys(update).length === 0) {
    return { error: "No valid fields to update" };
  }

  return { data: update };
}

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

  // Authenticate
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return errorResponse(auth.error, 401);
  }

  const { userId, supabase } = auth;

  // GET — fetch own profile
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email, phone, created_at, updated_at")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("GET profile error:", error);
      return errorResponse("Profile not found", 404);
    }

    return jsonResponse({ profile: data });
  }

  // PATCH — update own profile
  if (req.method === "PATCH") {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const validation = validateProfileUpdate(body);
    if (validation.error) {
      return errorResponse(validation.error, 422);
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(validation.data!)
      .eq("user_id", userId)
      .select("id, user_id, full_name, email, phone, created_at, updated_at")
      .single();

    if (error) {
      console.error("PATCH profile error:", error);
      return errorResponse("Failed to update profile", 500);
    }

    return jsonResponse({ profile: data });
  }

  return errorResponse("Method not allowed", 405);
});
