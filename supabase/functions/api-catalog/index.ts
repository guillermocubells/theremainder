import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse, PRESETS } from "../_shared/rate-limit.ts";
import { createLogger, withCorrelationId } from "../_shared/logger.ts";
import { AppError, handleError, errorResponse } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// ── Input sanitization ──
function sanitizeSearchQuery(q: string): string {
  return q
    .replace(/[%_\\]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 200);
}

const VALID_SLUG_RE = /^[a-z0-9-]+$/;

function isValidEnum(val: string | null, allowed: string[]): boolean {
  return val === null || allowed.includes(val);
}

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

  const { log, requestId } = createLogger("api-catalog", req);
  const rh = withCorrelationId(corsHeaders, requestId);

  const rl = checkRateLimit(req, PRESETS.public_read);
  if (!rl.allowed) {
    return rateLimitResponse(rl.headers, corsHeaders);
  }

  function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: rh });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const url = new URL(req.url);
    const path = url.pathname.replace("/api-catalog", "").replace(/\/$/, "") || "";

    log.info("Request", { method: req.method, path });

    // GET /search — Full-text search with facets, filters, sort, pagination
    if (req.method === "GET" && path === "/search") {
      const q = url.searchParams.get("q")?.trim() || null;
      const plantType = url.searchParams.getAll("plant_type").filter(Boolean);
      const difficulty = url.searchParams.getAll("difficulty").filter(Boolean);
      const rarity = url.searchParams.getAll("rarity").filter(Boolean);
      const water = url.searchParams.getAll("water").filter(Boolean);
      const humidity = url.searchParams.getAll("humidity").filter(Boolean);
      const exposure = url.searchParams.getAll("exposure").filter(Boolean);
      const climateZones = url.searchParams.getAll("climate_zone").filter(Boolean);
      const hardinessZones = url.searchParams.getAll("hardiness_zone").filter(Boolean);
      const plantUse = url.searchParams.getAll("plant_use").filter(Boolean);
      const categorySlug = url.searchParams.get("category") || null;
      const minPrice = url.searchParams.get("min_price") ? parseFloat(url.searchParams.get("min_price")!) : null;
      const maxPrice = url.searchParams.get("max_price") ? parseFloat(url.searchParams.get("max_price")!) : null;
      const inStock = url.searchParams.get("in_stock") !== "false";
      const featured = url.searchParams.get("featured") === "true" ? true : null;
      const sort = url.searchParams.get("sort") || "relevance";
      const abVariant = url.searchParams.get("ab") || null; // A/B testing variant
      const page = Math.max(parseInt(url.searchParams.get("page") || "1") || 1, 1);
      const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("page_size") || "24") || 24, 1), 100);

      // Sanitize query
      const sanitizedQ = q ? sanitizeSearchQuery(q) : null;
      if (q && (!sanitizedQ || sanitizedQ.length < 1)) {
        throw new AppError("Invalid search query", 400, "INVALID_QUERY");
      }

      // Resolve category slug → id
      let categoryId: string | null = null;
      if (categorySlug) {
        if (!VALID_SLUG_RE.test(categorySlug)) throw new AppError("Invalid category slug", 400, "INVALID_FILTER");
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).single();
        categoryId = cat?.id ?? null;
      }

      // Validate sort
      const validSorts = ["relevance", "price_asc", "price_desc", "newest", "name_asc", "rarity_desc"];
      if (!validSorts.includes(sort)) throw new AppError("Invalid sort", 400, "INVALID_SORT");

      // Call the DB search function
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: searchResult, error: searchErr } = await serviceClient.rpc("search_catalog", {
        p_query: sanitizedQ,
        p_plant_type: plantType.length ? plantType : null,
        p_difficulty: difficulty.length ? difficulty : null,
        p_rarity: rarity.length ? rarity : null,
        p_water: water.length ? water : null,
        p_humidity: humidity.length ? humidity : null,
        p_exposure: exposure.length ? exposure : null,
        p_climate_zones: climateZones.length ? climateZones : null,
        p_hardiness_zones: hardinessZones.length ? hardinessZones : null,
        p_plant_use: plantUse.length ? plantUse : null,
        p_category_id: categoryId,
        p_min_price: minPrice,
        p_max_price: maxPrice,
        p_in_stock: inStock,
        p_is_featured: featured,
        p_sort: sort,
        p_sort_dir: "asc",
        p_page: page,
        p_page_size: pageSize,
        p_ab_variant: abVariant,
      });

      if (searchErr) throw searchErr;

      const result = searchResult as {
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
        items: Array<{ plant_id: string; score: number }>;
        facets: Record<string, Record<string, number>>;
        relevance_variant: string;
      };

      // Hydrate plant data for matched IDs
      const plantIds = result.items.map((i) => i.plant_id);
      let plants: Record<string, unknown>[] = [];

      if (plantIds.length > 0) {
        const { data: plantData, error: plantErr } = await supabase
          .from("plants")
          .select(
            `id, name, slug, scientific_name, common_name, short_description,
             price, sale_price, stock_qty,
             plant_type, difficulty, rarity, climate_zones, exposure,
             water, humidity, growth_rate, min_temp_c,
             images, primary_image, product_images,
             is_featured, container_size, family,
             categories (id, name, slug)`
          )
          .in("id", plantIds);

        if (plantErr) throw plantErr;

        // Re-order to match score ranking
        const plantMap = new Map((plantData ?? []).map((p: { id: string }) => [p.id, p]));
        plants = result.items
          .map((item) => {
            const plant = plantMap.get(item.plant_id);
            if (!plant) return null;
            return { ...plant, _score: item.score };
          })
          .filter(Boolean) as Record<string, unknown>[];
      }

      // Build highlight ranges for the query tokens (client can use these)
      let highlightTokens: string[] = [];
      if (sanitizedQ) {
        highlightTokens = sanitizedQ
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .split(/\s+/)
          .filter((t) => t.length >= 2);
      }

      log.info("Search completed", { q: sanitizedQ, total: result.total, page, sort });

      return json({
        success: true,
        data: plants,
        pagination: {
          page: result.page,
          page_size: result.page_size,
          total: result.total,
          total_pages: result.total_pages,
          has_more: result.page < result.total_pages,
        },
        facets: result.facets,
        highlight_tokens: highlightTokens,
        query: sanitizedQ,
        relevance_variant: result.relevance_variant,
      });
    }

    // GET /plants
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

      if (plantType && !isValidEnum(plantType, VALID_PLANT_TYPES)) {
        throw new AppError("Invalid plant_type value", 400, "INVALID_FILTER");
      }
      if (difficulty && !isValidEnum(difficulty, VALID_DIFFICULTIES)) {
        throw new AppError("Invalid difficulty value", 400, "INVALID_FILTER");
      }
      if (rarity && !isValidEnum(rarity, VALID_RARITIES)) {
        throw new AppError("Invalid rarity value", 400, "INVALID_FILTER");
      }
      if (water && !isValidEnum(water, VALID_WATER)) {
        throw new AppError("Invalid water value", 400, "INVALID_FILTER");
      }

      const minPrice = minPriceRaw ? parseFloat(minPriceRaw) : undefined;
      const maxPrice = maxPriceRaw ? parseFloat(maxPriceRaw) : undefined;
      if (minPrice !== undefined && (isNaN(minPrice) || minPrice < 0 || minPrice > 100000)) {
        throw new AppError("Invalid min_price", 400, "INVALID_FILTER");
      }
      if (maxPrice !== undefined && (isNaN(maxPrice) || maxPrice < 0 || maxPrice > 100000)) {
        throw new AppError("Invalid max_price", 400, "INVALID_FILTER");
      }

      const search = searchRaw ? sanitizeSearchQuery(searchRaw) : undefined;
      if (searchRaw && (!search || search.length < 1)) {
        throw new AppError("Invalid search query", 400, "INVALID_FILTER");
      }

      if (category && !VALID_SLUG_RE.test(category)) {
        throw new AppError("Invalid category slug", 400, "INVALID_FILTER");
      }

      const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50") || 50, 1), 100);
      const offset = Math.max(parseInt(url.searchParams.get("offset") || "0") || 0, 0);

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

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,scientific_name.ilike.%${search}%,common_name.ilike.%${search}%,short_description.ilike.%${search}%`
        );
      }

      query = query
        .order(sortField, { ascending: sortOrder })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      log.info("Plants listed", { count, offset, limit });

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

    // GET /plants/:slug
    if (req.method === "GET" && path.startsWith("/plants/")) {
      const slug = path.replace("/plants/", "");

      if (!slug || slug.includes("/") || slug.length > 200 || !VALID_SLUG_RE.test(slug)) {
        throw new AppError("Invalid slug", 400, "INVALID_SLUG");
      }

      const { data, error } = await supabase
        .from("plants")
        .select(`*, categories (id, name, slug, description)`)
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        throw new AppError("Plant not found", 404, "PLANT_NOT_FOUND");
      }

      return json({ success: true, data });
    }

    // GET /categories
    if (req.method === "GET" && path === "/categories") {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return json({ success: true, data });
    }

    // GET /shipping-zones
    if (req.method === "GET" && path === "/shipping-zones") {
      const { data, error } = await supabase
        .from("shipping_zones")
        .select("country_code, country_name, base_cost, per_item_cost, free_shipping_threshold, delivery_days_min, delivery_days_max")
        .eq("is_active", true)
        .order("country_name", { ascending: true });

      if (error) throw error;
      return json({ success: true, data });
    }

    throw new AppError("Endpoint not found", 404, "NOT_FOUND");
  } catch (err) {
    return handleError(err, rh, requestId, log);
  }
});
