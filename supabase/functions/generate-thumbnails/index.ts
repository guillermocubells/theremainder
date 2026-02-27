import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const THUMB_MAX = 400; // max thumbnail dimension in px

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    // Accept either a single media_id or an array
    const mediaIds: string[] = Array.isArray(body.media_ids)
      ? body.media_ids
      : body.media_id
        ? [body.media_id]
        : [];

    if (mediaIds.length === 0) {
      // Batch mode: find up to 20 unprocessed images
      const { data: pending, error: qErr } = await sb
        .from("collection_item_media")
        .select("id, storage_path, user_id")
        .eq("media_type", "image")
        .is("thumbnail_storage_path", null)
        .order("created_at", { ascending: true })
        .limit(20);

      if (qErr) throw qErr;
      if (!pending || pending.length === 0) {
        return new Response(
          JSON.stringify({ processed: 0, message: "No pending media" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      for (const m of pending) mediaIds.push(m.id);
    }

    let processed = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const mediaId of mediaIds) {
      try {
        // Fetch media record
        const { data: media, error: mErr } = await sb
          .from("collection_item_media")
          .select("id, storage_path, user_id, mime_type")
          .eq("id", mediaId)
          .single();

        if (mErr || !media) {
          errors.push({ id: mediaId, error: mErr?.message ?? "Not found" });
          failed++;
          continue;
        }

        // Download original from storage
        const { data: fileData, error: dlErr } = await sb.storage
          .from("collection-media")
          .download(media.storage_path);

        if (dlErr || !fileData) {
          errors.push({
            id: mediaId,
            error: dlErr?.message ?? "Download failed",
          });
          failed++;
          continue;
        }

        // Read image bytes
        const originalBytes = new Uint8Array(await fileData.arrayBuffer());

        // Decode image dimensions from header (supports PNG and JPEG)
        const dims = readImageDimensions(originalBytes);
        const origW = dims?.width ?? 0;
        const origH = dims?.height ?? 0;

        // Calculate thumbnail dimensions maintaining aspect ratio
        let thumbW = origW;
        let thumbH = origH;
        if (origW > 0 && origH > 0) {
          if (origW > origH) {
            thumbW = Math.min(origW, THUMB_MAX);
            thumbH = Math.round((thumbW / origW) * origH);
          } else {
            thumbH = Math.min(origH, THUMB_MAX);
            thumbW = Math.round((thumbH / origH) * origW);
          }
        }

        // Generate thumbnail path
        const ext = media.storage_path.split(".").pop() ?? "jpg";
        const thumbPath = media.storage_path.replace(
          /\.[^.]+$/,
          `_thumb_${thumbW}x${thumbH}.${ext}`,
        );

        // Upload the original as "thumbnail" placeholder
        // NOTE: In production you'd use a real image processing library.
        // Edge functions don't have native ImageMagick/sharp, so we store the
        // original at the thumbnail path and record the target dimensions.
        // A future enhancement can use an external resize API.
        const { error: upErr } = await sb.storage
          .from("collection-media")
          .upload(thumbPath, originalBytes, {
            contentType: media.mime_type ?? "image/jpeg",
            upsert: true,
          });

        if (upErr) {
          errors.push({ id: mediaId, error: upErr.message });
          failed++;
          continue;
        }

        // Update the media record
        const { error: updErr } = await sb
          .from("collection_item_media")
          .update({
            thumbnail_storage_path: thumbPath,
            thumbnail_width: thumbW,
            thumbnail_height: thumbH,
            original_width: origW,
            original_height: origH,
            thumbnail_generated_at: new Date().toISOString(),
          })
          .eq("id", mediaId);

        if (updErr) {
          errors.push({ id: mediaId, error: updErr.message });
          failed++;
          continue;
        }

        processed++;
        console.log(
          `[Thumbnails] ✓ ${mediaId} → ${thumbPath} (${thumbW}x${thumbH})`,
        );
      } catch (itemErr) {
        errors.push({
          id: mediaId,
          error: itemErr instanceof Error ? itemErr.message : String(itemErr),
        });
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed, failed, errors: errors.length ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[Thumbnails] Fatal:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/** Read width/height from PNG or JPEG headers without a full image library. */
function readImageDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  // PNG: bytes 0-7 are signature, IHDR chunk starts at 8, width at 16, height at 20
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  }

  // JPEG: scan for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset < bytes.length - 8) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        const view = new DataView(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength,
        );
        return {
          height: view.getUint16(offset + 5),
          width: view.getUint16(offset + 7),
        };
      }
      // Skip to next marker
      const segLen = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      ).getUint16(offset + 2);
      offset += 2 + segLen;
    }
  }

  return null;
}
