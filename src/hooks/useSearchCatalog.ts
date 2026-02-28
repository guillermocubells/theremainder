import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────

export interface SearchFilters {
  q?: string;
  plant_type?: string[];
  difficulty?: string[];
  rarity?: string[];
  water?: string[];
  humidity?: string[];
  exposure?: string[];
  climate_zone?: string[];
  hardiness_zone?: string[];
  plant_use?: string[];
  tags?: string[];
  origin_country?: string[];
  category?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  featured?: boolean;
  // Climate filters
  hardiness_min?: string;
  hardiness_max?: string;
  min_temp_max?: number;
  climate_fit_min?: number;
  address_id?: string;
}

export type SortKey = "relevance" | "price_asc" | "price_desc" | "newest" | "name_asc" | "rarity_desc" | "climate_fit";

export interface SearchPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}

export interface SearchPlant {
  id: string;
  name: string;
  slug: string;
  scientific_name: string | null;
  common_name: string | null;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  stock_qty: number;
  plant_type: string | null;
  difficulty: string | null;
  rarity: string | null;
  climate_zones: string[] | null;
  exposure: string[] | null;
  water: string | null;
  humidity: string | null;
  growth_rate: string | null;
  min_temp_c: number | null;
  images: string[] | null;
  primary_image: string | null;
  product_images: string[] | null;
  is_featured: boolean;
  container_size: string | null;
  family: string | null;
  categories: { id: string; name: string; slug: string } | null;
  _score?: number;
}

export type FacetBuckets = Record<string, Record<string, number>>;

export interface SearchResult {
  plants: SearchPlant[];
  pagination: SearchPagination;
  facets: FacetBuckets;
  highlight_tokens: string[];
  query: string | null;
  relevance_variant: string;
}

// ── URL serialization helpers ────────────────────────────────────────

const ARRAY_FILTER_KEYS: (keyof SearchFilters)[] = [
  "plant_type", "difficulty", "rarity", "water", "humidity",
  "exposure", "climate_zone", "hardiness_zone", "plant_use",
  "tags", "origin_country",
];

const VALID_SORTS = new Set<SortKey>(["relevance", "price_asc", "price_desc", "newest", "name_asc", "rarity_desc", "climate_fit"]);

export function filtersFromSearchParams(sp: URLSearchParams): {
  filters: SearchFilters;
  sort: SortKey;
  page: number;
  pageSize: number;
} {
  const filters: SearchFilters = {};
  const q = sp.get("q");
  if (q) filters.q = q;

  for (const key of ARRAY_FILTER_KEYS) {
    const vals = sp.getAll(key);
    if (vals.length) (filters as Record<string, unknown>)[key] = vals;
  }

  const category = sp.get("category");
  if (category) filters.category = category;

  const minPrice = sp.get("min_price");
  if (minPrice) filters.min_price = Number(minPrice);
  const maxPrice = sp.get("max_price");
  if (maxPrice) filters.max_price = Number(maxPrice);

  const inStock = sp.get("in_stock");
  if (inStock === "true") filters.in_stock = true;
  const featured = sp.get("featured");
  if (featured === "true") filters.featured = true;

  // Climate filters
  const hardinessMin = sp.get("hardiness_min");
  if (hardinessMin) filters.hardiness_min = hardinessMin;
  const hardinessMax = sp.get("hardiness_max");
  if (hardinessMax) filters.hardiness_max = hardinessMax;
  const minTempMax = sp.get("min_temp_max");
  if (minTempMax) filters.min_temp_max = Number(minTempMax);
  const climateFitMin = sp.get("climate_fit_min");
  if (climateFitMin) filters.climate_fit_min = Number(climateFitMin);
  const addressId = sp.get("address_id");
  if (addressId) filters.address_id = addressId;

  const rawSort = sp.get("sort") as SortKey | null;
  const sort: SortKey = rawSort && VALID_SORTS.has(rawSort) ? rawSort : "relevance";

  const rawPage = parseInt(sp.get("page") || "1", 10);
  const page = rawPage > 0 ? rawPage : 1;

  const rawPs = parseInt(sp.get("page_size") || "24", 10);
  const pageSize = [12, 24, 48].includes(rawPs) ? rawPs : 24;

  return { filters, sort, page, pageSize };
}

export function filtersToSearchParams(
  filters: SearchFilters,
  sort: SortKey,
  page: number,
  pageSize: number,
): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.q) sp.set("q", filters.q);

  for (const key of ARRAY_FILTER_KEYS) {
    const vals = filters[key] as string[] | undefined;
    if (vals?.length) vals.forEach(v => sp.append(key, v));
  }

  if (filters.category) sp.set("category", filters.category);
  if (filters.min_price != null) sp.set("min_price", filters.min_price.toString());
  if (filters.max_price != null) sp.set("max_price", filters.max_price.toString());
  if (filters.in_stock) sp.set("in_stock", "true");
  if (filters.featured) sp.set("featured", "true");

  // Climate filters
  if (filters.hardiness_min) sp.set("hardiness_min", filters.hardiness_min);
  if (filters.hardiness_max) sp.set("hardiness_max", filters.hardiness_max);
  if (filters.min_temp_max != null) sp.set("min_temp_max", filters.min_temp_max.toString());
  if (filters.climate_fit_min != null) sp.set("climate_fit_min", filters.climate_fit_min.toString());
  if (filters.address_id) sp.set("address_id", filters.address_id);

  if (sort !== "relevance") sp.set("sort", sort);
  if (page > 1) sp.set("page", page.toString());
  if (pageSize !== 24) sp.set("page_size", pageSize.toString());

  return sp;
}

// ── Hook ─────────────────────────────────────────────────────────────

interface UseSearchCatalogOptions {
  initialFilters?: SearchFilters;
  initialSort?: SortKey;
  initialPage?: number;
  initialPageSize?: number;
  debounceMs?: number;
}

export function useSearchCatalog(opts: UseSearchCatalogOptions = {}) {
  const {
    initialFilters = {},
    initialSort = "relevance",
    initialPage = 1,
    initialPageSize = 24,
    debounceMs = 350,
  } = opts;

  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const executeSearch = useCallback(async (
    f: SearchFilters,
    s: SortKey,
    p: number,
    ps: number,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = filtersToSearchParams(f, s, p, ps);
      // Always include sort & page for API
      params.set("sort", s);
      params.set("page", p.toString());
      params.set("page_size", ps.toString());

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-catalog/search?${params}`,
        {
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
          },
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error?.message || `Search failed (${res.status})`);
      }

      const body = await res.json();
      if (controller.signal.aborted) return;

      setResult({
        plants: body.data ?? [],
        pagination: body.pagination ?? { page: 1, page_size: ps, total: 0, total_pages: 0, has_more: false },
        facets: body.facets ?? {},
        highlight_tokens: body.highlight_tokens ?? [],
        query: body.query ?? null,
        relevance_variant: body.relevance_variant ?? "A",
      });
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Trigger search with debounce on query, instant on filters/sort/page
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      executeSearch(filters, sort, page, pageSize);
    }, filters.q ? debounceMs : 0);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, sort, page, pageSize, executeSearch, debounceMs]);

  // Reset page on filter/sort change
  const updateFilters = useCallback((next: SearchFilters | ((prev: SearchFilters) => SearchFilters)) => {
    setFilters(next);
    setPage(1);
  }, []);

  const updateSort = useCallback((next: SortKey) => {
    setSort(next);
    setPage(1);
  }, []);

  const toggleFacetValue = useCallback((facetKey: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const current = (prev[facetKey] as string[] | undefined) ?? [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [facetKey]: next.length ? next : undefined };
    });
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setSort("relevance");
    setPage(1);
  }, []);

  const removeFilter = useCallback((key: keyof SearchFilters, value?: string) => {
    setFilters(prev => {
      const copy = { ...prev };
      if (value && Array.isArray(copy[key])) {
        const arr = (copy[key] as string[]).filter(v => v !== value);
        (copy as Record<string, unknown>)[key] = arr.length ? arr : undefined;
      } else {
        delete copy[key];
      }
      return copy;
    });
    setPage(1);
  }, []);

  return {
    filters,
    sort,
    page,
    pageSize,
    result,
    loading,
    error,
    setFilters: updateFilters,
    setSort: updateSort,
    setPage,
    setPageSize: (ps: number) => { setPageSize(ps); setPage(1); },
    toggleFacetValue,
    clearAllFilters,
    removeFilter,
    setQuery: (q: string) => updateFilters(prev => ({ ...prev, q: q || undefined })),
  };
}
