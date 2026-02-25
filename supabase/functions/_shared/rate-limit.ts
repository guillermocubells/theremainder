/**
 * Shared rate-limiting middleware for Supabase Edge Functions.
 *
 * Features:
 *  - Dual-window: burst (short) + sustained (long) limits
 *  - IP + optional user-based keying
 *  - Webhook allow-list (Stripe IPs bypass rate limits)
 *  - Automatic map cleanup to prevent memory leaks
 *  - Standard rate-limit response headers
 */

// ── Stripe webhook IP ranges (CIDR-simplified, checked as prefixes) ──
// https://docs.stripe.com/ips#webhook-ip-addresses
const WEBHOOK_ALLOW_PREFIXES = [
  "3.18.", "3.130.", "13.235.", "18.211.", "35.154.", "35.157.",
  "52.49.", "54.187.", "54.88.", "54.241.",
];

function isAllowListed(ip: string): boolean {
  return WEBHOOK_ALLOW_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

// ── Types ──

export interface RateLimitConfig {
  /** Max requests in burst window (e.g. 10 req / 10s) */
  burstLimit: number;
  /** Burst window in milliseconds (default 10_000 = 10s) */
  burstWindowMs: number;
  /** Max requests in sustained window (e.g. 60 req / 60s) */
  sustainedLimit: number;
  /** Sustained window in milliseconds (default 60_000 = 60s) */
  sustainedWindowMs: number;
  /** Use user ID as key instead of / in addition to IP */
  keyByUser?: boolean;
  /** Skip rate limiting for webhook allow-listed IPs */
  allowWebhooks?: boolean;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

// ── Default presets ──

export const PRESETS = {
  /** Public read endpoints (catalog, sitemap) */
  public_read: {
    burstLimit: 20,
    burstWindowMs: 10_000,
    sustainedLimit: 120,
    sustainedWindowMs: 60_000,
    allowWebhooks: false,
  },
  /** Authenticated write endpoints (checkout, deposit) */
  auth_write: {
    burstLimit: 5,
    burstWindowMs: 10_000,
    sustainedLimit: 20,
    sustainedWindowMs: 60_000,
    keyByUser: true,
    allowWebhooks: false,
  },
  /** Form submissions (inquiries, consent) */
  form_submit: {
    burstLimit: 3,
    burstWindowMs: 10_000,
    sustainedLimit: 10,
    sustainedWindowMs: 60_000,
    allowWebhooks: false,
  },
  /** Webhook receivers (Stripe) — generous with allow-list */
  webhook: {
    burstLimit: 100,
    burstWindowMs: 10_000,
    sustainedLimit: 500,
    sustainedWindowMs: 60_000,
    allowWebhooks: true,
  },
  /** Internal / cron-triggered functions */
  internal: {
    burstLimit: 50,
    burstWindowMs: 10_000,
    sustainedLimit: 200,
    sustainedWindowMs: 60_000,
    allowWebhooks: false,
  },
} as const satisfies Record<string, RateLimitConfig>;

// ── Rate limiter singleton ──

const burstMap = new Map<string, WindowEntry>();
const sustainedMap = new Map<string, WindowEntry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60_000; // 5 min

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [k, v] of burstMap) if (now > v.resetAt) burstMap.delete(k);
  for (const [k, v] of sustainedMap) if (now > v.resetAt) sustainedMap.delete(k);
}

function checkWindow(
  map: Map<string, WindowEntry>,
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  return { allowed: entry.count <= limit, remaining, resetAt: entry.resetAt };
}

export interface RateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
  key: string;
}

/**
 * Check rate limit for a request.
 */
export function checkRateLimit(
  req: Request,
  config: RateLimitConfig,
  userId?: string | null
): RateLimitResult {
  cleanup();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Allow-listed webhook IPs bypass rate limiting
  if (config.allowWebhooks && isAllowListed(ip)) {
    return {
      allowed: true,
      headers: { "X-RateLimit-Bypass": "webhook-allowlist" },
      key: ip,
    };
  }

  const key = config.keyByUser && userId ? `user:${userId}` : `ip:${ip}`;

  const burst = checkWindow(burstMap, key, config.burstLimit, config.burstWindowMs);
  const sustained = checkWindow(sustainedMap, key, config.sustainedLimit, config.sustainedWindowMs);

  const allowed = burst.allowed && sustained.allowed;
  const retryAfterMs = !allowed
    ? Math.min(
        burst.allowed ? Infinity : burst.resetAt - Date.now(),
        sustained.allowed ? Infinity : sustained.resetAt - Date.now()
      )
    : 0;

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(config.sustainedLimit),
    "X-RateLimit-Remaining": String(Math.min(burst.remaining, sustained.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(sustained.resetAt / 1000)),
  };

  if (!allowed) {
    headers["Retry-After"] = String(Math.ceil(retryAfterMs / 1000));
  }

  return { allowed, headers, key };
}

/**
 * Build a 429 Too Many Requests response.
 */
export function rateLimitResponse(
  headers: Record<string, string>,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...headers,
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Helper to extract user ID from authorization header (JWT).
 */
export function extractUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}
