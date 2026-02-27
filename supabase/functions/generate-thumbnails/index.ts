import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { encode as encodeBlurhash } from "https://esm.sh/blurhash@2.0.5";
import { decode as decodeJpeg } from "https://esm.sh/jpeg-js@0.4.4";
import UPNG from "https://esm.sh/upng-js@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const THUMB_MAX = 400;
const BLURHASH_SAMPLE_MAX = 64; // tiny decode for blurhash computation
const BLURHASH_COMPONENTS_X = 4;
const BLURHASH_COMPONENTS_Y = 3;

// ── Types ──
interface MediaRecord {
  id: string;
  storage_path: string;
  user_id: string;
  mime_type: string | null;
  source_table: "collection_item_media" | "grow_entry_media";
}

interface ProcessResult {
  id: string;
  success: boolean;
  error?: string;
  blurhash?: string;
  thumb_path?: string;
}

// ── Image dimension reading (PNG/JPEG headers) ──
function readImageDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  // JPEG: scan for SOF0/SOF2
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset < bytes.length - 8) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      const segLen = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset + 2);
      offset += 2 + segLen;
    }
  }
  return null;
}

// ── Decode pixels from JPEG or PNG bytes ──
function decodePixels(
  bytes: Uint8Array,
  mime: string | null,
): { width: number; height: number; data: Uint8Array } | null {
  try {
    const isJpeg = mime?.includes("jpeg") || mime?.includes("jpg") ||
      (bytes[0] === 0xff && bytes[1] === 0xd8);

    if (isJpeg) {
      const raw = decodeJpeg(bytes, { useTArray: true, formatAsRGBA: true });
      return { width: raw.width, height: raw.height, data: raw.data as Uint8Array };
    }

    // PNG
    const img = UPNG.decode(bytes.buffer);
    const frames = UPNG.toRGBA8(img);
    if (frames.length === 0) return null;
    return { width: img.width, height: img.height, data: new Uint8Array(frames[0]) };
  } catch {
    return null;
  }
}

// ── Naive nearest-neighbor downsample for blurhash ──
function downsample(
  srcData: Uint8Array, srcW: number, srcH: number, dstW: number, dstH: number,
): Uint8Array {
  const out = new Uint8Array(dstW * dstH * 4);
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.floor((x / dstW) * srcW);
      const srcY = Math.floor((y / dstH) * srcH);
      const srcIdx = (srcY * srcW + srcX) * 4;
      const dstIdx = (y * dstW + x) * 4;
      out[dstIdx] = srcData[srcIdx];
      out[dstIdx + 1] = srcData[srcIdx + 1];
      out[dstIdx + 2] = srcData[srcIdx + 2];
      out[dstIdx + 3] = srcData[srcIdx + 3];
    }
  }
  return out;
}

// ── Compute blurhash from raw pixels ──
function computeBlurhash(pixels: {
  width: number; height: number; data: Uint8Array;
}): string | null {
  try {
    let { width, height, data } = pixels;
    // Downsample if too large
    if (width > BLURHASH_SAMPLE_MAX || height > BLURHASH_SAMPLE_MAX) {
      const scale = BLURHASH_SAMPLE_MAX / Math.max(width, height);
      const newW = Math.max(1, Math.round(width * scale));
      const newH = Math.max(1, Math.round(height * scale));
      data = downsample(data, width, height, newW, newH);
      width = newW;
      height = newH;
    }
    return encodeBlurhash(data, width, height, BLURHASH_COMPONENTS_X, BLURHASH_COMPONENTS_Y);
  } catch {
    return null;
  }
}

// ── Generate thumbnail via Supabase Storage transforms ──
async function generateThumbnailViaTransform(
  supabaseUrl: string,
  serviceRoleKey: string,
  bucket: string,
  storagePath: string,
  origW: number,
  origH: number,
): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  // Calculate target dimensions
  let thumbW = origW;
  let thumbH = origH;
  if (origW > origH) {
    thumbW = Math.min(origW, THUMB_MAX);
    thumbH = Math.round((thumbW / origW) * origH);
  } else {
    thumbH = Math.min(origH, THUMB_MAX);
    thumbW = Math.round((thumbH / origH) * origW);
  }

  // Use Supabase Storage render API for server-side resize
  const renderUrl = `${supabaseUrl}/storage/v1/render/image/public/${bucket}/${storagePath}?width=${thumbW}&quality=80&format=webp`;
  try {
    const resp = await fetch(renderUrl, {
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!resp.ok) {
      // Fallback: transforms may not be available, return null
      console.warn(`[Thumbnails] Transform API returned ${resp.status}, falling back to original`);
      return null;
    }
    const data = new Uint8Array(await resp.arrayBuffer());
    return { data, width: thumbW, height: thumbH };
  } catch (err) {
    console.warn(`[Thumbnails] Transform fetch failed:`, err);
    return null;
  }
}

// ── Process a single media record ──
async function processMedia(
  media: MediaRecord,
  sb: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<ProcessResult> {
  const bucket = media.source_table === "collection_item_media"
    ? "collection-media"
    : "grow-media";

  // 1. Download original
  const { data: fileData, error: dlErr } = await sb.storage
    .from(bucket)
    .download(media.storage_path);

  if (dlErr || !fileData) {
    return { id: media.id, success: false, error: dlErr?.message ?? "Download failed" };
  }

  const originalBytes = new Uint8Array(await fileData.arrayBuffer());
  const dims = readImageDimensions(originalBytes);
  const origW = dims?.width ?? 0;
  const origH = dims?.height ?? 0;

  if (origW === 0 || origH === 0) {
    return { id: media.id, success: false, error: "Could not read image dimensions" };
  }

  // 2. Compute blurhash from decoded pixels
  const pixels = decodePixels(originalBytes, media.mime_type);
  const blurhash = pixels ? computeBlurhash(pixels) : null;

  // 3. Generate thumbnail
  let thumbW: number;
  let thumbH: number;
  let thumbBytes: Uint8Array;
  let thumbExt: string;

  const transformed = await generateThumbnailViaTransform(
    supabaseUrl, serviceRoleKey, bucket, media.storage_path, origW, origH,
  );

  if (transformed) {
    thumbBytes = transformed.data;
    thumbW = transformed.width;
    thumbH = transformed.height;
    thumbExt = "webp";
  } else {
    // Fallback: store original at thumb path (same as before)
    thumbBytes = originalBytes;
    if (origW > origH) {
      thumbW = Math.min(origW, THUMB_MAX);
      thumbH = Math.round((thumbW / origW) * origH);
    } else {
      thumbH = Math.min(origH, THUMB_MAX);
      thumbW = Math.round((thumbH / origH) * origW);
    }
    thumbExt = media.storage_path.split(".").pop() ?? "jpg";
  }

  const thumbPath = media.storage_path.replace(
    /\.[^.]+$/,
    `_thumb_${thumbW}x${thumbH}.${thumbExt}`,
  );

  // 4. Upload thumbnail
  const { error: upErr } = await sb.storage
    .from(bucket)
    .upload(thumbPath, thumbBytes, {
      contentType: transformed ? "image/webp" : (media.mime_type ?? "image/jpeg"),
      upsert: true,
    });

  if (upErr) {
    return { id: media.id, success: false, error: upErr.message };
  }

  // 5. Update record
  const updateData: Record<string, unknown> = {
    thumbnail_storage_path: thumbPath,
    thumbnail_width: thumbW,
    thumbnail_height: thumbH,
    original_width: origW,
    original_height: origH,
    thumbnail_generated_at: new Date().toISOString(),
  };
  if (blurhash) updateData.blurhash = blurhash;

  // grow_entry_media uses width/height for original dimensions already;
  // update thumbnail fields
  const { error: updErr } = await sb
    .from(media.source_table)
    .update(updateData)
    .eq("id", media.id);

  if (updErr) {
    return { id: media.id, success: false, error: updErr.message };
  }

  console.log(
    `[Thumbnails] ✓ ${media.source_table}/${media.id} → ${thumbPath} (${thumbW}x${thumbH})` +
    (blurhash ? ` blurhash=${blurhash.slice(0, 12)}…` : " no-blurhash"),
  );

  return { id: media.id, success: true, blurhash: blurhash ?? undefined, thumb_path: thumbPath };
}

// ── Main ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));

    // Accept source_table to process a specific table
    const sourceTable: "collection_item_media" | "grow_entry_media" | "both" =
      body.source_table ?? "both";

    // Accept specific IDs
    const mediaIds: string[] = Array.isArray(body.media_ids)
      ? body.media_ids
      : body.media_id
        ? [body.media_id]
        : [];

    const records: MediaRecord[] = [];

    if (mediaIds.length > 0) {
      // Fetch specific records from both tables
      for (const table of (["collection_item_media", "grow_entry_media"] as const)) {
        if (sourceTable !== "both" && sourceTable !== table) continue;
        const { data } = await sb
          .from(table)
          .select("id, storage_path, user_id, mime_type")
          .in("id", mediaIds);
        if (data) {
          for (const m of data) {
            records.push({ ...m, source_table: table, mime_type: m.mime_type ?? null });
          }
        }
      }
    } else {
      // Batch mode: find unprocessed images (up to 20)
      const limit = Math.min(body.batch_size ?? 20, 50);

      if (sourceTable === "both" || sourceTable === "collection_item_media") {
        const { data } = await sb
          .from("collection_item_media")
          .select("id, storage_path, user_id, mime_type")
          .eq("media_type", "image")
          .is("thumbnail_storage_path", null)
          .order("created_at", { ascending: true })
          .limit(limit);
        if (data) {
          for (const m of data) {
            records.push({ ...m, source_table: "collection_item_media", mime_type: m.mime_type ?? null });
          }
        }
      }

      if (sourceTable === "both" || sourceTable === "grow_entry_media") {
        const { data } = await sb
          .from("grow_entry_media")
          .select("id, storage_path, user_id, mime_type")
          .is("thumbnail_storage_path", null)
          .order("created_at", { ascending: true })
          .limit(limit);
        if (data) {
          for (const m of data) {
            records.push({ ...m, source_table: "grow_entry_media", mime_type: m.mime_type ?? null });
          }
        }
      }
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending media" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Process all records
    const results: ProcessResult[] = [];
    for (const media of records) {
      const result = await processMedia(media, sb, supabaseUrl, serviceRoleKey);
      results.push(result);
    }

    const processed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const errors = results.filter((r) => !r.success).map((r) => ({ id: r.id, error: r.error }));

    return new Response(
      JSON.stringify({
        processed,
        failed,
        blurhash_count: results.filter((r) => r.blurhash).length,
        errors: errors.length ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[Thumbnails] Fatal:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
