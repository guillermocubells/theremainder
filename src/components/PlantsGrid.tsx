import { useState, useMemo } from "react";
import PlantCard from "./PlantCard";
import PlantSearchEngine from "./PlantSearchEngine";
import CategoryCards from "./CategoryCards";
import { Plant } from "@/data/plants";
import { PlantGridSkeleton } from "./PlantGridSkeleton";
import { useCatalogPlants } from "@/hooks/useCatalogPlants";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [12, 24, 48];
const DEFAULT_PAGE_SIZE = 12;

const PlantsGrid = () => {
  const { plants, loading } = useCatalogPlants();
  const [filteredPlants, setFilteredPlants] = useState<Plant[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const handleFilteredPlantsChange = (newFilteredPlants: Plant[]) => {
    setFilteredPlants(newFilteredPlants);
    setIsSearching(false);
    setCurrentPage(1); // Reset page on filter change
  };

  // Apply category filter on top of search/filter results
  const basePlants = filteredPlants ?? plants;
  const displayPlants = selectedCategory
    ? basePlants.filter((p) => p.plantGroup === getCategoryName(selectedCategory, plants))
    : basePlants;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(displayPlants.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPlants = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return displayPlants.slice(start, start + pageSize);
  }, [displayPlants, safeCurrentPage, pageSize]);

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(parseInt(size));
    setCurrentPage(1);
  };

  // Generate page numbers to show
  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(totalPages - 1, safeCurrentPage + 1); i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
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
          plants={plants} 
          onFilteredPlantsChange={handleFilteredPlantsChange}
          onSearchStart={() => setIsSearching(true)}
        />

        {/* Results count + page size */}
        {!isSearching && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {displayPlants.length} {displayPlants.length === 1 ? "planta" : "plantas"}
              {totalPages > 1 && (
                <span className="ml-1">
                  · Página {safeCurrentPage} de {totalPages}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Mostrar</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isSearching ? (
          <PlantGridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {paginatedPlants.map(plant => (
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

        {/* Pagination */}
        {!isSearching && totalPages > 1 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (safeCurrentPage > 1) setCurrentPage(safeCurrentPage - 1);
                  }}
                  className={safeCurrentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {getVisiblePages().map((page, i) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`e-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === safeCurrentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (safeCurrentPage < totalPages) setCurrentPage(safeCurrentPage + 1);
                  }}
                  className={safeCurrentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </section>
  );
};

// Helper: category slug → plantGroup name mapping
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
