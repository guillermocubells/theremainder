import { useState, useMemo, useCallback } from "react";
import { X } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plant } from "@/data/plants";
import { HARDINESS_ZONES, getShortZoneLabel } from "@/utils/hardinessZones";

interface PlantFiltersProps {
  plants: Plant[];
  onFilterChange: (filteredPlants: Plant[]) => void;
  isVisible: boolean;
}

interface FilterState {
  plantGroup: string;
  light: string;
  growth: string;
  location: string;
  zone: string;
  stock: string;
  ornamental: string;
  water: string;
}

const INITIAL_FILTERS: FilterState = {
  plantGroup: "",
  light: "",
  growth: "",
  location: "",
  zone: "",
  stock: "",
  ornamental: "",
  water: ""
};

const PLANT_GROUP_OPTIONS = [
  'Palmeras', 'Helechos arbóreos', 'Cícadas', 'Árboles ornamentales', 
  'Arbustos ornamentales', 'Bambús', 'Hierbas', 'Bromeliáceas', 
  'Heliconias', 'Estrelicias', 'Jengibres', 'Plátanos', 
  'Agaves y yucas', 'Aráceas', 'Suculentas', 'Cactus', 'Coníferas', 'Perennes'
];

const ORNAMENTAL_OPTIONS = ['Convencional', 'Bonito', 'Hermoso', 'Impresionante', 'Único'];
const WATER_OPTIONS = ['Baja', 'Moderada', 'Alta'];

const PlantFilters = ({ plants, onFilterChange, isVisible }: PlantFiltersProps) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // Memoize derived options
  const { lightOptions, growthOptions, locationOptions } = useMemo(() => ({
    lightOptions: Array.from(new Set(plants.map(p => p.light))).sort(),
    growthOptions: Array.from(new Set(plants.map(p => p.growthRate))).sort(),
    locationOptions: Array.from(new Set(plants.map(p => p.location))).sort()
  }), [plants]);

  const applyFilters = useCallback((newFilters: FilterState) => {
    let filtered = plants;

    if (newFilters.plantGroup) {
      filtered = filtered.filter(plant => plant.plantGroup === newFilters.plantGroup);
    }
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
      filtered = filtered.filter(plant => 
        plant.hardinessZones && plant.hardinessZones.includes(newFilters.zone)
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
  }, [plants, onFilterChange]);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    const newValue = value === "all" ? "" : value;
    const newFilters = { ...filters, [key]: newValue };
    setFilters(newFilters);
    applyFilters(newFilters);
  }, [filters, applyFilters]);

  const clearAllFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    onFilterChange(plants);
  }, [onFilterChange, plants]);

  const hasActiveFilters = useMemo(() => 
    Object.values(filters).some(v => v !== ""),
  [filters]);

  const activeFilterTags = useMemo(() => {
    const tags: Array<{ key: string; label: string; color: string }> = [];
    
    if (filters.plantGroup) {
      tags.push({ key: 'plantGroup', label: filters.plantGroup, color: 'bg-green-100 text-green-800' });
    }
    if (filters.stock) {
      tags.push({ 
        key: 'stock', 
        label: filters.stock === 'disponible' ? t('filters.available') : t('filters.outOfStock'), 
        color: 'bg-emerald-100 text-emerald-800' 
      });
    }
    if (filters.light) {
      tags.push({ key: 'light', label: filters.light, color: 'bg-yellow-100 text-yellow-800' });
    }
    if (filters.growth) {
      tags.push({ key: 'growth', label: filters.growth, color: 'bg-blue-100 text-blue-800' });
    }
    if (filters.ornamental) {
      tags.push({ key: 'ornamental', label: filters.ornamental, color: 'bg-pink-100 text-pink-800' });
    }
    if (filters.water) {
      tags.push({ key: 'water', label: `${t('filters.water')}: ${filters.water}`, color: 'bg-cyan-100 text-cyan-800' });
    }
    if (filters.zone) {
      tags.push({ key: 'zone', label: getShortZoneLabel(filters.zone), color: 'bg-orange-100 text-orange-800' });
    }
    if (filters.location) {
      tags.push({ key: 'location', label: filters.location, color: 'bg-purple-100 text-purple-800' });
    }
    
    return tags;
  }, [filters, t]);

  if (!isVisible) return null;

  const filterConfigs = [
    { key: 'plantGroup' as const, label: t('filters.plantGroup'), options: PLANT_GROUP_OPTIONS },
    { key: 'stock' as const, label: t('filters.availability'), options: [
      { value: 'disponible', label: t('filters.available') },
      { value: 'agotado', label: t('filters.outOfStock') }
    ]},
    { key: 'light' as const, label: t('filters.sunExposure'), options: lightOptions },
    { key: 'growth' as const, label: t('filters.growthRate'), options: growthOptions },
    { key: 'ornamental' as const, label: t('filters.ornamentalValue'), options: ORNAMENTAL_OPTIONS },
    { key: 'water' as const, label: t('filters.waterNeeds'), options: WATER_OPTIONS },
    { key: 'zone' as const, label: t('filters.hardinessZone'), options: HARDINESS_ZONES.map(z => ({ value: z.code, label: z.label })) },
    { key: 'location' as const, label: t('filters.location'), options: locationOptions }
  ];

  return (
    <div className="overflow-hidden transition-all duration-300 ease-in-out max-h-[600px] opacity-100">
      <div className="bg-white/80 backdrop-blur-sm border border-green-200 rounded-lg p-4 mb-4">
        {/* Header with clear button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-end mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              {t('filters.clearFilters')}
            </Button>
          </div>
        )}

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filterConfigs.map(({ key, label, options }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 block">
                {label}
              </label>
              <Select 
                value={filters[key] || "all"} 
                onValueChange={(v) => handleFilterChange(key, v)}
              >
                <SelectTrigger className="h-9 border-gray-200 bg-white text-sm">
                  <SelectValue placeholder={t('filters.all')} />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-50 max-h-[300px]">
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  {Array.isArray(options) && options.map((option) => {
                    const value = typeof option === 'string' ? option : option.value;
                    const optionLabel = typeof option === 'string' ? option : option.label;
                    return (
                      <SelectItem key={value} value={value}>
                        {optionLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && activeFilterTags.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">{t('filters.activeFilters')}:</span>
            {activeFilterTags.map(({ key, label, color }) => (
              <span 
                key={key} 
                className={`${color} text-xs px-2.5 py-1 rounded-full font-medium`}
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantFilters;
