import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRule {
  id: string;
  name: string;
  metric_name: string;
  condition: string;
  threshold: number;
  window_minutes: number;
  severity: string;
  cooldown_minutes: number;
  tags_filter: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch active alert rules
    const { data: rules, error: rulesError } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("is_active", true);

    if (rulesError) {
      console.error("[Alerts] Error fetching rules:", rulesError);
      return new Response(JSON.stringify({ error: rulesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ evaluated: 0, fired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fired = 0;

    for (const rule of rules as AlertRule[]) {
      // Check cooldown: don't fire if we recently fired this rule
      const { data: recentAlert } = await supabase
        .from("alert_events")
        .select("id")
        .eq("rule_id", rule.id)
        .gte("created_at", new Date(Date.now() - rule.cooldown_minutes * 60 * 1000).toISOString())
        .limit(1);

      if (recentAlert && recentAlert.length > 0) {
        continue; // In cooldown
      }

      // Determine aggregation type from condition
      let agg = "count";
      if (rule.condition === "avg_gt") agg = "avg";
      else if (rule.condition === "sum_gt") agg = "sum";

      // Get metric aggregate
      const { data: metricValue, error: metricError } = await supabase.rpc(
        "get_metric_aggregate",
        {
          p_name: rule.metric_name,
          p_window_minutes: rule.window_minutes,
          p_agg: agg,
          p_tags_filter: rule.tags_filter || {},
        }
      );

      if (metricError) {
        console.error(`[Alerts] Error getting metric for rule ${rule.name}:`, metricError);
        continue;
      }

      const value = typeof metricValue === "number" ? metricValue : parseFloat(metricValue) || 0;

      // Evaluate threshold
      const breached = value > rule.threshold;

      if (breached) {
        const message = `Alert: ${rule.name} — ${rule.metric_name} = ${value} (threshold: ${rule.threshold}) in last ${rule.window_minutes}min`;
        console.warn(`[Alerts] 🚨 ${message}`);

        // Insert alert event
        await supabase.from("alert_events").insert({
          rule_id: rule.id,
          rule_name: rule.name,
          severity: rule.severity,
          metric_name: rule.metric_name,
          metric_value: value,
          threshold: rule.threshold,
          message,
        });

        // For critical alerts, also enqueue notification email
        if (rule.severity === "critical") {
          await supabase.rpc("enqueue_job", {
            p_job_type: "send_email",
            p_payload: {
              template: "alert_notification",
              to_admin: true,
              subject: `🚨 ${rule.severity.toUpperCase()}: ${rule.name}`,
              body: message,
              metadata: {
                rule_id: rule.id,
                metric_name: rule.metric_name,
                metric_value: value,
                threshold: rule.threshold,
              },
            },
            p_priority: 10,
          }).catch((err: Error) => {
            console.error("[Alerts] Failed to enqueue notification:", err.message);
          });
        }

        fired++;
      }
    }

    const summary = { evaluated: rules.length, fired };
    console.log("[Alerts] Evaluation complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Alerts] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
