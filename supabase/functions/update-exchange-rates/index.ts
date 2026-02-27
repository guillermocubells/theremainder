import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

// Supported currencies
const TARGET_CURRENCIES = ["USD", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "JPY", "CAD", "AUD"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate: only allow calls with the service role key
    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
      console.warn("[update-exchange-rates] Unauthorized call rejected");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log("[update-exchange-rates] Fetching latest rates from frankfurter.app");

    // Fetch rates from frankfurter.app (free, no API key needed)
    const symbols = TARGET_CURRENCIES.join(",");
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=EUR&to=${symbols}`
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[update-exchange-rates] Frankfurter API error:", errText);
      throw new Error(`Frankfurter API returned ${response.status}`);
    }

    const data = await response.json();
    console.log("[update-exchange-rates] Rates received:", JSON.stringify(data.rates));

    // Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert all rates
    const now = new Date().toISOString();
    const rows = Object.entries(data.rates).map(([currency, rate]) => ({
      base_currency: "EUR",
      target_currency: currency,
      rate: rate as number,
      updated_at: now,
    }));

    // Also add EUR → EUR = 1 for completeness
    rows.push({
      base_currency: "EUR",
      target_currency: "EUR",
      rate: 1,
      updated_at: now,
    });

    const { error } = await supabase
      .from("currency_rates")
      .upsert(rows, { onConflict: "base_currency,target_currency" });

    if (error) {
      console.error("[update-exchange-rates] DB upsert error:", error);
      throw error;
    }

    console.log(`[update-exchange-rates] Successfully updated ${rows.length} rates`);

    return new Response(
      JSON.stringify({
        success: true,
        rates_updated: rows.length,
        date: data.date,
      }),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[update-exchange-rates] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
