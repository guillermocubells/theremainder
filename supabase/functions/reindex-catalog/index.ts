import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * reindex-catalog edge function
 *
 * Modes:
 *   POST { "mode": "full" }              → full reindex of all plants
 *   POST { "mode": "incremental", "plant_ids": ["uuid",...] }  → reindex specific plants
 *   POST { "mode": "delete", "plant_ids": ["uuid",...] }       → remove from index
 *   POST { "mode": "backfill" }          → same as full, but logs as backfill
 *
 * Auth: requires admin role or service-role key.
 * Idempotency: checksum-based — re-running with unchanged data is a no-op.
 * Retry: designed to be called via job_queue with automatic retry/dead-letter.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate: accept service role or admin JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // If not service role, verify admin
    if (token !== serviceRoleKey) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin role required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const mode: string = body.mode || "full";
    const plantIds: string[] = body.plant_ids || [];

    let result: Record<string, unknown>;

    switch (mode) {
      case "full":
      case "backfill": {
        console.log(`[reindex-catalog] Starting ${mode} reindex...`);
        const { data, error } = await supabase.rpc("full_reindex_catalog", {
          p_batch_size: 100,
        });
        if (error) throw error;
        result = { mode, ...(data as Record<string, unknown>) };
        break;
      }

      case "incremental": {
        if (!plantIds.length) {
          return new Response(
            JSON.stringify({ error: "plant_ids required for incremental mode" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[reindex-catalog] Incremental reindex for ${plantIds.length} plants`);
        let indexed = 0;
        let skipped = 0;
        let errors = 0;

        for (const id of plantIds) {
          const { data, error } = await supabase.rpc("reindex_plant", {
            p_plant_id: id,
          });
          if (error) {
            console.error(`[reindex-catalog] Error reindexing ${id}:`, error.message);
            errors++;
          } else if (data === true) {
            indexed++;
          } else {
            skipped++;
          }
        }

        result = { mode, total: plantIds.length, indexed, skipped, errors };
        break;
      }

      case "delete": {
        if (!plantIds.length) {
          return new Response(
            JSON.stringify({ error: "plant_ids required for delete mode" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[reindex-catalog] Deleting ${plantIds.length} plants from index`);
        const { error } = await supabase
          .from("plant_search_index")
          .delete()
          .in("plant_id", plantIds);

        if (error) throw error;
        result = { mode, deleted: plantIds.length };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown mode: ${mode}. Use full, incremental, delete, or backfill.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const durationMs = Date.now() - startTime;
    console.log(`[reindex-catalog] Completed in ${durationMs}ms:`, result);

    return new Response(
      JSON.stringify({ ...result, duration_ms: durationMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[reindex-catalog] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
