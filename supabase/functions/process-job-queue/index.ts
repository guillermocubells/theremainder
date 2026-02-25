import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 10;

// ── Job handlers ──
// Each handler receives the payload and returns { success, error? }
type JobResult = { success: boolean; error?: string };

async function handleSendEmail(payload: Record<string, unknown>, supabaseUrl: string, serviceRoleKey: string): Promise<JobResult> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${body.slice(0, 500)}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function handleNotifyRestock(payload: Record<string, unknown>, supabaseUrl: string, serviceRoleKey: string): Promise<JobResult> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-restock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${body.slice(0, 500)}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function handleAuctionNotification(payload: Record<string, unknown>, supabaseUrl: string, serviceRoleKey: string): Promise<JobResult> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-auction-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${body.slice(0, 500)}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function handleGenericWebhook(payload: Record<string, unknown>): Promise<JobResult> {
  const { url, method, headers, body } = payload as {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };

  if (!url || typeof url !== "string") {
    return { success: false, error: "Missing or invalid 'url' in payload" };
  }

  try {
    const response = await fetch(url, {
      method: (method as string) || "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const respBody = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${respBody.slice(0, 500)}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Dispatcher ──
async function executeJob(
  jobType: string,
  payload: Record<string, unknown>,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<JobResult> {
  switch (jobType) {
    case "send_email":
      return handleSendEmail(payload, supabaseUrl, serviceRoleKey);
    case "notify_restock":
      return handleNotifyRestock(payload, supabaseUrl, serviceRoleKey);
    case "auction_notification":
    case "send_auction_notification":
      return handleAuctionNotification(payload, supabaseUrl, serviceRoleKey);
    case "webhook":
      return handleGenericWebhook(payload);
    default:
      return { success: false, error: `Unknown job type: ${jobType}` };
  }
}

// ── Main ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Dequeue using row-level locking (FOR UPDATE SKIP LOCKED)
    const { data: jobs, error: fetchError } = await supabase
      .rpc("dequeue_jobs", { p_batch_size: BATCH_SIZE });

    if (fetchError) {
      console.error("[JobQueue] Dequeue error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobs || jobs.length === 0) {
      // Periodic cleanup: remove completed/dead jobs older than 7 days
      await supabase.rpc("cleanup_completed_jobs", { p_retention_days: 7 });

      return new Response(JSON.stringify({ processed: 0, message: "No jobs to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let completed = 0;
    let failed = 0;
    let dead = 0;

    for (const job of jobs) {
      // Already marked as 'processing' by dequeue_jobs RPC

      const result = await executeJob(job.job_type, job.payload, supabaseUrl, serviceRoleKey);
      const newAttempts = job.attempts + 1;

      if (result.success) {
        await supabase
          .from("job_queue")
          .update({
            status: "completed",
            attempts: newAttempts,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        completed++;
        console.log(`[JobQueue] ✓ ${job.job_type} (${job.id}) completed on attempt ${newAttempts}`);
      } else if (newAttempts >= job.max_attempts) {
        // Move to dead letter
        await supabase
          .from("job_queue")
          .update({
            status: "dead",
            attempts: newAttempts,
            last_error: result.error || "Max attempts exceeded",
          })
          .eq("id", job.id);
        dead++;
        console.error(`[JobQueue] ✗ ${job.job_type} (${job.id}) moved to dead letter after ${newAttempts} attempts: ${result.error}`);
      } else {
        // Schedule retry with exponential backoff
        const { data: backoffData } = await supabase.rpc("calculate_backoff", {
          p_attempts: newAttempts,
        });

        // Fallback: calculate in JS if RPC fails
        const backoffMs = backoffData
          ? parseInterval(backoffData)
          : Math.min(Math.pow(2, newAttempts) * 30000, 7200000);

        const nextRetry = new Date(Date.now() + backoffMs).toISOString();

        await supabase
          .from("job_queue")
          .update({
            status: "failed",
            attempts: newAttempts,
            last_error: result.error,
            next_retry_at: nextRetry,
          })
          .eq("id", job.id);
        failed++;
        console.warn(`[JobQueue] ⟳ ${job.job_type} (${job.id}) failed attempt ${newAttempts}/${job.max_attempts}, retry at ${nextRetry}: ${result.error}`);
      }
    }

    const summary = { processed: jobs.length, completed, failed, dead };
    console.log(`[JobQueue] Batch complete:`, summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[JobQueue] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Parse PostgreSQL interval string to milliseconds
function parseInterval(interval: unknown): number {
  if (typeof interval === "string") {
    const match = interval.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      return (parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3])) * 1000;
    }
  }
  return 60000; // fallback: 1 minute
}
