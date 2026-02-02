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
  rank: number;
  score: number;
  fit_reasons: string[];
  compromises: string[];
  thumbnail_url: string | null;
  price: number;
}

interface RecommendationResponse {
  success: boolean;
  recommendations: PlantRecommendation[];
  ranking_logic: string;
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

const SYSTEM_PROMPT = `You are an AI horticultural advisor embedded in a real plant e-commerce catalog.

STRICT RULES:
- You do NOT invent plant attributes
- You do NOT modify plant data
- You do NOT recommend plants outside the provided catalog
- All plants have validated botanical attributes - you reason over them
- If no plant is a good fit, say so clearly
- NEVER hallucinate species or properties

ATTRIBUTE REFERENCE:
- exposure: ["sun", "semi-shade", "shade"] - light requirements
- water: "low" | "medium" | "high" - watering frequency needs
- humidity: "low" | "medium" | "high" - ambient humidity preference
- climate_zones: USDA hardiness zones (e.g., "8A", "9B", "10A")
- min_temp_c: minimum temperature tolerance in Celsius
- plant_type: "palm" | "fern" | "tree" | "cycad" | "shrub" | "other"
- difficulty: "easy" | "intermediate" | "advanced" - care complexity
- growth_rate: "slow" | "medium" | "fast"
- plant_use: ["interior", "exterior"] - suitable placement
- rarity: "low" | "medium" | "high" - availability/uniqueness

YOUR TASK:
1. Rank items from BEST to WEAKEST match based on user intent and filters
2. Select UP TO 3 items maximum
3. For each item explain:
   - fit_reasons: Why it matches the user's intent (use realistic horticultural reasoning)
   - compromises: What trade-offs or limitations exist
4. If none are a strong match (all scores < 50), state it clearly with no_good_fit: true
5. Use realistic horticultural reasoning - consider climate compatibility, care requirements, and practical growing conditions

RESPONSE FORMAT (STRICT JSON only):
{
  "recommendations": [
    {
      "plant_id": "uuid",
      "rank": 1,
      "score": 85,
      "fit_reasons": ["Tolerates shade conditions matching interior placement", "Low water needs ideal for beginners"],
      "compromises": ["Slow growth rate requires patience", "May need supplemental humidity in dry climates"]
    }
  ],
  "ranking_logic": "Brief explanation of the ranking criteria used",
  "no_good_fit": false,
  "no_good_fit_reason": null
}

If no plants match well (all scores < 50), set no_good_fit: true and explain why in no_good_fit_reason.`;

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
          ranking_logic: "No hay plantas disponibles en el catálogo actualmente.",
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
          rank: rec.rank || enrichedRecommendations.length + 1,
          score: rec.score,
          fit_reasons: rec.fit_reasons || [],
          compromises: rec.compromises || [],
          thumbnail_url: plant.thumbnail_url,
          price: plant.price,
        });
      }
    }

    // Sort by rank ascending (best first)
    enrichedRecommendations.sort((a, b) => a.rank - b.rank);

    const response: RecommendationResponse = {
      success: true,
      recommendations: enrichedRecommendations,
      ranking_logic: aiResult.ranking_logic || "Recomendaciones basadas en tus preferencias.",
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
  const sections: string[] = [];

  // Section 1: User Intent
  if (query) {
    sections.push(`USER INTENT:\n"${query}"`);
  }

  // Section 2: Filters Already Applied
  const appliedFilters: string[] = [];
  if (filters) {
    if (filters.exposure?.length) appliedFilters.push(`- Exposure: ${filters.exposure.join(", ")}`);
    if (filters.growth_rate) appliedFilters.push(`- Growth rate: ${filters.growth_rate}`);
    if (filters.climate_zones?.length) appliedFilters.push(`- Climate zone: ${filters.climate_zones.join(", ")}`);
    if (filters.plant_use?.length) appliedFilters.push(`- Intended use: ${filters.plant_use.join(", ")}`);
    if (filters.water) appliedFilters.push(`- Water needs: ${filters.water}`);
    if (filters.humidity) appliedFilters.push(`- Humidity: ${filters.humidity}`);
    if (filters.min_temp_c !== undefined) appliedFilters.push(`- Minimum temperature: ${filters.min_temp_c}°C`);
    if (filters.plant_type?.length) appliedFilters.push(`- Plant type: ${filters.plant_type.join(", ")}`);
    if (filters.difficulty) appliedFilters.push(`- Difficulty: ${filters.difficulty}`);
    if (filters.rarity) appliedFilters.push(`- Rarity: ${filters.rarity}`);
    if (filters.price_max) appliedFilters.push(`- Max price: ${filters.price_max}€`);
  }
  
  if (appliedFilters.length > 0) {
    sections.push(`USER FILTERS ALREADY APPLIED:\n${appliedFilters.join("\n")}`);
  }

  // Section 3: Available Catalog
  sections.push(`AVAILABLE CATALOG ITEMS (${catalog.length} plants):\n${JSON.stringify(catalog, null, 2)}`);

  // Section 4: Task Instructions
  sections.push(`TASK:
1. Rank the items from best to weakest match
2. Select up to 3 items maximum
3. For each item, explain:
   - Why it fits the intent (fit_reasons)
   - What compromises exist (compromises)
4. If none are a strong match, state it clearly
5. Use realistic horticultural reasoning

Return STRICT JSON only.`);

  return sections.join("\n\n---\n\n");
}
