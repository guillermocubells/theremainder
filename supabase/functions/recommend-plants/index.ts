import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============ INPUT TYPES ============
interface RecommendInput {
  user_prompt?: string;
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
  catalog_subset?: CatalogPlant[];
}

interface CatalogPlant {
  id: string;
  name: string;
  scientific_name?: string | null;
  plant_type?: string | null;
  exposure?: string[] | null;
  growth_rate?: string | null;
  climate_zones?: string[] | null;
  min_temp_c?: number | null;
  water?: string | null;
  humidity?: string | null;
  plant_use?: string[] | null;
  rarity?: string | null;
  difficulty?: string | null;
  is_in_stock?: boolean | null;
  price?: number;
  thumbnail_url?: string | null;
}

// ============ VIABILITY TYPES ============
interface ViabilityFactors {
  globalViability: number;
  coldResistance: number;
  humidityTolerance: number;
  clayAdaptation: number;
  sunExposure: number;
  pestResistance: number;
}

interface ViabilityResult {
  totalScore: number;
  factors: ViabilityFactors;
  recommendation: string;
}

// ============ OUTPUT TYPES ============
interface RecommendOutput {
  recommendations: PlantRecommendation[];
  confidence: "low" | "medium" | "high";
  no_good_match: boolean;
}

interface PlantRecommendation {
  plant_id: string;
  fit_score: number;
  reasoning: string;
  tradeoffs: string;
  viability: ViabilityResult;
}

// ============ VIABILITY CALCULATOR ============
function calculateViability(plant: CatalogPlant, userPrompt?: string): ViabilityResult {
  const lowerPrompt = (userPrompt || '').toLowerCase();
  
  // Analyze location from prompt for climate context
  let locationClimate = { coldTolerance: 7, humidity: 5, sunIntensity: 8, region: 'mediterraneo' };
  
  // Spanish locations
  if (lowerPrompt.includes('cantabria') || lowerPrompt.includes('santander') || lowerPrompt.includes('asturias')) {
    locationClimate = { coldTolerance: 5, humidity: 9, sunIntensity: 5, region: 'atlantico_humedo' };
  } else if (lowerPrompt.includes('galicia') || lowerPrompt.includes('coruña')) {
    locationClimate = { coldTolerance: 5, humidity: 8, sunIntensity: 5, region: 'atlantico_humedo' };
  } else if (lowerPrompt.includes('madrid')) {
    locationClimate = { coldTolerance: 6, humidity: 4, sunIntensity: 8, region: 'continental_seco' };
  } else if (lowerPrompt.includes('barcelona') || lowerPrompt.includes('cataluña')) {
    locationClimate = { coldTolerance: 7, humidity: 6, sunIntensity: 8, region: 'mediterraneo' };
  } else if (lowerPrompt.includes('valencia') || lowerPrompt.includes('murcia') || lowerPrompt.includes('alicante')) {
    locationClimate = { coldTolerance: 8, humidity: 5, sunIntensity: 9, region: 'mediterraneo_calido' };
  } else if (lowerPrompt.includes('sevilla') || lowerPrompt.includes('andalucía') || lowerPrompt.includes('málaga')) {
    locationClimate = { coldTolerance: 8, humidity: 3, sunIntensity: 10, region: 'mediterraneo_calido' };
  } else if (lowerPrompt.includes('canarias') || lowerPrompt.includes('tenerife') || lowerPrompt.includes('gran canaria')) {
    locationClimate = { coldTolerance: 9, humidity: 7, sunIntensity: 8, region: 'subtropical' };
  } else if (lowerPrompt.includes('país vasco') || lowerPrompt.includes('bilbao') || lowerPrompt.includes('san sebastián')) {
    locationClimate = { coldTolerance: 5, humidity: 8, sunIntensity: 5, region: 'atlantico_humedo' };
  }
  
  // Base factors - derived from plant attributes
  let globalViability = 5;
  let coldResistance = 5;
  let humidityTolerance = 5;
  let clayAdaptation = 5;
  let sunExposure = 5;
  let pestResistance = 6;
  
  // Plant type analysis
  const plantType = plant.plant_type?.toLowerCase() || '';
  const plantName = plant.name.toLowerCase();
  
  if (plantType === 'palm' || plantName.includes('palm')) {
    pestResistance = 7;
    if (plantName.includes('rhopalostylis') || plantName.includes('nikau')) {
      coldResistance = 8;
      humidityTolerance = 9;
      clayAdaptation = 8;
    } else if (plantName.includes('brahea')) {
      coldResistance = 7;
      humidityTolerance = 3;
      sunExposure = 9;
      clayAdaptation = 6;
    } else if (plantName.includes('chamaedorea')) {
      coldResistance = 9;
      humidityTolerance = 7;
      sunExposure = 4;
    } else if (plantName.includes('phoenix')) {
      coldResistance = 6;
      sunExposure = 9;
      humidityTolerance = 4;
    } else if (plantName.includes('trachycarpus') || plantName.includes('fortunei')) {
      coldResistance = 9;
      humidityTolerance = 6;
      clayAdaptation = 7;
    } else if (plantName.includes('washingtonia')) {
      coldResistance = 7;
      sunExposure = 9;
      humidityTolerance = 4;
    } else if (plantName.includes('butia')) {
      coldResistance = 8;
      sunExposure = 8;
      humidityTolerance = 5;
    }
  } else if (plantType === 'fern' || plantName.includes('helecho') || plantName.includes('fern')) {
    humidityTolerance = 9;
    sunExposure = 3;
    coldResistance = 6;
    clayAdaptation = 7;
  } else if (plantType === 'cycad' || plantName.includes('cyca') || plantName.includes('zamia')) {
    coldResistance = 6;
    sunExposure = 8;
    pestResistance = 8;
    humidityTolerance = 5;
  } else if (plantType === 'tree') {
    coldResistance = 7;
    humidityTolerance = 6;
    clayAdaptation = 6;
    if (plantName.includes('magnolia')) {
      coldResistance = 7;
      humidityTolerance = 6;
      sunExposure = 7;
    }
  }
  
  // Adjust based on plant's water needs
  if (plant.water === 'high') {
    humidityTolerance = Math.max(humidityTolerance, 7);
  } else if (plant.water === 'low') {
    humidityTolerance = Math.min(humidityTolerance, 4);
  }
  
  // Adjust based on plant's min temperature tolerance
  if (plant.min_temp_c !== null && plant.min_temp_c !== undefined) {
    if (plant.min_temp_c <= -10) coldResistance = 10;
    else if (plant.min_temp_c <= -5) coldResistance = Math.max(coldResistance, 8);
    else if (plant.min_temp_c <= 0) coldResistance = Math.max(coldResistance, 6);
    else if (plant.min_temp_c >= 5) coldResistance = Math.min(coldResistance, 4);
    else if (plant.min_temp_c >= 10) coldResistance = Math.min(coldResistance, 2);
  }
  
  // Adjust based on exposure
  if (plant.exposure) {
    const exposures = plant.exposure.map(e => e.toLowerCase());
    if (exposures.includes('full sun') || exposures.includes('pleno sol') || exposures.includes('soleada')) {
      sunExposure = Math.max(sunExposure, 8);
    } else if (exposures.includes('shade') || exposures.includes('sombra')) {
      sunExposure = Math.min(sunExposure, 4);
    }
  }
  
  // Climate compatibility analysis
  const climateDiff = Math.abs(locationClimate.coldTolerance - coldResistance) + 
                     Math.abs(locationClimate.humidity - humidityTolerance);
  
  if (climateDiff <= 2) {
    globalViability = 8;
  } else if (climateDiff <= 4) {
    globalViability = 6;
  } else if (climateDiff >= 6) {
    globalViability = 4;
  } else {
    globalViability = 5;
  }
  
  // Regional bonuses
  if (locationClimate.region === 'subtropical' && plantType === 'palm') {
    globalViability += 2;
  }
  if (locationClimate.region === 'atlantico_humedo' && (plantType === 'fern' || humidityTolerance >= 7)) {
    globalViability += 1;
  }
  if (locationClimate.region === 'mediterraneo_calido' && sunExposure >= 8) {
    globalViability += 1;
  }
  
  // Ensure values are within 1-10 range
  globalViability = Math.max(1, Math.min(10, globalViability));
  coldResistance = Math.max(1, Math.min(10, coldResistance));
  humidityTolerance = Math.max(1, Math.min(10, humidityTolerance));
  clayAdaptation = Math.max(1, Math.min(10, clayAdaptation));
  sunExposure = Math.max(1, Math.min(10, sunExposure));
  pestResistance = Math.max(1, Math.min(10, pestResistance));
  
  const totalScore = Math.round(
    (globalViability + coldResistance + humidityTolerance + clayAdaptation + sunExposure + pestResistance) / 6
  );
  
  // Generate recommendation text
  let recommendation = '';
  const regionText = locationClimate.region === 'continental_seco' ? ' para clima continental' : 
                    locationClimate.region === 'atlantico_humedo' ? ' para clima atlántico' :
                    locationClimate.region === 'mediterraneo' ? ' para clima mediterráneo' :
                    locationClimate.region === 'mediterraneo_calido' ? ' para clima mediterráneo cálido' :
                    locationClimate.region === 'subtropical' ? ' para clima subtropical' : '';
  
  if (totalScore >= 8) recommendation = `Excelente opción${regionText} - muy recomendada`;
  else if (totalScore >= 7) recommendation = `Buena opción${regionText} - recomendada`;
  else if (totalScore >= 6) recommendation = `Opción viable${regionText} - con cuidados`;
  else if (totalScore >= 5) recommendation = `Opción moderada${regionText} - requiere atención`;
  else if (totalScore >= 4) recommendation = `Opción desafiante${regionText} - para expertos`;
  else recommendation = `Opción muy desafiante${regionText} - no recomendada`;
  
  return {
    totalScore,
    factors: {
      globalViability,
      coldResistance,
      humidityTolerance,
      clayAdaptation,
      sunExposure,
      pestResistance
    },
    recommendation
  };
}

const SYSTEM_PROMPT = `You are an AI horticultural advisor for a plant e-commerce catalog.

RULES:
- Only recommend plants from the provided catalog
- Never invent plant attributes or species
- Use realistic horticultural reasoning
- If no plant fits well, say so clearly

RESPONSE FORMAT (STRICT JSON):
{
  "recommendations": [
    {
      "plant_id": "uuid",
      "fit_score": 0.85,
      "reasoning": "Why this plant matches the user's needs",
      "tradeoffs": "Limitations or compromises to consider"
    }
  ],
  "confidence": "low" | "medium" | "high",
  "no_good_match": false
}

SCORING:
- fit_score: 0.0 to 1.0 (0.7+ = good match, 0.5-0.7 = acceptable, <0.5 = poor)
- confidence: based on how well filters match available catalog
- Return max 3 recommendations, ordered by fit_score descending
- If all scores < 0.5, set no_good_match: true`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // SECURITY: Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[recommend-plants] Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - authentication required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Validate the JWT token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("[recommend-plants] Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("[recommend-plants] Authenticated user:", userId);

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use service role key for database queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: RecommendInput = await req.json();
    const { user_prompt, filters, catalog_subset } = body;

    console.log("[recommend-plants] Request:", { user_prompt, filters, hasCatalogSubset: !!catalog_subset, userId });

    // Use provided catalog or fetch from database
    let catalog: CatalogPlant[];
    
    if (catalog_subset && catalog_subset.length > 0) {
      catalog = catalog_subset;
      console.log(`[recommend-plants] Using provided catalog subset: ${catalog.length} plants`);
    } else {
      // Fetch from database
      let dbQuery = supabase
        .from("plants")
        .select(`
          id, name, scientific_name, plant_type, exposure, growth_rate,
          climate_zones, min_temp_c, water, humidity, plant_use,
          rarity, difficulty, is_in_stock, price, thumbnail_url
        `)
        .eq("is_active", true);

      if (filters?.is_in_stock !== false) {
        dbQuery = dbQuery.eq("is_in_stock", true);
      }

      const { data: plants, error: dbError } = await dbQuery;

      if (dbError) {
        console.error("[recommend-plants] Database error:", dbError);
        throw new Error("Failed to fetch catalog");
      }

      catalog = (plants || []) as CatalogPlant[];
      console.log(`[recommend-plants] Fetched ${catalog.length} plants from database`);
    }

    // Handle empty catalog
    if (catalog.length === 0) {
      const emptyResponse: RecommendOutput = {
        recommendations: [],
        confidence: "low",
        no_good_match: true,
      };
      return new Response(JSON.stringify(emptyResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build AI prompt
    const userMessage = buildUserMessage(user_prompt, filters, catalog);

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    // Parse and validate AI response
    interface AIRecommendation {
      plant_id: string;
      fit_score: number;
      reasoning: string;
      tradeoffs: string;
    }
    
    interface AIResult {
      recommendations?: AIRecommendation[];
      confidence?: "low" | "medium" | "high";
      no_good_match?: boolean;
    }
    
    let aiResult: AIResult;
    try {
      aiResult = JSON.parse(aiContent);
    } catch {
      console.error("[recommend-plants] Failed to parse AI response:", aiContent);
      throw new Error("Invalid AI response format");
    }

    // Validate plant_ids exist in catalog and add viability calculations
    const validRecommendations: PlantRecommendation[] = (aiResult.recommendations || [])
      .filter((rec: AIRecommendation) => catalog.some(p => p.id === rec.plant_id))
      .slice(0, 3)
      .map((rec: AIRecommendation) => {
        const plant = catalog.find(p => p.id === rec.plant_id)!;
        const viability = calculateViability(plant, user_prompt);
        return {
          ...rec,
          viability
        };
      });

    const response: RecommendOutput = {
      recommendations: validRecommendations,
      confidence: aiResult.confidence || "medium",
      no_good_match: aiResult.no_good_match || validRecommendations.length === 0,
    };

    console.log(`[recommend-plants] Returning ${response.recommendations.length} recommendations with viability`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[recommend-plants] Error:", error);
    const errorResponse: RecommendOutput = {
      recommendations: [],
      confidence: "low",
      no_good_match: true,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function buildUserMessage(
  user_prompt: string | undefined,
  filters: RecommendInput["filters"],
  catalog: CatalogPlant[]
): string {
  const sections: string[] = [];

  // User intent
  if (user_prompt) {
    sections.push(`USER PROMPT:\n"${user_prompt}"`);
  }

  // Applied filters
  const filterLines: string[] = [];
  if (filters) {
    if (filters.exposure?.length) filterLines.push(`- Exposure: ${filters.exposure.join(", ")}`);
    if (filters.growth_rate) filterLines.push(`- Growth rate: ${filters.growth_rate}`);
    if (filters.climate_zones?.length) filterLines.push(`- Climate zones: ${filters.climate_zones.join(", ")}`);
    if (filters.plant_use?.length) filterLines.push(`- Intended use: ${filters.plant_use.join(", ")}`);
    if (filters.water) filterLines.push(`- Water needs: ${filters.water}`);
    if (filters.humidity) filterLines.push(`- Humidity: ${filters.humidity}`);
    if (filters.min_temp_c !== undefined) filterLines.push(`- Min temperature: ${filters.min_temp_c}°C`);
    if (filters.plant_type?.length) filterLines.push(`- Plant type: ${filters.plant_type.join(", ")}`);
    if (filters.difficulty) filterLines.push(`- Difficulty: ${filters.difficulty}`);
    if (filters.rarity) filterLines.push(`- Rarity: ${filters.rarity}`);
    if (filters.price_max) filterLines.push(`- Max price: ${filters.price_max}€`);
  }
  if (filterLines.length > 0) {
    sections.push(`FILTERS:\n${filterLines.join("\n")}`);
  }

  // Catalog
  const catalogData = catalog.map(p => ({
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
    price: p.price,
  }));
  sections.push(`CATALOG (${catalog.length} plants):\n${JSON.stringify(catalogData, null, 2)}`);

  // Task
  sections.push(`TASK:
1. Rank plants from best to weakest match
2. Select up to 3 items
3. For each: fit_score (0-1), reasoning, tradeoffs
4. Set no_good_match: true if all scores < 0.5
5. Set confidence based on filter match quality

Return STRICT JSON only.`);

  return sections.join("\n\n---\n\n");
}
