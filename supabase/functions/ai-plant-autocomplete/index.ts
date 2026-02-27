import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- helpers ----------

function hashQuery(text: string, imageUrls: string[]): string {
  const raw = `${text.trim().toLowerCase()}|${imageUrls.sort().join(",")}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return `qh_${Math.abs(h).toString(36)}`;
}

const PLANT_TYPES_MAP: Record<string, string> = {
  palmera: "palm", palma: "palm", palm: "palm",
  helecho: "fern", "tree fern": "fern", "helecho arbóreo": "fern",
  cícada: "cycad", cycad: "cycad", cicada: "cycad",
  árbol: "tree", tree: "tree",
  arbusto: "shrub", shrub: "shrub",
  suculenta: "succulent", succulent: "succulent",
  hierba: "grass", grass: "grass",
  bambú: "bamboo", bamboo: "bamboo",
  bromeliácea: "bromeliad", bromeliad: "bromeliad",
  heliconia: "heliconia",
  estrelicia: "strelitzia", strelitzia: "strelitzia",
  jengibre: "ginger", ginger: "ginger",
  plátano: "banana", banana: "banana",
  agave: "agave", yuca: "agave",
  arácea: "aroid", aroid: "aroid",
  cactus: "cactus",
  conífera: "conifer", conifer: "conifer",
  perenne: "perennial", perennial: "perennial",
  trepadora: "other", vine: "other", climber: "other",
};

function mapPlantType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return PLANT_TYPES_MAP[lower] || "other";
}

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "fill_plant_data",
    description: "Return structured plant data to fill a product form for a plant nursery e-commerce.",
    parameters: {
      type: "object",
      properties: {
        scientific_name: { type: "string", description: "Canonical binomial, e.g. Chambeyronia macrocarpa" },
        common_name: { type: "string", description: "Nombre común en español, o en inglés si no hay" },
        family: { type: "string", description: "Familia botánica, e.g. Arecaceae" },
        confidence: { type: "number", description: "Overall identification confidence 0-1" },
        plant_type: { type: "string", description: "Type: palmera, helecho, cícada, árbol, arbusto, suculenta, cactus, bromeliácea, arácea, conífera, perenne, trepadora, bambú, hierba, heliconia, estrelicia, jengibre, plátano, agave, otro" },
        short_description: { type: "string", description: "1-2 frases para e-commerce en español" },
        description: { type: "string", description: "120-250 palabras: descripción + cuidados + clima, en español" },
        water: { type: "string", enum: ["low", "medium", "high"] },
        humidity: { type: "string", enum: ["low", "medium", "high"] },
        rarity: { type: "string", enum: ["common", "uncommon", "rare", "very_rare", "extremely_rare"] },
        difficulty: { type: "string", enum: ["easy", "intermediate", "advanced"] },
        min_temp_c: { type: ["number", "null"], description: "Minimum temperature in °C, null if unknown" },
        exposure: { type: "array", items: { type: "string", enum: ["sol", "semisol", "semisombra", "sombra"] } },
        plant_use: { type: "array", items: { type: "string", enum: ["interior", "exterior", "jardin", "maceta", "seto", "cobertura"] } },
        climate_zones: { type: "array", items: { type: "string", enum: ["tropical", "subtropical", "mediterráneo", "templado", "continental", "oceánico", "árido", "semiárido"] } },
        hardiness_zones: { type: "array", items: { type: "string" }, description: "USDA zones like ['9a','10b'], empty if unknown" },
        growth_rate: { type: "string", enum: ["slow", "moderate", "fast"] },
        mature_height: { type: "string", description: "Range in meters like '2-3 m'" },
        mature_width: { type: "string", description: "Range in meters" },
        variety: { type: "string", description: "Cultivar or variety if applicable, else empty" },
        origin_country_iso: { type: "string", description: "ISO 3166-1 alpha-2 country code of native origin, e.g. MG for Madagascar" },
        origin_region: { type: "string", description: "Specific region or island" },
        native_habitat: { type: "string", description: "1-3 frases describiendo el hábitat natural en español" },
        container_size: { type: "string", description: "Suggested container size if typically sold in pots, else empty" },
        meta_title: { type: "string", description: "SEO title <=60 chars: '{scientific_name} | {category}'" },
        meta_description: { type: "string", description: "SEO description <=160 chars, e-commerce oriented in Spanish" },
        image_alt_text: { type: "string", description: "Alt text like '{scientific_name} planta'" },
        reference_url: { type: "string", description: "GBIF/POWO/reliable reference URL if known" },
        notes: { type: "string", description: "Brief technical notes + confidence for internal use" },
        price_suggestion: { type: "string", description: "Optional price suggestion or range like '€35-80 (rara, palmera tropical)'. Empty if unsure." },
        confidence_by_field: {
          type: "object",
          additionalProperties: { type: "number" },
          description: "Confidence 0-1 for key fields: scientific_name, family, min_temp_c, hardiness_zones, rarity, etc."
        },
        warnings: { type: "array", items: { type: "string" }, description: "List of warnings or caveats" },
      },
      required: ["scientific_name", "common_name", "family", "confidence", "plant_type", "short_description", "description", "water", "humidity", "difficulty", "exposure", "plant_use", "climate_zones", "growth_rate", "native_habitat", "meta_title", "meta_description", "image_alt_text", "confidence_by_field", "warnings"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are a botanical expert assistant for a rare plant e-commerce nursery called "The Remainder" based in Spain. Your task is to identify a plant species from the given inputs (name and/or images) and fill in ALL product form fields.

RULES:
- Always respond in Spanish for text fields (descriptions, habitat, notes).
- If you're uncertain about a field (confidence < 0.5), leave it empty/null rather than guessing.
- For temperature, USDA zones, and sizes: only fill if confident (>0.7).
- For rarity: consider commercial availability, not just biological rarity. Most palms and cycads sold by specialists are at least "rare".
- For descriptions: write engaging, informative e-commerce copy. Mention care requirements and climate suitability.
- For SEO: meta_title max 60 chars, meta_description max 160 chars.
- Return the GBIF species page URL as reference_url when possible: https://www.gbif.org/species/{taxonKey}
- price_suggestion: provide a range ONLY for rare/collectors plants where market data is somewhat known. Otherwise leave empty.
- If images are provided, use them to refine identification. Describe what you see to confirm the species.
- confidence_by_field must include at least: scientific_name, family, min_temp_c, hardiness_zones, rarity, growth_rate.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - require admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Check admin role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleRow } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const textQuery: string = body.textQuery || "";
    const imageUrls: string[] = body.imageUrls || [];

    if (!textQuery && imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "Provide textQuery and/or imageUrls" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache
    const qHash = hashQuery(textQuery, imageUrls);
    const { data: cached } = await serviceClient
      .from("plant_ai_cache")
      .select("payload_json, scientific_name, source")
      .eq("query_hash", qHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log(`Cache hit for ${qHash}`);
      return new Response(JSON.stringify(cached.payload_json), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build messages for AI
    const userContent: any[] = [];

    if (textQuery) {
      userContent.push({
        type: "text",
        text: `Identify this plant and fill ALL form fields.\n\nPlant query: "${textQuery}"`,
      });
    } else {
      userContent.push({
        type: "text",
        text: "Identify this plant from the images and fill ALL form fields.",
      });
    }

    // Add images if provided
    for (const url of imageUrls.slice(0, 3)) {
      userContent.push({
        type: "image_url",
        image_url: { url },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use vision-capable model
    const model = imageUrls.length > 0
      ? "google/gemini-2.5-flash"  // good multimodal + fast
      : "google/gemini-3-flash-preview";  // fast text-only

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "fill_plant_data" } },
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de peticiones excedido. Inténtalo en unos minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Añade créditos en tu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Error en el servicio de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "La IA no pudo identificar la planta. Prueba con más información." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let plantData: any;
    try {
      plantData = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "Error procesando la respuesta de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map plant_type to our enum
    plantData.plant_type = mapPlantType(plantData.plant_type || "otro");

    // Build the result object
    const result = {
      data: {
        name: plantData.scientific_name || textQuery,
        scientific_name: plantData.scientific_name || "",
        common_name: plantData.common_name || "",
        slug: (plantData.scientific_name || textQuery || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        short_description: plantData.short_description || "",
        description: plantData.description || "",
        plant_type: plantData.plant_type,
        water: plantData.water || "",
        humidity: plantData.humidity || "",
        rarity: plantData.rarity || "",
        difficulty: plantData.difficulty || "",
        min_temp_c: plantData.min_temp_c != null ? String(plantData.min_temp_c) : "",
        exposure: plantData.exposure || [],
        plant_use: plantData.plant_use || [],
        climate_zones: plantData.climate_zones || [],
        hardiness_zones: plantData.hardiness_zones || [],
        growth_rate: plantData.growth_rate || "",
        mature_height: plantData.mature_height || "",
        mature_width: plantData.mature_width || "",
        family: plantData.family || "",
        variety: plantData.variety || "",
        origin_country: (plantData.origin_country_iso || "").toUpperCase(),
        origin_region: plantData.origin_region || "",
        native_habitat: plantData.native_habitat || "",
        container_size: plantData.container_size || "",
        meta_title: (plantData.meta_title || "").slice(0, 60),
        meta_description: (plantData.meta_description || "").slice(0, 160),
        image_alt_text: plantData.image_alt_text || "",
        reference_url: plantData.reference_url || "",
        notes: plantData.notes || "",
      },
      confidence: plantData.confidence || 0,
      confidenceByField: plantData.confidence_by_field || {},
      priceSuggestion: plantData.price_suggestion || "",
      warnings: plantData.warnings || [],
      source: model.includes("gemini") ? "gemini" : "gpt",
    };

    // Cache result
    await serviceClient.from("plant_ai_cache").upsert({
      query_hash: qHash,
      scientific_name: plantData.scientific_name || null,
      payload_json: result,
      source: result.source,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-plant-autocomplete error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
