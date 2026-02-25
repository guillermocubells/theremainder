/**
 * Shared Zod validation schemas & helpers for all Edge Functions.
 *
 * Usage:
 *   import { validate, schemas } from "../_shared/validation.ts";
 *
 *   const result = validate(schemas.checkout, body, corsHeaders);
 *   if (result.error) return result.error;  // 422 Response
 *   const data = result.data;               // fully typed
 */

import { z } from "https://esm.sh/zod@3.23.8";

// ────────────────────────────────────────────────────
//  Reusable primitives
// ────────────────────────────────────────────────────

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Must be a valid UUID"
);

const slug = z.string().regex(
  /^[a-z0-9][a-z0-9-]{0,198}[a-z0-9]$/,
  "Must be a valid slug"
);

const plantId = z.string().min(1).max(250).refine(
  (v) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ||
    /^[a-z0-9][a-z0-9-]{0,198}[a-z0-9]$/.test(v),
  "Must be a UUID or slug"
);

const countryCode = z.string().regex(/^[A-Z]{2}$/, "Must be a 2-letter ISO country code");

const email = z
  .string()
  .max(254)
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    "Invalid email"
  );

const referralCode = z
  .string()
  .regex(/^FP-[A-Za-z0-9]{4}$/, "Invalid referral code format")
  .transform((v) => v.toUpperCase());

const locale = z.enum(["es", "en"]).default("es");

const quantity = z.number().int().min(1).max(100);

// ────────────────────────────────────────────────────
//  Cart item schema (reused in checkout & shipping)
// ────────────────────────────────────────────────────

const cartItem = z.object({
  plantId,
  quantity,
  image: z.string().max(2000).optional(),
  containerSize: z.string().max(100).optional(),
});

// ────────────────────────────────────────────────────
//  Shipping address sub-schema
// ────────────────────────────────────────────────────

const shippingAddress = z.object({
  email: email.optional(),
  fullName: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  street: z.string().max(500).optional(),
  apartment: z.string().max(200).optional(),
  postalCode: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  country: z.string().max(10).optional(),
  notes: z.string().max(1000).optional(),
});

// ────────────────────────────────────────────────────
//  Endpoint schemas
// ────────────────────────────────────────────────────

const checkoutSchema = z
  .object({
    action: z.literal("refund").optional(),
    // Refund fields
    payment_intent_id: z.string().min(1).max(200).optional(),
    reason: z.string().max(500).optional(),
    // Checkout fields
    items: z.array(cartItem).min(1).max(50).optional(),
    shippingCountry: countryCode.optional(),
    shippingAddress: shippingAddress.optional(),
    locale: locale.optional(),
    referralCode: referralCode.optional(),
    useWalletBalance: z.boolean().optional(),
  })
  .refine(
    (d) => d.action === "refund" || (d.items && d.items.length > 0 && d.shippingCountry),
    { message: "items and shippingCountry are required for checkout" }
  );

const calculateShippingSchema = z.object({
  items: z.array(cartItem).min(1).max(50),
  countryCode,
});

const submitInquirySchema = z.object({
  owned_plant_id: uuid,
  shared_list_id: uuid.optional().nullable(),
  message: z.string().min(1).max(700),
  viewer_email: email.optional().nullable(),
  offer_type: z.enum(["buy", "trade", "question"]).default("question"),
});

const auctionDepositSchema = z.object({
  action: z.enum(["create", "confirm", "refund"]),
  auction_id: uuid,
});

const recordAuctionConsentSchema = z.object({
  consent_type: z.enum(["bidder", "seller"]),
  terms_version: z.string().min(1).max(50),
  user_agent: z.string().max(500).optional(),
});

const profileUpdateSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(1, "full_name cannot be empty")
      .max(120)
      .nullable()
      .optional(),
    phone: z
      .string()
      .trim()
      .max(20)
      .regex(/^\+?[\d\s\-().]{7,20}$/, "Invalid phone number format")
      .nullable()
      .optional(),
  })
  .strict();

// ────────────────────────────────────────────────────
//  Validation helper
// ────────────────────────────────────────────────────

interface ValidationError {
  error: Response;
}

interface ValidationSuccess<T> {
  data: T;
  error?: never;
}

type ValidationResult<T> = ValidationError | ValidationSuccess<T>;

/**
 * Validate `input` against a Zod schema.
 * Returns `{ data }` on success or `{ error: Response(422) }` on failure.
 */
function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
  corsHeaders: Record<string, string>
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    }));

    const response = new Response(
      JSON.stringify({
        error: "Validation failed",
        issues,
      }),
      {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

    return { error: response };
  }

  return { data: result.data };
}

// ────────────────────────────────────────────────────
//  Exports
// ────────────────────────────────────────────────────

export const schemas = {
  checkout: checkoutSchema,
  calculateShipping: calculateShippingSchema,
  submitInquiry: submitInquirySchema,
  auctionDeposit: auctionDepositSchema,
  recordAuctionConsent: recordAuctionConsentSchema,
  profileUpdate: profileUpdateSchema,
  // Primitives for ad-hoc usage
  uuid,
  slug,
  plantId,
  countryCode,
  email,
  referralCode,
  locale,
  quantity,
  cartItem,
  shippingAddress,
};

export { validate, z };
export type { ValidationResult };
