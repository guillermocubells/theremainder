import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import PlantCard from "./PlantCard";
import PlantSearchEngine from "./PlantSearchEngine";
import CategoryCards from "./CategoryCards";
import { Plant } from "@/data/plants";
import { PlantGridSkeleton } from "./PlantGridSkeleton";
import { useCatalogPlants } from "@/hooks/useCatalogPlants";
import { Loader2 } from "lucide-react";

const BATCH_SIZE = 12;

const PlantsGrid = () => {
  const { plants, loading } = useCatalogPlants();
  const [filteredPlants, setFilteredPlants] = useState<Plant[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleFilteredPlantsChange = useCallback((newFilteredPlants: Plant[]) => {
    setFilteredPlants(newFilteredPlants);
    setIsSearching(false);
    setVisibleCount(BATCH_SIZE);
  }, []);

  // Hide out-of-stock plants from catalog listing (detail page remains accessible via URL/SEO)
  const inStockPlants = useMemo(() => plants.filter((p) => (p.quantity ?? 0) > 0), [plants]);
  const basePlants = filteredPlants
    ? filteredPlants.filter((p) => (p.quantity ?? 0) > 0)
    : inStockPlants;
  const displayPlants = selectedCategory
    ? basePlants.filter((p) => p.plantGroup === getCategoryName(selectedCategory, inStockPlants))
    : basePlants;

  const visiblePlants = useMemo(
    () => displayPlants.slice(0, visibleCount),
    [displayPlants, visibleCount]
  );

  const hasMore = visibleCount < displayPlants.length;

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, displayPlants.length));
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, displayPlants.length]);

  // Reset visible count when category changes
  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    setVisibleCount(BATCH_SIZE);
  };

  if (loading) {
    return (
      <section className="py-8 sm:py-12 lg:py-16 px-4 bg-white/40">
        <div className="container mx-auto">
          <PlantGridSkeleton count={6} />
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-12 lg:py-16 px-4 bg-white/40">
      <div className="container mx-auto">
        <CategoryCards
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategoryChange}
        />
        <PlantSearchEngine
          plants={inStockPlants}
          onFilteredPlantsChange={handleFilteredPlantsChange}
          onSearchStart={() => setIsSearching(true)}
        />

        {/* Results count */}
        {!isSearching && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {displayPlants.length} {displayPlants.length === 1 ? "planta" : "plantas"}
            </p>
          </div>
        )}

        {isSearching ? (
          <PlantGridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {visiblePlants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isSearching && displayPlants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-2">No se encontraron plantas</p>
            <p className="text-sm text-muted-foreground/70">Intenta con términos diferentes o desactiva la búsqueda IA</p>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && !isSearching && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </section>
  );
};

function getCategoryName(slug: string, plants: Plant[]): string {
  const groups = Array.from(new Set(plants.map((p) => p.plantGroup).filter(Boolean))) as string[];
  const match = groups.find(
    (g) =>
      g
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") === slug
  );
  return match || slug;
}

export default PlantsGrid;
