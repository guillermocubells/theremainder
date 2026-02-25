import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { action } = await req.json();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    if (action === "create_account") {
      // Check if seller profile already has a Stripe account
      const { data: existingProfile } = await supabaseAdmin
        .from("seller_profiles")
        .select("stripe_account_id, verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      let stripeAccountId = existingProfile?.stripe_account_id;

      if (!stripeAccountId) {
        // Create Stripe Express account
        const account = await stripe.accounts.create({
          type: "express",
          country: "ES",
          email: user.email,
          capabilities: {
            transfers: { requested: true },
          },
          business_type: "individual",
          metadata: {
            user_id: user.id,
          },
        });
        stripeAccountId = account.id;

        // Update seller profile with Stripe account ID
        await supabaseAdmin
          .from("seller_profiles")
          .update({
            stripe_account_id: stripeAccountId,
            verification_status: "pending",
          })
          .eq("user_id", user.id);
      }

      // Create onboarding link
      const origin = req.headers.get("origin") || "https://theremainder.lovable.app";
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/account?tab=seller&refresh=true`,
        return_url: `${origin}/account?tab=seller&onboarding=complete`,
        type: "account_onboarding",
      });

      return new Response(
        JSON.stringify({ url: accountLink.url, accountId: stripeAccountId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "check_status") {
      const { data: profile } = await supabaseAdmin
        .from("seller_profiles")
        .select("stripe_account_id, verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.stripe_account_id) {
        return new Response(
          JSON.stringify({ status: "not_started", charges_enabled: false, payouts_enabled: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const account = await stripe.accounts.retrieve(profile.stripe_account_id);
      const isVerified = account.charges_enabled && account.payouts_enabled;

      // Update local status if Stripe says verified
      if (isVerified && profile.verification_status !== "verified") {
        await supabaseAdmin
          .from("seller_profiles")
          .update({
            verification_status: "verified",
            stripe_onboarding_complete: true,
            verified_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }

      return new Response(
        JSON.stringify({
          status: isVerified ? "verified" : profile.verification_status,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error) {
    console.error("Connect account error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
