import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse, PRESETS } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

// ── Input sanitization ──
function sanitizeSearchQuery(q: string): string {
  // Strip dangerous characters that could break ilike queries
  return q
    .replace(/[%_\\]/g, '') // remove SQL wildcard chars
    .replace(/<[^>]*>/g, '')  // strip HTML
    .trim()
    .slice(0, 200); // max 200 chars
}

const VALID_SLUG_RE = /^[a-z0-9-]+$/;
const VALID_ENUM_RE = /^[a-z_]+$/;

function isValidEnum(val: string | null, allowed: string[]): boolean {
  return val === null || allowed.includes(val);
}

// Valid sort options to prevent injection
const VALID_SORT_FIELDS = ["price", "name", "created_at", "display_order"] as const;
type SortField = typeof VALID_SORT_FIELDS[number];

const VALID_PLANT_TYPES = ["palm", "fern", "tree", "cycad", "shrub", "succulent", "other"];
const VALID_DIFFICULTIES = ["easy", "intermediate", "advanced"];
const VALID_RARITIES = ["common", "medium", "rare", "very_rare", "ultra_rare"];
const VALID_WATER = ["low", "medium", "high"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Rate limit check
  const rl = checkRateLimit(req, PRESETS.public_read);
  if (!rl.allowed) {
    return rateLimitResponse(rl.headers, corsHeaders);
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
      const minPriceRaw = url.searchParams.get("min_price");
      const maxPriceRaw = url.searchParams.get("max_price");
      const inStock = url.searchParams.get("in_stock") === "true" ? true : undefined;
      const climateZone = url.searchParams.get("climate_zone") || undefined;
      const difficulty = url.searchParams.get("difficulty") || undefined;
      const searchRaw = url.searchParams.get("q")?.trim() || undefined;
      const featured = url.searchParams.get("featured") === "true" ? true : undefined;
      const rarity = url.searchParams.get("rarity") || undefined;
      const water = url.searchParams.get("water") || undefined;
      const exposure = url.searchParams.get("exposure") || undefined;

      // ── Validate enum filters ──
      if (plantType && !isValidEnum(plantType, VALID_PLANT_TYPES)) {
        return json({ success: false, error: "Invalid plant_type value" }, 400);
      }
      if (difficulty && !isValidEnum(difficulty, VALID_DIFFICULTIES)) {
        return json({ success: false, error: "Invalid difficulty value" }, 400);
      }
      if (rarity && !isValidEnum(rarity, VALID_RARITIES)) {
        return json({ success: false, error: "Invalid rarity value" }, 400);
      }
      if (water && !isValidEnum(water, VALID_WATER)) {
        return json({ success: false, error: "Invalid water value" }, 400);
      }

      // ── Validate numeric filters ──
      const minPrice = minPriceRaw ? parseFloat(minPriceRaw) : undefined;
      const maxPrice = maxPriceRaw ? parseFloat(maxPriceRaw) : undefined;
      if (minPrice !== undefined && (isNaN(minPrice) || minPrice < 0 || minPrice > 100000)) {
        return json({ success: false, error: "Invalid min_price" }, 400);
      }
      if (maxPrice !== undefined && (isNaN(maxPrice) || maxPrice < 0 || maxPrice > 100000)) {
        return json({ success: false, error: "Invalid max_price" }, 400);
      }

      // ── Sanitize search query ──
      const search = searchRaw ? sanitizeSearchQuery(searchRaw) : undefined;
      if (searchRaw && (!search || search.length < 1)) {
        return json({ success: false, error: "Invalid search query" }, 400);
      }

      // ── Validate category slug format ──
      if (category && !VALID_SLUG_RE.test(category)) {
        return json({ success: false, error: "Invalid category slug" }, 400);
      }

      // Pagination (clamped)
      const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50") || 50, 1), 100);
      const offset = Math.max(parseInt(url.searchParams.get("offset") || "0") || 0, 0);

      // Sorting
      const sortParam = url.searchParams.get("sort") || "display_order";
      const sortField: SortField = VALID_SORT_FIELDS.includes(sortParam as SortField)
        ? (sortParam as SortField)
        : "display_order";
      const sortOrder = url.searchParams.get("order") === "desc" ? false : true;

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

      // --- Text search (sanitized) ---
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

      if (!slug || slug.includes("/") || slug.length > 200 || !VALID_SLUG_RE.test(slug)) {
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
