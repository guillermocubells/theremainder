import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

// Valid sort options to prevent injection
const VALID_SORT_FIELDS = ["price", "name", "created_at", "display_order"] as const;
type SortField = typeof VALID_SORT_FIELDS[number];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const url = new URL(req.url);
    const path = url.pathname.replace("/api-catalog", "").replace(/\/$/, "") || "";

    // ──────────────────────────────────────────────
    // GET /plants — List with filters, search, sort, pagination
    // ──────────────────────────────────────────────
    if (req.method === "GET" && (path === "" || path === "/plants")) {
      const category = url.searchParams.get("category") || undefined;
      const plantType = url.searchParams.get("plant_type") || undefined;
      const minPrice = url.searchParams.get("min_price") ? parseFloat(url.searchParams.get("min_price")!) : undefined;
      const maxPrice = url.searchParams.get("max_price") ? parseFloat(url.searchParams.get("max_price")!) : undefined;
      const inStock = url.searchParams.get("in_stock") === "true" ? true : undefined;
      const climateZone = url.searchParams.get("climate_zone") || undefined;
      const difficulty = url.searchParams.get("difficulty") || undefined;
      const search = url.searchParams.get("q")?.trim() || undefined;
      const featured = url.searchParams.get("featured") === "true" ? true : undefined;
      const rarity = url.searchParams.get("rarity") || undefined;
      const water = url.searchParams.get("water") || undefined;
      const exposure = url.searchParams.get("exposure") || undefined;

      // Pagination (clamped)
      const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50"), 1), 100);
      const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

      // Sorting
      const sortParam = url.searchParams.get("sort") || "display_order";
      const sortField: SortField = VALID_SORT_FIELDS.includes(sortParam as SortField)
        ? (sortParam as SortField)
        : "display_order";
      const sortOrder = url.searchParams.get("order") === "desc" ? false : true; // ascending by default

      let query = supabase
        .from("plants")
        .select(
          `id, name, scientific_name, common_name, slug, short_description,
           price, sale_price, stock_qty,
           plant_type, difficulty, rarity, climate_zones, exposure,
           water, humidity, growth_rate, min_temp_c,
           images, primary_image, product_images,
           is_featured, container_size, family,
           categories (id, name, slug)`,
          { count: "exact" }
        )
        .eq("is_active", true);

      // --- Filters ---
      if (category) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", category)
          .single();
        if (cat) query = query.eq("category_id", cat.id);
      }
      if (plantType) query = query.eq("plant_type", plantType);
      if (minPrice !== undefined) query = query.gte("price", minPrice);
      if (maxPrice !== undefined) query = query.lte("price", maxPrice);
      if (inStock) query = query.gt("stock_qty", 0);
      if (difficulty) query = query.eq("difficulty", difficulty);
      if (rarity) query = query.eq("rarity", rarity);
      if (water) query = query.eq("water", water);
      if (climateZone) query = query.contains("climate_zones", [climateZone]);
      if (exposure) query = query.contains("exposure", [exposure]);
      if (featured) query = query.eq("is_featured", true);

      // --- Text search (name, scientific_name, common_name, description) ---
      if (search) {
        query = query.or(
          `name.ilike.%${search}%,scientific_name.ilike.%${search}%,common_name.ilike.%${search}%,short_description.ilike.%${search}%`
        );
      }

      // --- Sort & paginate ---
      query = query
        .order(sortField, { ascending: sortOrder })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return json({
        success: true,
        data,
        pagination: {
          limit,
          offset,
          total: count ?? 0,
          has_more: (count ?? 0) > offset + limit,
        },
      });
    }

    // ──────────────────────────────────────────────
    // GET /plants/:slug — Single plant detail
    // ──────────────────────────────────────────────
    if (req.method === "GET" && path.startsWith("/plants/")) {
      const slug = path.replace("/plants/", "");

      if (!slug || slug.includes("/")) {
        return json({ success: false, error: "Invalid slug" }, 400);
      }

      const { data, error } = await supabase
        .from("plants")
        .select(
          `*,
           categories (id, name, slug, description)`
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return json({ success: false, error: "Plant not found" }, 404);
      }

      return json({ success: true, data });
    }

    // ──────────────────────────────────────────────
    // GET /categories
    // ──────────────────────────────────────────────
    if (req.method === "GET" && path === "/categories") {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return json({ success: true, data });
    }

    // ──────────────────────────────────────────────
    // GET /shipping-zones
    // ──────────────────────────────────────────────
    if (req.method === "GET" && path === "/shipping-zones") {
      const { data, error } = await supabase
        .from("shipping_zones")
        .select("country_code, country_name, base_cost, per_item_cost, free_shipping_threshold, delivery_days_min, delivery_days_max")
        .eq("is_active", true)
        .order("country_name", { ascending: true });

      if (error) throw error;
      return json({ success: true, data });
    }

    // ──────────────────────────────────────────────
    // 404
    // ──────────────────────────────────────────────
    return json({
      success: false,
      error: "Endpoint not found",
      available_endpoints: [
        "GET /plants?q=&category=&plant_type=&difficulty=&rarity=&water=&exposure=&climate_zone=&min_price=&max_price=&in_stock=true&featured=true&sort=price&order=desc&limit=50&offset=0",
        "GET /plants/:slug",
        "GET /categories",
        "GET /shipping-zones",
      ],
    }, 404);
  } catch (error: unknown) {
    console.error("API Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return json({ success: false, error: message }, 500);
  }
});
