import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { handleError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { log, requestId } = createLogger(
    "nightly-reputation-maintenance",
    req,
  );

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results = {
      decay: { users_updated: 0, entries_decayed: 0 },
      confidence: { users_updated: 0 },
      brigading: { suspects: 0, alerts_enqueued: 0 },
      badges: { reassigned: 0 },
    };

    // ── 1. Score decay ──
    log.info("Starting score decay");
    const { data: decayData, error: decayErr } = await supabase.rpc(
      "apply_score_decay",
      { p_decay_days: 180, p_decay_factor: 0.9 },
    );

    if (decayErr) {
      log.error("Score decay failed", { error: decayErr.message });
    } else if (decayData && decayData.length > 0) {
      results.decay = {
        users_updated: decayData[0].users_updated,
        entries_decayed: decayData[0].entries_decayed,
      };
      log.info("Score decay complete", results.decay);
    }

    // ── 2. Confidence recompute ──
    log.info("Starting confidence recompute");
    const { data: confData, error: confErr } = await supabase.rpc(
      "recompute_confidence",
    );

    if (confErr) {
      log.error("Confidence recompute failed", { error: confErr.message });
    } else {
      results.confidence.users_updated = confData ?? 0;
      log.info("Confidence recompute complete", results.confidence);
    }

    // ── 3. Vote brigading detection ──
    log.info("Starting brigading detection");
    const { data: brigadingData, error: brigadingErr } = await supabase.rpc(
      "detect_vote_brigading",
      { p_window_minutes: 30, p_threshold: 5 },
    );

    if (brigadingErr) {
      log.error("Brigading detection failed", { error: brigadingErr.message });
    } else if (brigadingData && brigadingData.length > 0) {
      results.brigading.suspects = brigadingData.length;
      log.warn("Brigading suspects detected", {
        count: brigadingData.length,
      });

      // Enqueue moderation alerts for each suspect
      for (const suspect of brigadingData) {
        // Create a content report for the brigading pattern
        const { error: reportErr } = await supabase
          .from("content_reports")
          .insert({
            user_id: suspect.voter_id,
            entity_type: "review",
            entity_id: suspect.target_review_id,
            reason: "vote_brigading",
            details: `Automated detection: ${suspect.vote_count} votes on same review within ${Math.round((new Date(suspect.last_vote).getTime() - new Date(suspect.first_vote).getTime()) / 60000)}min window`,
            status: "pending",
          });

        if (reportErr) {
          log.error("Failed to create brigading report", {
            voter: suspect.voter_id,
            error: reportErr.message,
          });
          continue;
        }

        // Enqueue alert email to moderators
        await supabase
          .rpc("enqueue_job", {
            p_job_type: "send_email",
            p_payload: {
              template: "moderation_alert",
              to_admin: true,
              subject: "🚨 Vote brigading detected",
              body: `User ${suspect.voter_id} cast ${suspect.vote_count} votes on review ${suspect.target_review_id} between ${suspect.first_vote} and ${suspect.last_vote}`,
              metadata: {
                voter_id: suspect.voter_id,
                review_id: suspect.target_review_id,
                vote_count: suspect.vote_count,
              },
            },
            p_priority: 8,
          })
          .then(() => {
            results.brigading.alerts_enqueued++;
          })
          .catch((err: Error) => {
            log.error("Failed to enqueue brigading alert", {
              error: err.message,
            });
          });
      }

      log.info("Brigading alerts processed", results.brigading);
    } else {
      log.info("No brigading detected");
    }

    // ── 4. Badge reassignment after decay ──
    if (results.decay.users_updated > 0) {
      log.info("Reassigning badges after decay");

      // Get all badge thresholds
      const { data: thresholds } = await supabase
        .from("badge_thresholds")
        .select("*")
        .order("min_score", { ascending: false });

      if (thresholds && thresholds.length > 0) {
        // Get users whose scores changed
        const { data: users } = await supabase
          .from("user_reputation")
          .select("user_id, total_score")
          .not("last_maintenance_at", "is", null);

        if (users) {
          for (const user of users) {
            // Find badges user should have
            const earned = thresholds.filter(
              (t) => user.total_score >= t.min_score,
            );
            const earnedKeys = earned.map((t) => t.badge_key);

            // Get current active badges
            const { data: current } = await supabase
              .from("user_badges")
              .select("badge_key")
              .eq("user_id", user.user_id)
              .eq("is_active", true);

            const currentKeys = (current ?? []).map(
              (b: { badge_key: string }) => b.badge_key,
            );

            // Revoke badges no longer earned
            const toRevoke = currentKeys.filter(
              (k: string) => !earnedKeys.includes(k),
            );
            if (toRevoke.length > 0) {
              await supabase
                .from("user_badges")
                .update({ is_active: false, revoked_at: new Date().toISOString() })
                .eq("user_id", user.user_id)
                .in("badge_key", toRevoke);
              results.badges.reassigned += toRevoke.length;
            }
          }
        }
      }

      log.info("Badge reassignment complete", results.badges);
    }

    // ── Record maintenance metric ──
    const { error: metricErr } = await supabase.from("api_metrics").insert({
      name: "nightly_maintenance",
      value: 1,
      tags: results as unknown as Record<string, unknown>,
    });
    if (metricErr) {
      log.warn("Failed to record metric", { error: metricErr.message });
    }

    const summary = {
      ...results,
      completed_at: new Date().toISOString(),
    };

    log.info("Nightly maintenance complete", summary);

    return new Response(JSON.stringify(summary), {
      headers: {
        ...corsHeaders,
        ...withCorrelationId({}, requestId),
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleError(error, corsHeaders, requestId, log);
  }
});
