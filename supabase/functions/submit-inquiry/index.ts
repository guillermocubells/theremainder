import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse, PRESETS } from "../_shared/rate-limit.ts";
import { validate, schemas } from "../_shared/validation.ts";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError } from "../_shared/errors.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function sanitizeText(text: string): string {
  const normalized = text.normalize('NFC');
  return normalized
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{Emoji}]/gu, '')
    .trim();
}

function hashIdentifier(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'v_' + Math.abs(hash).toString(36);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { log, requestId } = createLogger("submit-inquiry", req);
  const rh = withCorrelationId(corsHeaders, requestId);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();

    const v = validate(schemas.submitInquiry, body, rh);
    if (v.error) return v.error;

    const { owned_plant_id, shared_list_id, message, viewer_email, offer_type } = v.data;

    const sanitizedMessage = sanitizeText(message);
    if (!sanitizedMessage) {
      throw new AppError("Message is empty after sanitization", 422, "EMPTY_MESSAGE");
    }

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const viewerIdentifier = hashIdentifier((viewer_email || '') + clientIP);

    const rl = checkRateLimit(req, PRESETS.form_submit);
    if (!rl.allowed) {
      return rateLimitResponse(rl.headers, corsHeaders);
    }

    log.info("Inquiry submitted", { owned_plant_id, offer_type, viewer: viewerIdentifier });

    const { data: plant, error: plantError } = await supabase
      .from('owned_plants')
      .select('id, visibility_in_shared_lists, allow_inquiries, inquiry_handling_mode, user_id')
      .eq('id', owned_plant_id)
      .single();

    if (plantError || !plant) {
      throw new AppError("Planta no encontrada", 404, "PLANT_NOT_FOUND");
    }

    const owner_user_id = plant.user_id;

    const { data: blocks } = await supabase
      .from('garden_viewer_blocks')
      .select('id')
      .eq('owner_user_id', owner_user_id)
      .eq('viewer_identifier', viewerIdentifier)
      .limit(1);

    if (blocks && blocks.length > 0) {
      throw new AppError("No se pudo enviar la consulta", 400, "INQUIRY_BLOCKED");
    }

    if (plant.visibility_in_shared_lists !== 'visible') {
      throw new AppError("No se pudo enviar la consulta", 400, "PLANT_NOT_VISIBLE");
    }

    if (!plant.allow_inquiries || plant.inquiry_handling_mode === 'blocked') {
      throw new AppError("No se pudo enviar la consulta", 400, "INQUIRIES_DISABLED");
    }

    if (shared_list_id) {
      const { data: sharedList } = await supabase
        .from('shared_search_lists')
        .select('global_inquiries_mode')
        .eq('id', shared_list_id)
        .single();

      if (sharedList?.global_inquiries_mode === 'disabled') {
        throw new AppError("No se pudo enviar la consulta", 400, "LIST_INQUIRIES_DISABLED");
      }
    }

    const { data: inquiry, error: insertError } = await supabase
      .from('garden_inquiries')
      .insert({
        shared_list_id: shared_list_id || null,
        owned_plant_id,
        owner_user_id,
        viewer_identifier: viewerIdentifier,
        viewer_email: viewer_email || null,
        message: sanitizedMessage,
        offer_type: offer_type || 'question',
        status: 'new',
      })
      .select()
      .single();

    if (insertError) {
      log.error("Insert inquiry failed", { error: insertError.message });
      throw new AppError("Error al enviar la consulta", 500, "INSERT_FAILED");
    }

    log.info("Inquiry created", { inquiry_id: inquiry.id, plant_id: owned_plant_id });

    return new Response(
      JSON.stringify({ success: true, id: inquiry.id }),
      { status: 200, headers: { ...rh, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return handleError(err, { ...corsHeaders, 'Content-Type': 'application/json' }, requestId, log);
  }
});
