/**
 * Centralized store configuration.
 * Single source of truth for brand, contact, SEO, and business settings.
 */

// ─── Brand ───
export const STORE_BRAND = {
  name: "The Remainder",
  tagline: "Plantas de altura. Germinadas y compartidas una vez",
  legalName: "The Remainder",
  url: "https://theremainder.lovable.app",
} as const;

// ─── Contact ───
export const STORE_CONTACT = {
  whatsappNumber: "34655699978",
  whatsappDisplay: "+34 655 699 978",
  email: "", // pulled from store_settings when available
} as const;

// ─── SEO defaults ───
export const STORE_SEO = {
  defaultOgImage: "https://theremainder.lovable.app/pwa-512x512.png",
  locale: "es_ES",
} as const;

// ─── Promotion ───
export const PROMO_CONFIG = {
  /** Minimum subtotal (€) to unlock discount */
  thresholdAmount: 20,
  /** Discount percentage when unlocked */
  discountPercent: 10,
  /** Prefer filler products ≤ this price */
  fillerMaxPrice: 5,
  /** Prioritize sale / cheaper items */
  preferSaleItems: true,
  /** Max recommended filler products */
  maxRecommendations: 6,
} as const;

// ─── Currency ───
export const STORE_CURRENCY = {
  code: "EUR",
  locale: "es-ES",
  symbol: "€",
} as const;

// ─── Local storage keys ───
export const STORAGE_KEYS = {
  recentlyViewed: "frondaprima_recently_viewed",
  pendingReferral: "frondaprima_pending_referral",
  cookieConsent: "frondaprima_cookie_consent",
  cookiePreferences: "frondaprima_cookie_preferences",
} as const;
