# Stripe Webhook — Local Development & Testing

## Overview

FrondaPrima's `stripe-webhook` edge function handles:

| Event | Handler |
|-------|---------|
| `checkout.session.completed` | Order creation, invoicing, stock confirmation, referral rewards |
| `payment_intent.succeeded` | Stock reservation confirmation |
| `payment_intent.payment_failed` | Stock release |
| `charge.refunded` | Refund processing, rectificativa invoice, wallet reversal |

All events are idempotent (deduplicated via `webhook_events` table) and require valid Stripe signature verification.

---

## 1. Prerequisites

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe   # macOS
# or: https://docs.stripe.com/stripe-cli#install

# Login to your Stripe account
stripe login
```

---

## 2. Local Tunnel with Stripe CLI

Forward Stripe events to the deployed edge function:

```bash
# Forward to Lovable Cloud edge function
stripe listen \
  --forward-to https://qsjnjitjbegtrxgwqygg.supabase.co/functions/v1/stripe-webhook

# The CLI prints a webhook signing secret (whsec_...).
# Update the STRIPE_WEBHOOK_SECRET in Lovable Cloud secrets to match.
```

> **Important:** The `stripe listen` signing secret is different from your dashboard webhook secret. When testing locally, you must update the Cloud secret to use the CLI-generated one, then restore it when done.

### Filtering events

```bash
# Only forward relevant events
stripe listen \
  --events checkout.session.completed,payment_intent.succeeded,payment_intent.payment_failed,charge.refunded \
  --forward-to https://qsjnjitjbegtrxgwqygg.supabase.co/functions/v1/stripe-webhook
```

---

## 3. Trigger Test Events

```bash
# Trigger a checkout.session.completed event
stripe trigger checkout.session.completed

# Trigger a payment_intent.succeeded event
stripe trigger payment_intent.succeeded

# Trigger a charge.refunded event
stripe trigger charge.refund_updated

# Trigger a payment failure
stripe trigger payment_intent.payment_failed
```

### Custom fixtures

Create `stripe/fixtures/checkout-complete.json`:

```json
{
  "_meta": { "template_version": 0 },
  "fixtures": [
    {
      "name": "product",
      "path": "/v1/products",
      "method": "post",
      "params": {
        "name": "Trachycarpus fortunei",
        "metadata": { "plant_slug": "trachycarpus-fortunei" }
      }
    },
    {
      "name": "price",
      "path": "/v1/prices",
      "method": "post",
      "params": {
        "product": "${product:id}",
        "currency": "eur",
        "unit_amount": 4990
      }
    },
    {
      "name": "checkout_session",
      "path": "/v1/checkout/sessions",
      "method": "post",
      "params": {
        "mode": "payment",
        "currency": "eur",
        "success_url": "https://theremainder.lovable.app/checkout/success?session_id={CHECKOUT_SESSION_ID}",
        "cancel_url": "https://theremainder.lovable.app/checkout",
        "line_items": [
          { "price": "${price:id}", "quantity": 1 }
        ],
        "metadata": {
          "user_id": "YOUR_TEST_USER_UUID",
          "session_id": "test-session-001",
          "items_json": "[{\"id\":\"test-plant-id\",\"name\":\"Trachycarpus fortunei\",\"quantity\":1,\"price\":49.90,\"image\":\"\"}]",
          "subtotal_cents": "4990",
          "shipping_cents": "995",
          "wallet_discount_cents": "0"
        },
        "shipping_details": {
          "name": "Test User",
          "address": {
            "line1": "Calle Mayor 1",
            "city": "Madrid",
            "postal_code": "28001",
            "state": "Madrid",
            "country": "ES"
          }
        }
      }
    }
  ]
}
```

Run it:

```bash
stripe fixtures stripe/fixtures/checkout-complete.json
```

---

## 4. Automated Tests

Tests live in `supabase/functions/stripe-webhook/index.test.ts`.

### Test categories

| Test | Type | Requires secrets |
|------|------|-----------------|
| Missing signature → 400 | Unit | No |
| Invalid signature → 400 | Unit | No |
| CORS preflight → 200 | Unit | No |
| Valid signed event → recorded | Integration | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SERVICE_ROLE_KEY` |
| Duplicate rejection (idempotency) | Integration | Same |
| Unknown event type → handled:false | Integration | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

### Running tests

Tests run via Lovable's edge function test runner or directly:

```bash
deno test --allow-net --allow-env supabase/functions/stripe-webhook/index.test.ts
```

Integration tests are auto-skipped if the required secrets are not set.

---

## 5. Monitoring Webhook Events

### Query the event store

```sql
-- Recent events
SELECT stripe_event_id, event_type, processing_result, error_message, processed_at
FROM webhook_events
ORDER BY processed_at DESC
LIMIT 20;

-- Failed events
SELECT * FROM webhook_events
WHERE processing_result = 'error'
ORDER BY processed_at DESC;
```

### Stripe CLI event log

```bash
# See recent events in your account
stripe events list --limit 10

# Get details of a specific event
stripe events retrieve evt_xxxxxxxxxxxxx
```

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 400 "Missing signature" | No `stripe-signature` header | Ensure Stripe CLI is forwarding correctly |
| 400 "Webhook signature verification failed" | Secret mismatch | Update `STRIPE_WEBHOOK_SECRET` to match CLI output |
| 200 `{ duplicate: true }` | Event already processed | Expected for replays; check `webhook_events` table |
| 500 "Webhook secret not configured" | Missing secret | Add `STRIPE_WEBHOOK_SECRET` in Lovable Cloud |
| Order not created | Metadata mismatch | Verify `user_id`, `items_json`, `session_id` in checkout metadata |

---

## 7. Security Notes

- **Never disable signature verification** — there is no insecure fallback mode.
- Webhook payloads are **redacted** before storage (no card details, tokens, or PII).
- The `webhook_events` table is restricted to **admin SELECT only**; inserts happen via service role.
- All handlers are **idempotent** — safe to replay events.
