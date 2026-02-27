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
  category?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  featured?: boolean;
}

export type SortKey = "relevance" | "price_asc" | "price_desc" | "newest" | "name_asc" | "rarity_desc";

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

// ── Hook ─────────────────────────────────────────────────────────────

interface UseSearchCatalogOptions {
  initialPageSize?: number;
  debounceMs?: number;
}

export function useSearchCatalog(opts: UseSearchCatalogOptions = {}) {
  const { initialPageSize = 24, debounceMs = 350 } = opts;

  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<SortKey>("relevance");
  const [page, setPage] = useState(1);
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
      // Build URL params
      const params = new URLSearchParams();
      if (f.q) params.set("q", f.q);
      f.plant_type?.forEach(v => params.append("plant_type", v));
      f.difficulty?.forEach(v => params.append("difficulty", v));
      f.rarity?.forEach(v => params.append("rarity", v));
      f.water?.forEach(v => params.append("water", v));
      f.humidity?.forEach(v => params.append("humidity", v));
      f.exposure?.forEach(v => params.append("exposure", v));
      f.climate_zone?.forEach(v => params.append("climate_zone", v));
      f.hardiness_zone?.forEach(v => params.append("hardiness_zone", v));
      f.plant_use?.forEach(v => params.append("plant_use", v));
      if (f.category) params.set("category", f.category);
      if (f.min_price != null) params.set("min_price", f.min_price.toString());
      if (f.max_price != null) params.set("max_price", f.max_price.toString());
      if (f.in_stock !== undefined) params.set("in_stock", f.in_stock.toString());
      if (f.featured) params.set("featured", "true");
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
    // State
    filters,
    sort,
    page,
    pageSize,
    result,
    loading,
    error,
    // Actions
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
