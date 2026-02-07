import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function to mature pending referral rewards
 * Should be called periodically (e.g., daily via cron)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication: Only allow calls from service role (cron/scheduler)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[MATURE-REWARDS] Missing authorization header");
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Only accept service role key — this function should not be callable by regular users
  if (token !== serviceRoleKey) {
    console.error("[MATURE-REWARDS] Invalid authorization — not service role");
    return new Response(
      JSON.stringify({ success: false, error: "Forbidden" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey
  );

  try {
    console.log("[MATURE-REWARDS] Starting reward maturation process");

    // Call the database function to mature rewards
    const { data: maturedCount, error } = await supabaseAdmin.rpc("mature_pending_rewards");

    if (error) {
      console.error("[MATURE-REWARDS] Error maturing rewards:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`[MATURE-REWARDS] Matured ${maturedCount} rewards`);

    return new Response(
      JSON.stringify({ success: true, maturedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[MATURE-REWARDS] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
