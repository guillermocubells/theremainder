/**
 * Image optimization utilities for responsive images with format negotiation.
 *
 * Supabase Storage supports on-the-fly transforms via the render endpoint:
 *   /storage/v1/render/image/public/{bucket}/{path}?width=W&format=webp
 *
 * For non-Supabase URLs we just return the original.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

// Common breakpoint widths for srcset
const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536] as const;
const THUMB_WIDTHS = [80, 160, 240] as const;

type ImageFormat = "webp" | "avif" | "origin";

// ── Helpers ─────────────────────────────────────────────────────────────────

function isSupabaseStorageUrl(src: string): boolean {
  if (!SUPABASE_URL) return false;
  return src.startsWith(SUPABASE_URL) && src.includes("/storage/v1/object/public/");
}

/**
 * Convert a Supabase Storage object URL to a render (transform) URL with
 * the specified width and format.
 */
function toRenderUrl(src: string, width: number, format: ImageFormat): string {
  if (!isSupabaseStorageUrl(src)) return src;

  // Replace /object/public/ with /render/image/public/
  const renderSrc = src.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );

  const url = new URL(renderSrc);
  url.searchParams.set("width", String(width));
  if (format !== "origin") {
    url.searchParams.set("format", format);
  }
  url.searchParams.set("quality", "80");
  return url.toString();
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface SrcSetEntry {
  url: string;
  width: number;
}

export interface ResponsiveImageSources {
  /** AVIF source set (best compression) */
  avif: SrcSetEntry[];
  /** WebP source set (broad support) */
  webp: SrcSetEntry[];
  /** Original format fallback */
  fallback: SrcSetEntry[];
  /** Single optimised src for the <img> tag */
  src: string;
}

/**
 * Generate responsive image sources for a given image URL.
 *
 * @param src        Original image URL
 * @param widths     Array of pixel widths for srcset
 * @param maxWidth   Cap the maximum width generated
 */
export function getResponsiveSources(
  src: string | undefined,
  widths: readonly number[] = DEFAULT_WIDTHS,
  maxWidth = 1536
): ResponsiveImageSources | null {
  if (!src) return null;

  if (!isSupabaseStorageUrl(src)) {
    // Non-Supabase images — return original only
    return {
      avif: [],
      webp: [],
      fallback: [{ url: src, width: maxWidth }],
      src,
    };
  }

  const cappedWidths = widths.filter((w) => w <= maxWidth);

  const makeSrcSet = (format: ImageFormat): SrcSetEntry[] =>
    cappedWidths.map((w) => ({ url: toRenderUrl(src, w, format), width: w }));

  return {
    avif: makeSrcSet("avif"),
    webp: makeSrcSet("webp"),
    fallback: makeSrcSet("origin"),
    src: toRenderUrl(src, Math.min(640, maxWidth), "webp"),
  };
}

/**
 * Generate thumbnail-optimised sources (small widths).
 */
export function getThumbSources(src: string | undefined) {
  return getResponsiveSources(src, THUMB_WIDTHS, 240);
}

/**
 * Build a srcset string from entries.
 */
export function buildSrcSet(entries: SrcSetEntry[]): string {
  return entries.map((e) => `${e.url} ${e.width}w`).join(", ");
}
