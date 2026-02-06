import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

interface ViabilityFactors {
  globalViability: number;
  coldResistance: number;
  humidityTolerance: number;
  clayAdaptation: number;
  sunExposure: number;
  pestResistance: number;
}

function calculateViability(plant: CatalogPlant, userPrompt?: string): { totalScore: number; factors: ViabilityFactors; recommendation: string } {
  const lowerPrompt = (userPrompt || '').toLowerCase();
  
  let locationClimate = { coldTolerance: 7, humidity: 5, sunIntensity: 8, region: 'mediterraneo' };
  
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
  } else if (lowerPrompt.includes('canarias') || lowerPrompt.includes('tenerife')) {
    locationClimate = { coldTolerance: 9, humidity: 7, sunIntensity: 8, region: 'subtropical' };
  } else if (lowerPrompt.includes('país vasco') || lowerPrompt.includes('bilbao')) {
    locationClimate = { coldTolerance: 5, humidity: 8, sunIntensity: 5, region: 'atlantico_humedo' };
  }
  
  let globalViability = 5, coldResistance = 5, humidityTolerance = 5, clayAdaptation = 5, sunExposure = 5, pestResistance = 6;
  
  const plantType = plant.plant_type?.toLowerCase() || '';
  const plantName = plant.name.toLowerCase();
  
  if (plantType === 'palm' || plantName.includes('palm')) {
    pestResistance = 7;
    if (plantName.includes('rhopalostylis')) { coldResistance = 8; humidityTolerance = 9; clayAdaptation = 8; }
    else if (plantName.includes('brahea')) { coldResistance = 7; humidityTolerance = 3; sunExposure = 9; }
    else if (plantName.includes('chamaedorea')) { coldResistance = 9; humidityTolerance = 7; sunExposure = 4; }
    else if (plantName.includes('phoenix')) { coldResistance = 6; sunExposure = 9; humidityTolerance = 4; }
    else if (plantName.includes('trachycarpus')) { coldResistance = 9; humidityTolerance = 6; clayAdaptation = 7; }
    else if (plantName.includes('washingtonia')) { coldResistance = 7; sunExposure = 9; humidityTolerance = 4; }
    else if (plantName.includes('butia')) { coldResistance = 8; sunExposure = 8; humidityTolerance = 5; }
  } else if (plantType === 'fern' || plantName.includes('helecho')) {
    humidityTolerance = 9; sunExposure = 3; coldResistance = 6; clayAdaptation = 7;
  } else if (plantType === 'cycad' || plantName.includes('cyca')) {
    coldResistance = 6; sunExposure = 8; pestResistance = 8; humidityTolerance = 5;
  } else if (plantType === 'tree') {
    coldResistance = 7; humidityTolerance = 6; clayAdaptation = 6;
  }
  
  if (plant.water === 'high') humidityTolerance = Math.max(humidityTolerance, 7);
  else if (plant.water === 'low') humidityTolerance = Math.min(humidityTolerance, 4);
  
  if (plant.min_temp_c !== null && plant.min_temp_c !== undefined) {
    if (plant.min_temp_c <= -10) coldResistance = 10;
    else if (plant.min_temp_c <= -5) coldResistance = Math.max(coldResistance, 8);
    else if (plant.min_temp_c <= 0) coldResistance = Math.max(coldResistance, 6);
    else if (plant.min_temp_c >= 5) coldResistance = Math.min(coldResistance, 4);
    else if (plant.min_temp_c >= 10) coldResistance = Math.min(coldResistance, 2);
  }
  
  if (plant.exposure) {
    const exposures = plant.exposure.map(e => e.toLowerCase());
    if (exposures.some(e => e.includes('sun') || e.includes('sol'))) sunExposure = Math.max(sunExposure, 8);
    else if (exposures.some(e => e.includes('shade') || e.includes('sombra'))) sunExposure = Math.min(sunExposure, 4);
  }
  
  const climateDiff = Math.abs(locationClimate.coldTolerance - coldResistance) + Math.abs(locationClimate.humidity - humidityTolerance);
  if (climateDiff <= 2) globalViability = 8;
  else if (climateDiff <= 4) globalViability = 6;
  else if (climateDiff >= 6) globalViability = 4;
  else globalViability = 5;
  
  if (locationClimate.region === 'subtropical' && plantType === 'palm') globalViability += 2;
  if (locationClimate.region === 'atlantico_humedo' && (plantType === 'fern' || humidityTolerance >= 7)) globalViability += 1;
  if (locationClimate.region === 'mediterraneo_calido' && sunExposure >= 8) globalViability += 1;
  
  const clamp = (v: number) => Math.max(1, Math.min(10, v));
  globalViability = clamp(globalViability);
  coldResistance = clamp(coldResistance);
  humidityTolerance = clamp(humidityTolerance);
  clayAdaptation = clamp(clayAdaptation);
  sunExposure = clamp(sunExposure);
  pestResistance = clamp(pestResistance);
  
  const totalScore = Math.round((globalViability + coldResistance + humidityTolerance + clayAdaptation + sunExposure + pestResistance) / 6);
  
  const regionText = { continental_seco: ' para clima continental', atlantico_humedo: ' para clima atlántico', mediterraneo: ' para clima mediterráneo', mediterraneo_calido: ' para clima mediterráneo cálido', subtropical: ' para clima subtropical' }[locationClimate.region] || '';
  
  let recommendation = '';
  if (totalScore >= 8) recommendation = `Excelente opción${regionText}`;
  else if (totalScore >= 7) recommendation = `Buena opción${regionText}`;
  else if (totalScore >= 6) recommendation = `Opción viable${regionText}`;
  else if (totalScore >= 5) recommendation = `Opción moderada${regionText}`;
  else recommendation = `Opción desafiante${regionText}`;
  
  return { totalScore, factors: { globalViability, coldResistance, humidityTolerance, clayAdaptation, sunExposure, pestResistance }, recommendation };
}

const SYSTEM_PROMPT = `You are an AI horticultural advisor for a plant e-commerce catalog.
RULES: Only recommend plants from the provided catalog. Never invent plant attributes.
RESPONSE FORMAT (STRICT JSON):
{"recommendations":[{"plant_id":"uuid","fit_score":0.85,"reasoning":"Why this plant matches","tradeoffs":"Limitations"}],"confidence":"low"|"medium"|"high","no_good_match":false}
Return max 3 recommendations ordered by fit_score. If all scores < 0.5, set no_good_match: true.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Auth is optional — log user if available, but don't block recommendations
    const authHeader = req.headers.get("Authorization");
    let userId = "anonymous";
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: userData } = await supabaseAuth.auth.getUser();
      if (userData?.user) {
        userId = userData.user.id;
      }
    }

    console.log("[recommend-plants] User:", userId);

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { user_prompt, filters, catalog_subset } = body;

    console.log("[recommend-plants] Request:", { user_prompt, filters: !!filters, catalog: !!catalog_subset });

    let catalog: CatalogPlant[];
    
    if (catalog_subset?.length > 0) {
      catalog = catalog_subset;
    } else {
      let dbQuery = supabase.from("plants").select("id, name, scientific_name, plant_type, exposure, growth_rate, climate_zones, min_temp_c, water, humidity, plant_use, rarity, difficulty, is_in_stock, price, thumbnail_url").eq("is_active", true);
      if (filters?.is_in_stock !== false) dbQuery = dbQuery.eq("is_in_stock", true);
      const { data: plants, error: dbError } = await dbQuery;
      if (dbError) throw new Error("Failed to fetch catalog");
      catalog = (plants || []) as CatalogPlant[];
    }

    console.log("[recommend-plants] Catalog size:", catalog.length);

    if (catalog.length === 0) {
      return new Response(JSON.stringify({ recommendations: [], confidence: "low", no_good_match: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const catalogData = catalog.map(p => ({ id: p.id, name: p.name, scientific_name: p.scientific_name, plant_type: p.plant_type, exposure: p.exposure, min_temp_c: p.min_temp_c, water: p.water, price: p.price }));
    
    const userMessage = `${user_prompt ? `USER: "${user_prompt}"` : ''}\nCATALOG (${catalog.length}): ${JSON.stringify(catalogData)}\nReturn STRICT JSON.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableApiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMessage }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[recommend-plants] AI error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 });
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) throw new Error("No AI response");

    let aiResult;
    try { aiResult = JSON.parse(aiContent); } catch { throw new Error("Invalid AI JSON"); }

    const validRecommendations = (aiResult.recommendations || [])
      .filter((rec: { plant_id: string }) => catalog.some(p => p.id === rec.plant_id))
      .slice(0, 3)
      .map((rec: { plant_id: string; fit_score: number; reasoning: string; tradeoffs: string }) => {
        const plant = catalog.find(p => p.id === rec.plant_id)!;
        return { ...rec, viability: calculateViability(plant, user_prompt) };
      });

    console.log("[recommend-plants] Returning", validRecommendations.length, "recommendations");

    return new Response(JSON.stringify({
      recommendations: validRecommendations,
      confidence: aiResult.confidence || "medium",
      no_good_match: aiResult.no_good_match || validRecommendations.length === 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[recommend-plants] Error:", error);
    return new Response(JSON.stringify({ recommendations: [], confidence: "low", no_good_match: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
