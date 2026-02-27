import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search, X, SlidersHorizontal, ChevronDown, Package, Leaf, Sparkles, ArrowUpDown,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO } from "@/components/seo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useSearchCatalog, SearchPlant, FacetBuckets, SortKey,
} from "@/hooks/useSearchCatalog";
import { useIsMobile } from "@/hooks/use-mobile";
import { OptimizedImage } from "@/components/ui/optimized-image";

// ── Sort options ─────────────────────────────────────────────────────
const SORT_OPTIONS: { key: SortKey; label_es: string }[] = [
  { key: "relevance", label_es: "Relevancia" },
  { key: "price_asc", label_es: "Precio: menor" },
  { key: "price_desc", label_es: "Precio: mayor" },
  { key: "newest", label_es: "Más recientes" },
  { key: "name_asc", label_es: "Nombre A-Z" },
  { key: "rarity_desc", label_es: "Más raro" },
];

// ── Facet labels ─────────────────────────────────────────────────────
const FACET_LABELS: Record<string, string> = {
  plant_type: "Tipo de planta",
  difficulty: "Dificultad",
  rarity: "Rareza",
  water: "Riego",
  humidity: "Humedad",
  exposure: "Exposición",
  climate_zones: "Zona climática",
  hardiness_zones: "Zona de rusticidad",
  plant_use: "Uso",
};

// Map facet keys to filter param keys
const FACET_TO_FILTER: Record<string, string> = {
  plant_type: "plant_type",
  difficulty: "difficulty",
  rarity: "rarity",
  water: "water",
  humidity: "humidity",
  exposure: "exposure",
  climate_zones: "climate_zone",
  hardiness_zones: "hardiness_zone",
  plant_use: "plant_use",
};

// ── PAGE_SIZE options ────────────────────────────────────────────────
const PAGE_SIZES = [12, 24, 48];

// ── SearchResultCard ─────────────────────────────────────────────────
function SearchResultCard({ plant, highlight }: { plant: SearchPlant; highlight: string[] }) {
  const imgSrc =
    plant.primary_image ||
    (plant.product_images && plant.product_images[0]) ||
    (plant.images && plant.images[0]) ||
    "/placeholder.svg";

  const displayPrice = plant.sale_price ?? plant.price;
  const hasDiscount = plant.sale_price != null && plant.sale_price < plant.price;

  // Highlight text helper
  function highlightText(text: string): React.ReactNode {
    if (!highlight.length || !text) return text;
    const regex = new RegExp(`(${highlight.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-warning/30 text-foreground rounded-sm px-0.5">{part}</mark>
      ) : part
    );
  }

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
            {highlightText(plant.name)}
          </h3>
          {plant.scientific_name && (
            <p className="text-xs text-muted-foreground italic line-clamp-1">
              {highlightText(plant.scientific_name)}
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
              <span className="text-[10px] text-warning-muted-foreground font-medium">
                ¡Quedan {plant.stock_qty}!
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ── FacetSection ─────────────────────────────────────────────────────
function FacetSection({
  facetKey,
  buckets,
  selected,
  onToggle,
}: {
  facetKey: string;
  buckets: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(selected.length > 0);
  const label = FACET_LABELS[facetKey] || facetKey;
  const entries = Object.entries(buckets)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border pb-3">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
        <span className="flex items-center gap-2">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-[20px] text-[10px] px-1.5">
              {selected.length}
            </Badge>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1.5 pt-1">
        {entries.map(([value, count]) => {
          const isSelected = selected.includes(value);
          return (
            <label
              key={value}
              className="flex items-center gap-2 cursor-pointer text-sm py-0.5 hover:text-foreground text-muted-foreground"
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(value)}
                className="h-4 w-4"
              />
              <span className="flex-1 capitalize">{value.replace(/_/g, " ")}</span>
              <span className="text-xs text-muted-foreground/60">{count}</span>
            </label>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── ActiveFilterChips ────────────────────────────────────────────────
function ActiveFilterChips({
  filters,
  onRemove,
  onClear,
}: {
  filters: Record<string, string[]>;
  onRemove: (key: string, value: string) => void;
  onClear: () => void;
}) {
  const allChips = Object.entries(filters).flatMap(([key, values]) =>
    values.map(v => ({ key, value: v }))
  );

  if (allChips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {allChips.map(({ key, value }) => (
        <Badge
          key={`${key}-${value}`}
          variant="secondary"
          className="gap-1 pr-1 capitalize cursor-pointer hover:bg-destructive/10 transition-colors"
          onClick={() => onRemove(key, value)}
        >
          <span className="text-xs">{value.replace(/_/g, " ")}</span>
          <X className="h-3 w-3" />
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onClear} className="h-6 text-xs text-muted-foreground hover:text-destructive">
        Borrar todo
      </Button>
    </div>
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

// ── Main Page ────────────────────────────────────────────────────────

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const initialQuery = searchParams.get("q") || "";

  const {
    filters, sort, page, pageSize, result, loading, error,
    setFilters, setSort, setPage, setPageSize, toggleFacetValue,
    clearAllFilters, removeFilter, setQuery,
  } = useSearchCatalog({ initialPageSize: 24 });

  // Set initial query from URL
  useState(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  });

  const facets = result?.facets ?? {};
  const plants = result?.plants ?? [];
  const pagination = result?.pagination;
  const highlightTokens = result?.highlight_tokens ?? [];

  // Collect active array filters for chips
  const activeArrayFilters = useMemo(() => {
    const result: Record<string, string[]> = {};
    const arrayKeys = ["plant_type", "difficulty", "rarity", "water", "humidity", "exposure", "climate_zone", "hardiness_zone", "plant_use"] as const;
    for (const k of arrayKeys) {
      const v = filters[k as keyof typeof filters];
      if (Array.isArray(v) && v.length > 0) {
        result[k] = v as string[];
      }
    }
    return result;
  }, [filters]);

  const handleRemoveChip = (key: string, value: string) => {
    removeFilter(key as keyof typeof filters, value);
  };

  // ── Sidebar facets ─────────────────────────────────────────────────
  const facetSidebar = (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </h2>
        {Object.keys(activeArrayFilters).length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs text-muted-foreground">
            Limpiar
          </Button>
        )}
      </div>

      {/* Price range */}
      <div className="border-b border-border pb-3 space-y-2">
        <span className="text-sm font-medium text-foreground">Precio (€)</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Mín"
            className="h-8 text-xs"
            value={filters.min_price ?? ""}
            onChange={e => {
              const v = e.target.value ? parseFloat(e.target.value) : undefined;
              setFilters(prev => ({ ...prev, min_price: v }));
            }}
          />
          <span className="text-muted-foreground text-xs">—</span>
          <Input
            type="number"
            placeholder="Máx"
            className="h-8 text-xs"
            value={filters.max_price ?? ""}
            onChange={e => {
              const v = e.target.value ? parseFloat(e.target.value) : undefined;
              setFilters(prev => ({ ...prev, max_price: v }));
            }}
          />
        </div>
      </div>

      {/* Dynamic facets from backend */}
      {Object.entries(facets).map(([facetKey, buckets]) => {
        const filterKey = FACET_TO_FILTER[facetKey] || facetKey;
        const selected = (filters[filterKey as keyof typeof filters] as string[] | undefined) ?? [];
        return (
          <FacetSection
            key={facetKey}
            facetKey={facetKey}
            buckets={buckets}
            selected={selected}
            onToggle={(value) => toggleFacetValue(filterKey as keyof typeof filters, value)}
          />
        );
      })}

      {/* Stock filter */}
      <div className="border-b border-border pb-3 pt-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          <Checkbox
            checked={filters.in_stock === true}
            onCheckedChange={(checked) =>
              setFilters(prev => ({ ...prev, in_stock: checked ? true : undefined }))
            }
            className="h-4 w-4"
          />
          <Package className="h-3.5 w-3.5" />
          Solo disponibles
        </label>
      </div>
    </div>
  );

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

        {/* Active filter chips */}
        <ActiveFilterChips
          filters={activeArrayFilters}
          onRemove={handleRemoveChip}
          onClear={clearAllFilters}
        />

        {/* Toolbar: results count, sort, page size, mobile filter toggle */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="gap-1.5 h-8"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
                {Object.keys(activeArrayFilters).length > 0 && (
                  <Badge variant="secondary" className="h-4 min-w-[16px] text-[10px] px-1">
                    {Object.values(activeArrayFilters).flat().length}
                  </Badge>
                )}
              </Button>
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
          {/* Desktop sidebar */}
          {!isMobile && (
            <aside className="w-56 shrink-0 hidden md:block">
              {facetSidebar}
            </aside>
          )}

          {/* Mobile filters drawer */}
          {isMobile && showMobileFilters && (
            <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Filtros</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {facetSidebar}
              <div className="sticky bottom-0 pt-4 pb-2 bg-background">
                <Button className="w-full" onClick={() => setShowMobileFilters(false)}>
                  Ver {pagination?.total ?? 0} resultados
                </Button>
              </div>
            </div>
          )}

          {/* Results grid */}
          <div className="flex-1 min-w-0">
            {error && (
              <div className="text-center py-8">
                <p className="text-destructive text-sm">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setQuery(filters.q || "")}>
                  Reintentar
                </Button>
              </div>
            )}

            {loading && !error && (
              <ResultsSkeleton count={pageSize} />
            )}

            {!loading && !error && plants.length === 0 && (
              <div className="text-center py-16">
                <Leaf className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Sin resultados</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No encontramos plantas con estos criterios.
                </p>
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Borrar filtros
                </Button>
              </div>
            )}

            {!loading && !error && plants.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {plants.map(plant => (
                    <SearchResultCard
                      key={plant.id}
                      plant={plant}
                      highlight={highlightTokens}
                    />
                  ))}
                </div>

                {/* Pagination */}
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
                          <PaginationItem key={`e-${i}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
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
