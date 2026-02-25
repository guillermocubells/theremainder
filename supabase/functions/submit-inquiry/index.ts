import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse, PRESETS } from "../_shared/rate-limit.ts";
import { validate, schemas } from "../_shared/validation.ts";

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
  // Simple hash for viewer identification (not cryptographic)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'v_' + Math.abs(hash).toString(36);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();

    // ── Schema validation ──
    const v = validate(schemas.submitInquiry, body, corsHeaders);
    if (v.error) return v.error;

    const { owned_plant_id, shared_list_id, message, viewer_email, offer_type } = v.data;

    const sanitizedMessage = sanitizeText(message);
    if (!sanitizedMessage) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', issues: [{ path: 'message', message: 'Message is empty after sanitization', code: 'custom' }] }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build viewer identifier from IP + email
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const viewerIdentifier = hashIdentifier((viewer_email || '') + clientIP);

    // Rate limit check
    const rl = checkRateLimit(req, PRESETS.form_submit);
    if (!rl.allowed) {
      return rateLimitResponse(rl.headers, corsHeaders);
    }

    // Verify plant exists and get owner from the database (don't trust client-supplied owner_user_id)
    const { data: plant, error: plantError } = await supabase
      .from('owned_plants')
      .select('id, visibility_in_shared_lists, allow_inquiries, inquiry_handling_mode, user_id')
      .eq('id', owned_plant_id)
      .single();

    if (plantError || !plant) {
      return new Response(
        JSON.stringify({ error: 'Planta no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Derive owner_user_id from plant record (server-side, not from client)
    const owner_user_id = plant.user_id;

    // Check if viewer is blocked
    const { data: blocks } = await supabase
      .from('garden_viewer_blocks')
      .select('id')
      .eq('owner_user_id', owner_user_id)
      .eq('viewer_identifier', viewerIdentifier)
      .limit(1);

    if (blocks && blocks.length > 0) {
      // Don't reveal block status — show generic error
      return new Response(
        JSON.stringify({ error: 'No se pudo enviar la consulta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (plant.visibility_in_shared_lists !== 'visible') {
      return new Response(
        JSON.stringify({ error: 'No se pudo enviar la consulta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!plant.allow_inquiries || plant.inquiry_handling_mode === 'blocked') {
      return new Response(
        JSON.stringify({ error: 'No se pudo enviar la consulta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check global inquiries mode on shared list
    if (shared_list_id) {
      const { data: sharedList } = await supabase
        .from('shared_search_lists')
        .select('global_inquiries_mode')
        .eq('id', shared_list_id)
        .single();

      if (sharedList?.global_inquiries_mode === 'disabled') {
        return new Response(
          JSON.stringify({ error: 'No se pudo enviar la consulta' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert inquiry
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
      console.error('Error inserting inquiry:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error al enviar la consulta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Inquiry ${inquiry.id} created for plant ${owned_plant_id} from ${viewerIdentifier}`);

    return new Response(
      JSON.stringify({ success: true, id: inquiry.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Submit inquiry error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
