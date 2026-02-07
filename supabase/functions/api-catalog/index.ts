import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

interface PlantFilters {
  category?: string;
  plant_type?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  climate_zone?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const url = new URL(req.url);
    const path = url.pathname.replace("/api-catalog", "");
    
    // GET /plants - List all active plants with filters
    if (req.method === "GET" && (path === "" || path === "/" || path === "/plants")) {
      const filters: PlantFilters = {
        category: url.searchParams.get("category") || undefined,
        plant_type: url.searchParams.get("plant_type") || undefined,
        min_price: url.searchParams.get("min_price") ? parseFloat(url.searchParams.get("min_price")!) : undefined,
        max_price: url.searchParams.get("max_price") ? parseFloat(url.searchParams.get("max_price")!) : undefined,
        in_stock: url.searchParams.get("in_stock") === "true" ? true : undefined,
        climate_zone: url.searchParams.get("climate_zone") || undefined,
        difficulty: url.searchParams.get("difficulty") || undefined,
        limit: parseInt(url.searchParams.get("limit") || "50"),
        offset: parseInt(url.searchParams.get("offset") || "0"),
      };

      let query = supabase
        .from("plants")
        .select(`
          id, name, scientific_name, slug, short_description, 
          price, sale_price, stock_qty,
          plant_type, difficulty, climate_zones, exposure,
          water, humidity, growth_rate, min_temp_c,
          images,
          categories (id, name, slug)
        `)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      // Apply filters
      if (filters.category) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", filters.category)
          .single();
        if (cat) query = query.eq("category_id", cat.id);
      }
      if (filters.plant_type) query = query.eq("plant_type", filters.plant_type);
      if (filters.min_price) query = query.gte("price", filters.min_price);
      if (filters.max_price) query = query.lte("price", filters.max_price);
      if (filters.in_stock) query = query.gt("stock_qty", 0);
      if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
      if (filters.climate_zone) query = query.contains("climate_zones", [filters.climate_zone]);

      query = query.range(filters.offset!, filters.offset! + filters.limit! - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: count
        }
      }), { headers: corsHeaders });
    }

    // GET /plants/:slug - Get single plant details
    if (req.method === "GET" && path.startsWith("/plants/")) {
      const slug = path.replace("/plants/", "");
      
      const { data, error } = await supabase
        .from("plants")
        .select(`
          *,
          categories (id, name, slug, description)
        `)
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({
          success: false,
          error: "Plant not found"
        }), { status: 404, headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        success: true,
        data
      }), { headers: corsHeaders });
    }

    // GET /categories - List all active categories
    if (req.method === "GET" && path === "/categories") {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data
      }), { headers: corsHeaders });
    }

    // GET /shipping-zones - List active shipping zones
    if (req.method === "GET" && path === "/shipping-zones") {
      const { data, error } = await supabase
        .from("shipping_zones")
        .select("country_code, country_name, base_cost, per_item_cost, free_shipping_threshold, delivery_days_min, delivery_days_max")
        .eq("is_active", true)
        .order("country_name", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data
      }), { headers: corsHeaders });
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({
      success: false,
      error: "Endpoint not found",
      available_endpoints: [
        "GET /plants - List plants with filters",
        "GET /plants/:slug - Get plant details",
        "GET /categories - List categories",
        "GET /shipping-zones - List shipping zones"
      ]
    }), { status: 404, headers: corsHeaders });

  } catch (error: unknown) {
    console.error("API Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({
      success: false,
      error: message
    }), { status: 500, headers: corsHeaders });
  }
});
