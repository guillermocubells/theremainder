import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plant } from "@/data/plants";

interface PlantFiltersProps {
  plants: Plant[];
  onFilterChange: (filteredPlants: Plant[]) => void;
  isVisible: boolean;
}

interface FilterState {
  light: string;
  growth: string;
  location: string;
  zone: string;
  stock: string;
  ornamental: string;
  water: string;
}

const PlantFilters = ({ plants, onFilterChange, isVisible }: PlantFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({
    light: "",
    growth: "",
    location: "",
    zone: "",
    stock: "",
    ornamental: "",
    water: ""
  });

  // Get unique values for each filter
  const lightOptions = Array.from(new Set(plants.map(p => p.light))).sort();
  const growthOptions = Array.from(new Set(plants.map(p => p.growthRate))).sort();
  const locationOptions = Array.from(new Set(plants.map(p => p.location))).sort();
  const ornamentalOptions = ['Convencional', 'Bonito', 'Hermoso', 'Impresionante', 'Único'];
  const waterOptions = ['Baja', 'Moderada', 'Alta'];
  
  // Extract unique hardiness zones from plant data
  const zoneOptions = Array.from(new Set(
    plants.flatMap(p => p.hardinessZones || [])
  )).sort((a, b) => a - b);

  const applyFilters = (newFilters: FilterState) => {
    let filtered = plants;

    if (newFilters.light) {
      filtered = filtered.filter(plant => plant.light === newFilters.light);
    }
    if (newFilters.growth) {
      filtered = filtered.filter(plant => plant.growthRate === newFilters.growth);
    }
    if (newFilters.location) {
      filtered = filtered.filter(plant => plant.location === newFilters.location);
    }
    if (newFilters.zone) {
      const zoneNum = parseInt(newFilters.zone, 10);
      filtered = filtered.filter(plant => 
        plant.hardinessZones && plant.hardinessZones.includes(zoneNum)
      );
    }
    if (newFilters.stock) {
      if (newFilters.stock === 'disponible') {
        filtered = filtered.filter(plant => plant.quantity > 0);
      } else if (newFilters.stock === 'agotado') {
        filtered = filtered.filter(plant => plant.quantity === 0);
      }
    }
    if (newFilters.ornamental) {
      filtered = filtered.filter(plant => plant.ornamentalValue === newFilters.ornamental);
    }
    if (newFilters.water) {
      filtered = filtered.filter(plant => plant.waterNeeds === newFilters.water);
    }

    onFilterChange(filtered);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newValue = value === "all" ? "" : value;
    const newFilters = { ...filters, [key]: newValue };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters: FilterState = {
      light: "",
      growth: "",
      location: "",
      zone: "",
      stock: "",
      ornamental: "",
      water: ""
    };
    setFilters(emptyFilters);
    onFilterChange(plants);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  if (!isVisible) return null;

  return (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
      isVisible ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* Stock filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Disponibilidad
            </label>
            <Select value={filters.stock || "all"} onValueChange={(v) => handleFilterChange('stock', v)}>
              <SelectTrigger className="border-green-200 bg-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="agotado">Agotado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Light filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Exposición Solar
            </label>
            <Select value={filters.light || "all"} onValueChange={(v) => handleFilterChange('light', v)}>
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

          {/* Growth rate filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Tasa de Crecimiento
            </label>
            <Select value={filters.growth || "all"} onValueChange={(v) => handleFilterChange('growth', v)}>
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

          {/* Ornamental value filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Valor Ornamental
            </label>
            <Select value={filters.ornamental || "all"} onValueChange={(v) => handleFilterChange('ornamental', v)}>
              <SelectTrigger className="border-green-200 bg-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                <SelectItem value="all">Todas</SelectItem>
                {ornamentalOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Water needs filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Necesidad de Agua
            </label>
            <Select value={filters.water || "all"} onValueChange={(v) => handleFilterChange('water', v)}>
              <SelectTrigger className="border-green-200 bg-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                <SelectItem value="all">Todas</SelectItem>
                {waterOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hardiness zone filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Zona de Rusticidad
            </label>
            <Select value={filters.zone || "all"} onValueChange={(v) => handleFilterChange('zone', v)}>
              <SelectTrigger className="border-green-200 bg-white">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                <SelectItem value="all">Todas</SelectItem>
                {zoneOptions.map(zone => (
                  <SelectItem key={zone} value={zone.toString()}>
                    Zona {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Ubicación
            </label>
            <Select value={filters.location || "all"} onValueChange={(v) => handleFilterChange('location', v)}>
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
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Filtros activos:</span>
            {filters.stock && (
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full">
                {filters.stock === 'disponible' ? 'Disponible' : 'Agotado'}
              </span>
            )}
            {filters.light && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                {filters.light}
              </span>
            )}
            {filters.growth && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {filters.growth}
              </span>
            )}
            {filters.ornamental && (
              <span className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full">
                {filters.ornamental}
              </span>
            )}
            {filters.water && (
              <span className="bg-cyan-100 text-cyan-800 text-xs px-2 py-1 rounded-full">
                Agua: {filters.water}
              </span>
            )}
            {filters.zone && (
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                Zona {filters.zone}
              </span>
            )}
            {filters.location && (
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                {filters.location}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantFilters;
