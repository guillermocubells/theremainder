/**
 * Stripe Webhook – Unit & Integration Tests
 *
 * Run with:  supabase functions test stripe-webhook
 * Or via Lovable's edge-function test runner.
 *
 * These tests call the deployed function directly.
 * For local development with real Stripe events, see docs/STRIPE_LOCAL_DEV.md.
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/stripe-webhook`;

// ─── Helpers ──────────────────────────────────────────────

function buildStripeEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `evt_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
    object: "event",
    api_version: "2025-08-27.basil",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
        object: "checkout.session",
        payment_intent: `pi_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
        customer: `cus_test_abc123`,
        amount_total: 5990,
        currency: "eur",
        metadata: {
          user_id: "00000000-0000-0000-0000-000000000000",
          session_id: "test-session-001",
          items_json: JSON.stringify([]),
          subtotal_cents: "4990",
          shipping_cents: "1000",
          wallet_discount_cents: "0",
        },
        customer_details: { email: "test@example.com", name: "Test Buyer" },
        shipping_details: {
          name: "Test Buyer",
          address: {
            line1: "Calle Test 1",
            city: "Madrid",
            postal_code: "28001",
            state: "Madrid",
            country: "ES",
          },
        },
      },
    },
    ...overrides,
  };
}

function signPayload(payload: string, secret: string): string {
  // Generate Stripe-compatible signature header using HMAC-SHA256
  const encoder = new TextEncoder();
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;

  // We can't easily do HMAC in a sync test helper without crypto.subtle,
  // so for integration tests we rely on Stripe SDK to sign.
  // This function is a placeholder for documentation purposes.
  // Real signing is done via stripe.webhooks.generateTestHeaderString()
  return `t=${timestamp},v1=placeholder`;
}

// ─── Tests ────────────────────────────────────────────────

Deno.test("Webhook rejects request without stripe-signature header", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(buildStripeEvent()),
  });

  const data = await res.json();
  assertEquals(res.status, 400);
  assertEquals(data.error, "Missing signature");
});

Deno.test("Webhook rejects invalid signature", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "stripe-signature": "t=1234567890,v1=invalid_signature_value",
    },
    body: JSON.stringify(buildStripeEvent()),
  });

  const data = await res.json();
  assertEquals(res.status, 400);
  assertEquals(data.error, "Webhook signature verification failed");
});

Deno.test("Webhook handles OPTIONS (CORS preflight)", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "OPTIONS",
    headers: {
      Origin: "https://theremainder.lovable.app",
      "Access-Control-Request-Method": "POST",
    },
  });
  await res.text(); // consume body
  assertEquals(res.status, 200);
  assertExists(res.headers.get("access-control-allow-origin"));
});

// Integration test: requires STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
// This constructs a properly signed event and sends it
Deno.test({
  name: "Webhook processes valid signed event and records in webhook_events",
  ignore: !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SERVICE_ROLE_KEY,
  async fn() {
    const stripe = new Stripe(STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" });
    const event = buildStripeEvent({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: `pi_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
          object: "payment_intent",
          amount: 5990,
          currency: "eur",
          status: "succeeded",
          metadata: {},
        },
      },
    });

    const payload = JSON.stringify(event);
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET!,
    });

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "stripe-signature": header,
      },
      body: payload,
    });

    const data = await res.json();
    assertEquals(res.status, 200);
    assertEquals(data.received, true);

    // Verify event was recorded in webhook_events table
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY!);
    const { data: recorded } = await supabaseAdmin
      .from("webhook_events")
      .select("*")
      .eq("stripe_event_id", event.id as string)
      .maybeSingle();

    assertExists(recorded, "Event should be recorded in webhook_events");
    assertEquals(recorded.event_type, "payment_intent.succeeded");
    assertEquals(recorded.processing_result, "success");
  },
});

// Idempotency test: send the same event twice
Deno.test({
  name: "Webhook rejects duplicate event (idempotency)",
  ignore: !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SERVICE_ROLE_KEY,
  async fn() {
    const stripe = new Stripe(STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" });
    const eventId = `evt_test_idempotent_${Date.now()}`;
    const event = buildStripeEvent({
      id: eventId,
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: `pi_test_idemp_${Date.now()}`,
          object: "payment_intent",
          amount: 1000,
          currency: "eur",
          status: "succeeded",
          metadata: {},
        },
      },
    });

    const payload = JSON.stringify(event);

    // First request
    const header1 = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET!,
    });
    const res1 = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "stripe-signature": header1,
      },
      body: payload,
    });
    const data1 = await res1.json();
    assertEquals(res1.status, 200);
    assertEquals(data1.received, true);

    // Second request (duplicate)
    const header2 = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET!,
    });
    const res2 = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "stripe-signature": header2,
      },
      body: payload,
    });
    const data2 = await res2.json();
    assertEquals(res2.status, 200);
    assertEquals(data2.duplicate, true);
  },
});

// Unhandled event type test
Deno.test({
  name: "Webhook returns handled:false for unknown event types",
  ignore: !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET,
  async fn() {
    const stripe = new Stripe(STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" });
    const event = buildStripeEvent({
      type: "customer.created",
      data: {
        object: {
          id: `cus_test_${Date.now()}`,
          object: "customer",
          email: "test@test.com",
        },
      },
    });

    const payload = JSON.stringify(event);
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET!,
    });

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "stripe-signature": header,
      },
      body: payload,
    });

    const data = await res.json();
    assertEquals(res.status, 200);
    assertEquals(data.handled, false);
  },
});
