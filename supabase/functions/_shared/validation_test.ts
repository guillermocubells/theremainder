/**
 * Test fixtures & unit tests for shared validation schemas.
 *
 * Run: supabase--test-edge-functions (functions: ["_shared"])
 *   or via the Deno test runner targeting this file.
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { schemas, validate } from "./validation.ts";

const CORS = { "Access-Control-Allow-Origin": "*" };

// ────────────────────────────────────────────────────
//  Fixtures
// ────────────────────────────────────────────────────

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const fixtures = {
  calculateShipping: {
    valid: {
      items: [{ plantId: "monstera-deliciosa", quantity: 2 }],
      countryCode: "ES",
    },
    invalid: [
      { label: "empty items", body: { items: [], countryCode: "ES" } },
      { label: "bad country", body: { items: [{ plantId: "x", quantity: 1 }], countryCode: "XX1" } },
      { label: "missing countryCode", body: { items: [{ plantId: "abc", quantity: 1 }] } },
      { label: "quantity zero", body: { items: [{ plantId: "abc", quantity: 0 }], countryCode: "ES" } },
      { label: "quantity 101", body: { items: [{ plantId: "abc", quantity: 101 }], countryCode: "ES" } },
    ],
  },

  submitInquiry: {
    valid: {
      owned_plant_id: VALID_UUID,
      message: "Is this available for trade?",
      offer_type: "trade",
    },
    invalid: [
      { label: "missing message", body: { owned_plant_id: VALID_UUID } },
      { label: "bad uuid", body: { owned_plant_id: "not-a-uuid", message: "hi" } },
      { label: "bad offer_type", body: { owned_plant_id: VALID_UUID, message: "hi", offer_type: "steal" } },
      { label: "message too long", body: { owned_plant_id: VALID_UUID, message: "x".repeat(701) } },
      { label: "bad email", body: { owned_plant_id: VALID_UUID, message: "hi", viewer_email: "not-email" } },
    ],
  },

  auctionDeposit: {
    valid: { action: "create", auction_id: VALID_UUID },
    invalid: [
      { label: "bad action", body: { action: "hack", auction_id: VALID_UUID } },
      { label: "bad uuid", body: { action: "create", auction_id: "bad" } },
      { label: "missing action", body: { auction_id: VALID_UUID } },
    ],
  },

  recordAuctionConsent: {
    valid: { consent_type: "bidder", terms_version: "v2025.1" },
    invalid: [
      { label: "bad consent_type", body: { consent_type: "admin", terms_version: "v1" } },
      { label: "missing version", body: { consent_type: "bidder" } },
    ],
  },

  profileUpdate: {
    valid: { full_name: "Ana García" },
    invalid: [
      { label: "empty name", body: { full_name: "" } },
      { label: "name too long", body: { full_name: "x".repeat(121) } },
      { label: "unknown field", body: { full_name: "Ana", avatar: "evil.png" } },
      { label: "bad phone", body: { phone: "abc" } },
    ],
  },
};

// ────────────────────────────────────────────────────
//  Tests
// ────────────────────────────────────────────────────

Deno.test("calculateShipping: accepts valid input", () => {
  const r = validate(schemas.calculateShipping, fixtures.calculateShipping.valid, CORS);
  assertEquals("error" in r && r.error instanceof Response, false);
  if (!("error" in r)) assertEquals(r.data.countryCode, "ES");
});

for (const tc of fixtures.calculateShipping.invalid) {
  Deno.test(`calculateShipping: rejects ${tc.label}`, async () => {
    const r = validate(schemas.calculateShipping, tc.body, CORS);
    assertEquals(r.error instanceof Response, true);
    assertEquals(r.error!.status, 422);
    const body = await r.error!.json();
    assertEquals(typeof body.error, "string");
    assertEquals(Array.isArray(body.issues), true);
  });
}

Deno.test("submitInquiry: accepts valid input", () => {
  const r = validate(schemas.submitInquiry, fixtures.submitInquiry.valid, CORS);
  assertEquals("error" in r && r.error instanceof Response, false);
  if (!("error" in r)) assertEquals(r.data.offer_type, "trade");
});

for (const tc of fixtures.submitInquiry.invalid) {
  Deno.test(`submitInquiry: rejects ${tc.label}`, async () => {
    const r = validate(schemas.submitInquiry, tc.body, CORS);
    assertEquals(r.error instanceof Response, true);
    assertEquals(r.error!.status, 422);
    await r.error!.text(); // consume body
  });
}

Deno.test("auctionDeposit: accepts valid input", () => {
  const r = validate(schemas.auctionDeposit, fixtures.auctionDeposit.valid, CORS);
  assertEquals("error" in r && r.error instanceof Response, false);
  if (!("error" in r)) assertEquals(r.data.action, "create");
});

for (const tc of fixtures.auctionDeposit.invalid) {
  Deno.test(`auctionDeposit: rejects ${tc.label}`, async () => {
    const r = validate(schemas.auctionDeposit, tc.body, CORS);
    assertEquals(r.error instanceof Response, true);
    assertEquals(r.error!.status, 422);
    await r.error!.text();
  });
}

Deno.test("recordAuctionConsent: accepts valid input", () => {
  const r = validate(schemas.recordAuctionConsent, fixtures.recordAuctionConsent.valid, CORS);
  assertEquals("error" in r && r.error instanceof Response, false);
});

for (const tc of fixtures.recordAuctionConsent.invalid) {
  Deno.test(`recordAuctionConsent: rejects ${tc.label}`, async () => {
    const r = validate(schemas.recordAuctionConsent, tc.body, CORS);
    assertEquals(r.error instanceof Response, true);
    assertEquals(r.error!.status, 422);
    await r.error!.text();
  });
}

Deno.test("profileUpdate: accepts valid input", () => {
  const r = validate(schemas.profileUpdate, fixtures.profileUpdate.valid, CORS);
  assertEquals("error" in r && r.error instanceof Response, false);
  if (!("error" in r)) assertEquals(r.data.full_name, "Ana García");
});

for (const tc of fixtures.profileUpdate.invalid) {
  Deno.test(`profileUpdate: rejects ${tc.label}`, async () => {
    const r = validate(schemas.profileUpdate, tc.body, CORS);
    assertEquals(r.error instanceof Response, true);
    assertEquals(r.error!.status, 422);
    await r.error!.text();
  });
}

// ── 422 error shape ──

Deno.test("422 response has correct shape: { error, issues[] }", async () => {
  const r = validate(schemas.calculateShipping, { items: "not-array" }, CORS);
  assertEquals(r.error!.status, 422);
  const body = await r.error!.json();
  assertEquals(body.error, "Validation failed");
  assertEquals(Array.isArray(body.issues), true);
  assertEquals(typeof body.issues[0].path, "string");
  assertEquals(typeof body.issues[0].message, "string");
  assertEquals(typeof body.issues[0].code, "string");
});
