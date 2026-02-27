import { useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search, X, Sparkles, ArrowUpDown,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO } from "@/components/seo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  useSearchCatalog, SearchPlant, SortKey, SearchFilters,
  filtersFromSearchParams, filtersToSearchParams,
} from "@/hooks/useSearchCatalog";
import { useIsMobile } from "@/hooks/use-mobile";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { ActiveFilterChips, FacetSidebar, MobileFacetDrawer } from "@/components/search";
import ZeroResultsRecovery from "@/components/search/ZeroResultsRecovery";
import { useHighlight } from "@/utils/highlightText";

// ── Sort options ─────────────────────────────────────────────────────
const SORT_OPTIONS: { key: SortKey; label_es: string }[] = [
  { key: "relevance", label_es: "Relevancia" },
  { key: "price_asc", label_es: "Precio: menor" },
  { key: "price_desc", label_es: "Precio: mayor" },
  { key: "newest", label_es: "Más recientes" },
  { key: "name_asc", label_es: "Nombre A-Z" },
  { key: "rarity_desc", label_es: "Más raro" },
];

const PAGE_SIZES = [12, 24, 48];

// ── SearchResultCard ─────────────────────────────────────────────────
function SearchResultCard({ plant, hl }: { plant: SearchPlant; hl: (text: string | null | undefined) => React.ReactNode }) {
  const imgSrc =
    plant.primary_image ||
    (plant.product_images && plant.product_images[0]) ||
    (plant.images && plant.images[0]) ||
    "/placeholder.svg";

  const displayPrice = plant.sale_price ?? plant.price;
  const hasDiscount = plant.sale_price != null && plant.sale_price < plant.price;

  return (
    <Link to={`/plant/${plant.slug}`} className="group">
      <Card className="overflow-hidden border-border hover:shadow-md transition-shadow h-full">
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          <OptimizedImage
            src={imgSrc}
            alt={plant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {plant.is_featured && (
            <Badge className="absolute top-2 left-2 bg-warning text-warning-foreground text-[10px]">
              <Sparkles className="h-3 w-3 mr-1" /> Destacado
            </Badge>
          )}
          {plant.stock_qty <= 0 && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">Agotado</span>
            </div>
          )}
        </div>
        <CardContent className="p-3 sm:p-4 space-y-1.5">
          <h3 className="font-semibold text-sm leading-tight line-clamp-1 text-foreground">
            {hl(plant.name)}
          </h3>
          {(plant.scientific_name || plant.common_name) && (
            <p className="text-xs text-muted-foreground italic line-clamp-1">
              {hl(plant.common_name || plant.scientific_name)}
            </p>
          )}
          {plant.short_description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {hl(plant.short_description)}
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-foreground">
                {displayPrice.toFixed(2)}€
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through">
                  {plant.price.toFixed(2)}€
                </span>
              )}
            </div>
            {plant.stock_qty > 0 && plant.stock_qty <= 3 && (
              <span className="text-[10px] text-muted-foreground font-medium">
                ¡Quedan {plant.stock_qty}!
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ── ResultsSkeleton ──────────────────────────────────────────────────
function ResultsSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-border">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <CardContent className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-5 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Pagination helper ────────────────────────────────────────────────
function getVisiblePages(current: number, total: number): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("ellipsis");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push("ellipsis");
    pages.push(total);
  }
  return pages;
}

const ARRAY_FILTER_KEYS = [
  "plant_type", "difficulty", "rarity", "water", "humidity",
  "exposure", "climate_zone", "hardiness_zone", "plant_use",
  "tags", "origin_country",
] as const;

// ── Main Page ────────────────────────────────────────────────────────

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  // Hydrate initial state from URL
  const initial = useMemo(() => filtersFromSearchParams(searchParams), []);// eslint-disable-line react-hooks/exhaustive-deps

  const {
    filters, sort, page, pageSize, result, loading, error,
    setFilters, setSort, setPage, setPageSize, toggleFacetValue,
    clearAllFilters, removeFilter, setQuery,
  } = useSearchCatalog({
    initialFilters: initial.filters,
    initialSort: initial.sort,
    initialPage: initial.page,
    initialPageSize: initial.pageSize,
  });

  // Write state changes back to URL (replace, no history spam)
  const isFirstSync = useRef(true);
  useEffect(() => {
    if (isFirstSync.current) { isFirstSync.current = false; return; }
    const next = filtersToSearchParams(filters, sort, page, pageSize);
    setSearchParams(next, { replace: true });
  }, [filters, sort, page, pageSize, setSearchParams]);

  const facets = result?.facets ?? {};
  const plants = result?.plants ?? [];
  const pagination = result?.pagination;
  const highlightTokens = result?.highlight_tokens ?? [];

  const hl = useHighlight(highlightTokens);

  const activeArrayFilters = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const k of ARRAY_FILTER_KEYS) {
      const v = filters[k as keyof SearchFilters];
      if (Array.isArray(v) && v.length > 0) out[k] = v as string[];
    }
    return out;
  }, [filters]);

  const activeCount = useMemo(
    () => Object.values(activeArrayFilters).flat().length,
    [activeArrayFilters]
  );

  const handleRemoveChip = useCallback(
    (key: string, value: string) => removeFilter(key as keyof SearchFilters, value),
    [removeFilter]
  );

  const handleClearFacet = useCallback(
    (facetKey: keyof SearchFilters) => {
      setFilters(prev => { const copy = { ...prev }; delete copy[facetKey]; return copy; });
    },
    [setFilters]
  );

  const facetSidebarProps = {
    facets, filters, activeCount,
    onToggleFacet: toggleFacetValue,
    onClearFacet: handleClearFacet,
    onClearAll: clearAllFilters,
    onSetFilters: setFilters,
  };

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title={`Buscar${filters.q ? `: ${filters.q}` : ""} — Catálogo`}
        description="Busca plantas exóticas en nuestro catálogo. Filtra por tipo, dificultad, rareza y más."
        path="/search"
      />
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar plantas por nombre, especie, tipo..."
            className="pl-10 pr-10 h-11 text-sm bg-card border-border"
            value={filters.q || ""}
            onChange={e => setQuery(e.target.value)}
          />
          {filters.q && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <ActiveFilterChips filters={activeArrayFilters} onRemove={handleRemoveChip} onClear={clearAllFilters} />

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {isMobile && (
              <MobileFacetDrawer {...facetSidebarProps} totalResults={pagination?.total ?? 0} />
            )}
            <p className="text-sm text-muted-foreground">
              {loading ? (
                <Skeleton className="h-4 w-24 inline-block" />
              ) : (
                <>
                  {pagination?.total ?? 0} resultado{(pagination?.total ?? 0) !== 1 ? "s" : ""}
                  {filters.q && (
                    <span className="ml-1">
                      para &ldquo;<span className="font-medium text-foreground">{filters.q}</span>&rdquo;
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-8 w-[150px] text-xs gap-1">
                <ArrowUpDown className="h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => (
                  <SelectItem key={o.key} value={o.key} className="text-xs">{o.label_es}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pageSize.toString()} onValueChange={v => setPageSize(parseInt(v))}>
              <SelectTrigger className="h-8 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (
                  <SelectItem key={s} value={s.toString()} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Layout: sidebar + results */}
        <div className="flex gap-6">
          {!isMobile && (
            <aside className="w-56 shrink-0 hidden md:block">
              <FacetSidebar {...facetSidebarProps} />
            </aside>
          )}

          <div className="flex-1 min-w-0">
            {error && (
              <div className="text-center py-8">
                <p className="text-destructive text-sm">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setQuery(filters.q || "")}>
                  Reintentar
                </Button>
              </div>
            )}

            {loading && !error && <ResultsSkeleton count={pageSize} />}

            {!loading && !error && plants.length === 0 && (
              <ZeroResultsRecovery
                query={filters.q}
                activeFilterCount={activeCount}
                onClearFilters={clearAllFilters}
                onSuggestedQuery={setQuery}
              />
            )}

            {!loading && !error && plants.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {plants.map(plant => (
                    <SearchResultCard key={plant.id} plant={plant} hl={hl} />
                  ))}
                </div>

                {pagination && pagination.total_pages > 1 && (
                  <Pagination className="mt-8">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={e => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                          className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {getVisiblePages(page, pagination.total_pages).map((p, i) =>
                        p === "ellipsis" ? (
                          <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                        ) : (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={p === page}
                              onClick={e => { e.preventDefault(); setPage(p); }}
                              className="cursor-pointer"
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={e => { e.preventDefault(); if (page < pagination.total_pages) setPage(page + 1); }}
                          className={page >= pagination.total_pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SearchResults;
