
import { useState } from "react";
import PlantCard from "./PlantCard";
import PlantSearchEngine from "./PlantSearchEngine";
import { Plant } from "@/data/plants";
import { PlantGridSkeleton } from "./PlantGridSkeleton";
import { useCatalogPlants } from "@/hooks/useCatalogPlants";

const PlantsGrid = () => {
  const { plants, loading } = useCatalogPlants();
  const [filteredPlants, setFilteredPlants] = useState<Plant[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleFilteredPlantsChange = (newFilteredPlants: Plant[]) => {
    setFilteredPlants(newFilteredPlants);
    setIsSearching(false);
  };

  const displayPlants = filteredPlants ?? plants;

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
        <PlantSearchEngine 
          plants={plants} 
          onFilteredPlantsChange={handleFilteredPlantsChange}
          onSearchStart={() => setIsSearching(true)}
        />
        {isSearching ? (
          <PlantGridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {displayPlants.map(plant => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        )}
        {!isSearching && displayPlants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-2">No se encontraron plantas</p>
            <p className="text-sm text-muted-foreground/70">Intenta con términos diferentes o desactiva la búsqueda IA</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default PlantsGrid;
