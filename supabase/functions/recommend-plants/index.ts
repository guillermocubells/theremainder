import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PlantRecommendation {
  plant_id: string;
  name: string;
  scientific_name: string | null;
  score: number;
  reasons: string[];
  trade_offs: string[];
  thumbnail_url: string | null;
  price: number;
}

interface RecommendationResponse {
  success: boolean;
  recommendations: PlantRecommendation[];
  summary: string;
  filters_applied: Record<string, unknown>;
  total_candidates: number;
  no_good_fit: boolean;
  no_good_fit_reason?: string;
}

interface UserQuery {
  // Natural language query
  query?: string;
  // Structured filters
  filters?: {
    exposure?: string[];
    water?: string;
    humidity?: string;
    climate_zones?: string[];
    min_temp_c?: number;
    plant_type?: string[];
    difficulty?: string;
    growth_rate?: string;
    plant_use?: string[];
    rarity?: string;
    price_max?: number;
    is_in_stock?: boolean;
  };
  // Limit results
  limit?: number;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in a real plant e-commerce catalog.

STRICT RULES:
- You do NOT invent plant attributes
- You do NOT modify plant data
- You do NOT recommend plants outside the provided catalog
- All plants have validated botanical attributes - you reason over them
- If no plant is a good fit, say so clearly
- NEVER hallucinate species or properties

Your role:
1. Interpret user intent from their query
2. Weigh existing attributes realistically against user needs
3. Rank plants by suitability (0-100 score)
4. Explain trade-offs honestly

Attribute meanings:
- exposure: ["sun", "semi-shade", "shade"] - light requirements
- water: "low" | "medium" | "high" - watering frequency
- humidity: "low" | "medium" | "high" - ambient humidity needs
- climate_zones: USDA hardiness zones (e.g., "8A", "9B")
- min_temp_c: minimum temperature the plant tolerates in Celsius
- plant_type: "palm" | "fern" | "tree" | "cycad" | "shrub" | "other"
- difficulty: "easy" | "intermediate" | "advanced"
- growth_rate: "slow" | "medium" | "fast"
- plant_use: ["interior", "exterior"] - where it can be placed
- rarity: "low" | "medium" | "high"

RESPONSE FORMAT (strict JSON):
{
  "recommendations": [
    {
      "plant_id": "uuid",
      "score": 85,
      "reasons": ["Tolerates shade well", "Low water needs match your preference"],
      "trade_offs": ["Slow growth rate may require patience"]
    }
  ],
  "summary": "Brief explanation of the ranking logic",
  "no_good_fit": false,
  "no_good_fit_reason": null
}

If no plants match well (all scores < 50), set no_good_fit: true and explain why.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: UserQuery = await req.json();
    const { query, filters, limit = 5 } = body;

    console.log("[recommend-plants] Received request:", { query, filters, limit });

    // Fetch real catalog data from database
    let dbQuery = supabase
      .from("plants")
      .select(`
        id,
        name,
        common_name,
        scientific_name,
        plant_type,
        exposure,
        growth_rate,
        climate_zones,
        min_temp_c,
        water,
        humidity,
        plant_use,
        rarity,
        difficulty,
        is_in_stock,
        stock_qty,
        price,
        thumbnail_url,
        notes,
        description
      `)
      .eq("is_active", true);

    // Apply stock filter (default: only in-stock)
    if (filters?.is_in_stock !== false) {
      dbQuery = dbQuery.eq("is_in_stock", true);
    }

    const { data: plants, error: dbError } = await dbQuery;

    if (dbError) {
      console.error("[recommend-plants] Database error:", dbError);
      throw new Error("Failed to fetch catalog");
    }

    if (!plants || plants.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          recommendations: [],
          summary: "No hay plantas disponibles en el catálogo actualmente.",
          filters_applied: filters || {},
          total_candidates: 0,
          no_good_fit: true,
          no_good_fit_reason: "El catálogo está vacío o todas las plantas están fuera de stock.",
        } as RecommendationResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[recommend-plants] Found ${plants.length} active plants in catalog`);

    // Build the AI prompt with real catalog data
    const catalogContext = plants.map(p => ({
      id: p.id,
      name: p.name,
      scientific_name: p.scientific_name,
      plant_type: p.plant_type,
      exposure: p.exposure,
      growth_rate: p.growth_rate,
      climate_zones: p.climate_zones,
      min_temp_c: p.min_temp_c,
      water: p.water,
      humidity: p.humidity,
      plant_use: p.plant_use,
      rarity: p.rarity,
      difficulty: p.difficulty,
      is_in_stock: p.is_in_stock,
      price: p.price,
    }));

    const userMessage = buildUserMessage(query, filters, catalogContext);

    // Call Lovable AI API
    const aiResponse = await fetch("https://ai.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[recommend-plants] AI API error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No response from AI");
    }

    console.log("[recommend-plants] AI response received");

    // Parse AI response
    let aiResult;
    try {
      aiResult = JSON.parse(aiContent);
    } catch (parseError) {
      console.error("[recommend-plants] Failed to parse AI response:", aiContent);
      throw new Error("Invalid AI response format");
    }

    // Enrich recommendations with full plant data
    const enrichedRecommendations: PlantRecommendation[] = [];
    
    for (const rec of aiResult.recommendations || []) {
      const plant = plants.find(p => p.id === rec.plant_id);
      if (plant && enrichedRecommendations.length < limit) {
        enrichedRecommendations.push({
          plant_id: plant.id,
          name: plant.name,
          scientific_name: plant.scientific_name,
          score: rec.score,
          reasons: rec.reasons || [],
          trade_offs: rec.trade_offs || [],
          thumbnail_url: plant.thumbnail_url,
          price: plant.price,
        });
      }
    }

    // Sort by score descending
    enrichedRecommendations.sort((a, b) => b.score - a.score);

    const response: RecommendationResponse = {
      success: true,
      recommendations: enrichedRecommendations,
      summary: aiResult.summary || "Recomendaciones basadas en tus preferencias.",
      filters_applied: filters || {},
      total_candidates: plants.length,
      no_good_fit: aiResult.no_good_fit || false,
      no_good_fit_reason: aiResult.no_good_fit_reason,
    };

    console.log(`[recommend-plants] Returning ${enrichedRecommendations.length} recommendations`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[recommend-plants] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        recommendations: [],
        summary: "Error al procesar la solicitud",
        filters_applied: {},
        total_candidates: 0,
        no_good_fit: true,
        no_good_fit_reason: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function buildUserMessage(
  query: string | undefined,
  filters: UserQuery["filters"],
  catalog: Record<string, unknown>[]
): string {
  let message = "";

  if (query) {
    message += `USER QUERY: "${query}"\n\n`;
  }

  if (filters && Object.keys(filters).length > 0) {
    message += `USER PREFERENCES:\n`;
    if (filters.exposure?.length) message += `- Light: ${filters.exposure.join(", ")}\n`;
    if (filters.water) message += `- Watering: ${filters.water}\n`;
    if (filters.humidity) message += `- Humidity: ${filters.humidity}\n`;
    if (filters.climate_zones?.length) message += `- Climate zones: ${filters.climate_zones.join(", ")}\n`;
    if (filters.min_temp_c !== undefined) message += `- Min temperature: ${filters.min_temp_c}°C\n`;
    if (filters.plant_type?.length) message += `- Plant types: ${filters.plant_type.join(", ")}\n`;
    if (filters.difficulty) message += `- Difficulty level: ${filters.difficulty}\n`;
    if (filters.growth_rate) message += `- Growth rate: ${filters.growth_rate}\n`;
    if (filters.plant_use?.length) message += `- Use: ${filters.plant_use.join(", ")}\n`;
    if (filters.rarity) message += `- Rarity: ${filters.rarity}\n`;
    if (filters.price_max) message += `- Max price: ${filters.price_max}€\n`;
    message += "\n";
  }

  message += `CATALOG (${catalog.length} plants):\n`;
  message += JSON.stringify(catalog, null, 2);

  message += `\n\nAnalyze the catalog and rank the TOP 5 most suitable plants based on the user's query and preferences. Return STRICT JSON only.`;

  return message;
}
