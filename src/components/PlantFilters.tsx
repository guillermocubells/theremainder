import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plant } from "@/data/plants";

interface PlantFiltersProps {
  plants: Plant[];
  onFilterChange: (filteredPlants: Plant[]) => void;
  isVisible: boolean;
}

const PlantFilters = ({ plants, onFilterChange, isVisible }: PlantFiltersProps) => {
  const [lightFilter, setLightFilter] = useState<string>("");
  const [growthFilter, setGrowthFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [zoneFilter, setZoneFilter] = useState<string>("");

  // Get unique values for each filter
  const lightOptions = Array.from(new Set(plants.map(p => p.light))).sort();
  const growthOptions = Array.from(new Set(plants.map(p => p.growthRate))).sort();
  const locationOptions = Array.from(new Set(plants.map(p => p.location))).sort();
  
  // Extract unique hardiness zones from plant data
  const zoneOptions = Array.from(new Set(
    plants.flatMap(p => p.hardinessZones || [])
  )).sort((a, b) => a - b);

  const applyFilters = (light: string, growth: string, location: string, zone: string) => {
    let filtered = plants;

    if (light) {
      filtered = filtered.filter(plant => plant.light === light);
    }
    if (growth) {
      filtered = filtered.filter(plant => plant.growthRate === growth);
    }
    if (location) {
      filtered = filtered.filter(plant => plant.location === location);
    }
    if (zone) {
      const zoneNum = parseInt(zone, 10);
      filtered = filtered.filter(plant => 
        plant.hardinessZones && plant.hardinessZones.includes(zoneNum)
      );
    }

    onFilterChange(filtered);
  };

  const handleLightChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setLightFilter(newValue);
    applyFilters(newValue, growthFilter, locationFilter, zoneFilter);
  };

  const handleGrowthChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setGrowthFilter(newValue);
    applyFilters(lightFilter, newValue, locationFilter, zoneFilter);
  };

  const handleLocationChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setLocationFilter(newValue);
    applyFilters(lightFilter, growthFilter, newValue, zoneFilter);
  };

  const handleZoneChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setZoneFilter(newValue);
    applyFilters(lightFilter, growthFilter, locationFilter, newValue);
  };

  const clearAllFilters = () => {
    setLightFilter("");
    setGrowthFilter("");
    setLocationFilter("");
    setZoneFilter("");
    onFilterChange(plants);
  };

  const hasActiveFilters = lightFilter || growthFilter || locationFilter || zoneFilter;

  if (!isVisible) return null;

  return (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
      isVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
    }`}>
      <div className="bg-white/80 backdrop-blur-sm border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-end mb-3">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Exposición Solar
            </label>
            <Select value={lightFilter || "all"} onValueChange={handleLightChange}>
              <SelectTrigger className="border-green-200 bg-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                <SelectItem value="all">Todas</SelectItem>
                {lightOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Velocidad de Crecimiento
            </label>
            <Select value={growthFilter || "all"} onValueChange={handleGrowthChange}>
              <SelectTrigger className="border-green-200 bg-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                <SelectItem value="all">Todas</SelectItem>
                {growthOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Ubicación Recomendada
            </label>
            <Select value={locationFilter || "all"} onValueChange={handleLocationChange}>
              <SelectTrigger className="border-green-200 bg-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                <SelectItem value="all">Todas</SelectItem>
                {locationOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Zona de Rusticidad
            </label>
            <Select value={zoneFilter || "all"} onValueChange={handleZoneChange}>
              <SelectTrigger className="border-green-200 bg-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                <SelectItem value="all">Todas las zonas</SelectItem>
                {zoneOptions.map(zone => (
                  <SelectItem key={zone} value={zone.toString()}>
                    Zona {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Filtros activos:</span>
            {lightFilter && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Luz: {lightFilter}
              </span>
            )}
            {growthFilter && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                Crecimiento: {growthFilter}
              </span>
            )}
            {locationFilter && (
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                Ubicación: {locationFilter}
              </span>
            )}
            {zoneFilter && (
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                Zona {zoneFilter}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantFilters;
