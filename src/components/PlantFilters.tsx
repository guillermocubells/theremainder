import { useState, useMemo, useCallback, useEffect } from "react";
import { X, Leaf, ShoppingBag, Sun, Droplets, Thermometer, MapPin, TreeDeciduous, Package, ArrowUpDown, FolderTree } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plant } from "@/data/plants";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PlantFiltersProps {
  plants: Plant[];
  onFilterChange: (filteredPlants: Plant[], sortKey?: string, filterSummary?: Record<string, string>) => void;
  isVisible: boolean;
}

interface FilterState {
  // Habitat filters
  light: string;
  water: string;
  zone: string;
  climate: string;
  // Commercial filters
  category: string;
  plantGroup: string;
  stock: string;
  sortBy: string;
}

const INITIAL_FILTERS: FilterState = {
  light: "",
  water: "",
  zone: "",
  climate: "",
  category: "",
  plantGroup: "",
  stock: "",
  sortBy: ""
};

const PLANT_GROUP_OPTIONS = [
  'Palmeras', 'Helechos arbóreos', 'Cícadas', 'Árboles ornamentales', 
  'Arbustos ornamentales', 'Bambús', 'Hierbas', 'Bromeliáceas', 
  'Heliconias', 'Estrelicias', 'Jengibres', 'Plátanos', 
  'Agaves y yucas', 'Aráceas', 'Suculentas', 'Cactus', 'Coníferas', 'Perennes'
];

const WATER_OPTIONS = ['Baja', 'Moderada', 'Alta'];

const PlantFilters = ({ plants, onFilterChange, isVisible }: PlantFiltersProps) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch categories from DB
  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  // Memoize derived options
  const { lightOptions, climateOptions, zoneOptions, plantGroupOptions } = useMemo(() => ({
    lightOptions: Array.from(new Set(plants.map(p => p.light).filter(Boolean))).sort(),
    climateOptions: Array.from(new Set(plants.flatMap(p => p.climateZones || []))).sort(),
    zoneOptions: Array.from(new Set(plants.flatMap(p => p.hardinessZones || []))).sort(),
    plantGroupOptions: Array.from(new Set(plants.map(p => p.plantGroup).filter(Boolean) as string[])).sort()
  }), [plants]);

  const applyFilters = useCallback((newFilters: FilterState) => {
    let filtered = plants;

    // Habitat filters
    if (newFilters.light) {
      filtered = filtered.filter(plant => plant.light === newFilters.light);
    }
    if (newFilters.water) {
      filtered = filtered.filter(plant => plant.waterNeeds === newFilters.water);
    }
    if (newFilters.zone) {
      filtered = filtered.filter(plant => 
        plant.hardinessZones && plant.hardinessZones.includes(newFilters.zone)
      );
    }
    if (newFilters.climate) {
      filtered = filtered.filter(plant => 
        plant.climateZones && plant.climateZones.includes(newFilters.climate)
      );
    }

    // Commercial filters
    if (newFilters.category) {
      // Category maps to plantGroup values (e.g., "Palmeras")
      const cat = categories.find(c => c.slug === newFilters.category);
      if (cat) {
        filtered = filtered.filter(plant => plant.plantGroup === cat.name);
      }
    }
    if (newFilters.plantGroup) {
      filtered = filtered.filter(plant => plant.plantGroup === newFilters.plantGroup);
    }
    if (newFilters.stock) {
      if (newFilters.stock === 'disponible') {
        filtered = filtered.filter(plant => plant.quantity > 0);
      } else if (newFilters.stock === 'agotado') {
        filtered = filtered.filter(plant => plant.quantity === 0);
      }
    }

    // Sort
    if (newFilters.sortBy) {
      filtered = [...filtered].sort((a, b) => {
        switch (newFilters.sortBy) {
          case 'priceLow':
            return (a.price || 0) - (b.price || 0);
          case 'priceHigh':
            return (b.price || 0) - (a.price || 0);
          case 'nameAZ':
            return a.name.localeCompare(b.name);
          case 'newest':
            return (b.id || '').localeCompare(a.id || '');
          default:
            return 0;
        }
      });
    }

    // Build filter summary for sharing
    const filterSummary: Record<string, string> = {};
    if (newFilters.light) filterSummary['Luz'] = newFilters.light;
    if (newFilters.water) filterSummary['Riego'] = newFilters.water;
    if (newFilters.zone) filterSummary['Zona'] = newFilters.zone;
    if (newFilters.climate) filterSummary['Clima'] = newFilters.climate;
    if (newFilters.category) {
      const cat = categories.find(c => c.slug === newFilters.category);
      filterSummary['Categoría'] = cat?.name || newFilters.category;
    }
    if (newFilters.plantGroup) filterSummary['Grupo'] = newFilters.plantGroup;
    if (newFilters.stock) filterSummary['Stock'] = newFilters.stock === 'disponible' ? 'Disponible' : 'Agotado';

    onFilterChange(filtered, newFilters.sortBy, Object.keys(filterSummary).length > 0 ? filterSummary : undefined);
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

  const habitatFiltersCount = useMemo(() => 
    [filters.light, filters.water, filters.zone, filters.climate].filter(v => v !== "").length,
  [filters]);

  const commercialFiltersCount = useMemo(() => 
    [filters.category, filters.plantGroup, filters.stock, filters.sortBy].filter(v => v !== "").length,
  [filters]);

  const activeFilterTags = useMemo(() => {
    const tags: Array<{ key: keyof FilterState; label: string; type: 'habitat' | 'commercial' }> = [];
    
    // Habitat tags
    if (filters.light) {
      tags.push({ key: 'light', label: filters.light, type: 'habitat' });
    }
    if (filters.water) {
      tags.push({ key: 'water', label: `${t('filters.water')}: ${filters.water}`, type: 'habitat' });
    }
    if (filters.zone) {
      tags.push({ key: 'zone', label: filters.zone, type: 'habitat' });
    }
    if (filters.climate) {
      tags.push({ key: 'climate', label: filters.climate, type: 'habitat' });
    }

    // Commercial tags
    if (filters.category) {
      const cat = categories.find(c => c.slug === filters.category);
      tags.push({ key: 'category', label: cat?.name || filters.category, type: 'commercial' });
    }
    if (filters.plantGroup) {
      tags.push({ key: 'plantGroup', label: filters.plantGroup, type: 'commercial' });
    }
    if (filters.stock) {
      tags.push({ 
        key: 'stock', 
        label: filters.stock === 'disponible' ? t('filters.available') : t('filters.outOfStock'), 
        type: 'commercial' 
      });
    }
    
    return tags;
  }, [filters, t]);

  const removeFilter = useCallback((key: keyof FilterState) => {
    const newFilters = { ...filters, [key]: "" };
    setFilters(newFilters);
    applyFilters(newFilters);
  }, [filters, applyFilters]);

  if (!isVisible) return null;

  return (
    <div className="overflow-hidden transition-all duration-300 ease-in-out">
      <div className="space-y-4">
        
        {/* Habitat Block - Ecological/Survival Filters */}
        <div className="bg-gradient-to-br from-secondary/80 to-secondary/40 backdrop-blur-sm border border-border rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-moss/10 rounded-lg">
              <Leaf className="h-4 w-4 text-moss" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {t('filters.habitatBlock.title')}
                {habitatFiltersCount > 0 && (
                  <span className="text-[10px] bg-moss/20 text-moss px-1.5 py-0.5 rounded-full font-medium">
                    {habitatFiltersCount}
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('filters.habitatBlock.description')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Sun Exposure */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sun className="h-3 w-3" />
                {t('filters.habitatBlock.sunExposure')}
              </label>
              <Select 
                value={filters.light || "all"} 
                onValueChange={(v) => handleFilterChange('light', v)}
              >
                <SelectTrigger className="h-9 border-border/50 bg-background/60 text-sm hover:bg-background/80 transition-colors">
                  <SelectValue placeholder={t('filters.all')} />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-lg z-50">
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  {lightOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Water Needs */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Droplets className="h-3 w-3" />
                {t('filters.habitatBlock.waterNeeds')}
              </label>
              <Select 
                value={filters.water || "all"} 
                onValueChange={(v) => handleFilterChange('water', v)}
              >
                <SelectTrigger className="h-9 border-border/50 bg-background/60 text-sm hover:bg-background/80 transition-colors">
                  <SelectValue placeholder={t('filters.all')} />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-lg z-50">
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  {WATER_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hardiness Zone */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Thermometer className="h-3 w-3" />
                {t('filters.habitatBlock.hardinessZone')}
              </label>
              <Select 
                value={filters.zone || "all"} 
                onValueChange={(v) => handleFilterChange('zone', v)}
              >
                <SelectTrigger className="h-9 border-border/50 bg-background/60 text-sm hover:bg-background/80 transition-colors">
                  <SelectValue placeholder={t('filters.all')} />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-lg z-50 max-h-[280px]">
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  {zoneOptions.map((z) => (
                    <SelectItem key={z} value={z} className="capitalize">{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Climate Zone */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                {t('filters.habitatBlock.climate')}
              </label>
              <Select 
                value={filters.climate || "all"} 
                onValueChange={(v) => handleFilterChange('climate', v)}
              >
                <SelectTrigger className="h-9 border-border/50 bg-background/60 text-sm hover:bg-background/80 transition-colors">
                  <SelectValue placeholder={t('filters.all')} />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-lg z-50">
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  {climateOptions.map((option) => (
                    <SelectItem key={option} value={option} className="capitalize">{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Commercial Block - Purchase Filters */}
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-stone/10 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-stone" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {t('filters.commercialBlock.title')}
                {commercialFiltersCount > 0 && (
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                    {commercialFiltersCount}
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('filters.commercialBlock.description')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Category */}
            {categories.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FolderTree className="h-3 w-3" />
                  {t('filters.commercialBlock.category')}
                </label>
                <Select 
                  value={filters.category || "all"} 
                  onValueChange={(v) => handleFilterChange('category', v)}
                >
                  <SelectTrigger className="h-9 border-border/50 bg-background/60 text-sm hover:bg-background/80 transition-colors">
                    <SelectValue placeholder={t('filters.all')} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border shadow-lg z-50">
                    <SelectItem value="all">{t('filters.all')}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Plant Group */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TreeDeciduous className="h-3 w-3" />
                {t('filters.commercialBlock.plantGroup')}
              </label>
              <Select 
                value={filters.plantGroup || "all"} 
                onValueChange={(v) => handleFilterChange('plantGroup', v)}
              >
                <SelectTrigger className="h-9 border-border/50 bg-background/60 text-sm hover:bg-background/80 transition-colors">
                  <SelectValue placeholder={t('filters.all')} />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-lg z-50 max-h-[280px]">
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  {plantGroupOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Availability */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3 w-3" />
                {t('filters.commercialBlock.availability')}
              </label>
              <Select 
                value={filters.stock || "all"} 
                onValueChange={(v) => handleFilterChange('stock', v)}
              >
                <SelectTrigger className="h-9 border-border/50 bg-background/60 text-sm hover:bg-background/80 transition-colors">
                  <SelectValue placeholder={t('filters.all')} />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-lg z-50">
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  <SelectItem value="disponible">{t('filters.available')}</SelectItem>
                  <SelectItem value="agotado">{t('filters.outOfStock')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpDown className="h-3 w-3" />
                {t('filters.commercialBlock.sortBy')}
              </label>
              <Select 
                value={filters.sortBy || "all"} 
                onValueChange={(v) => handleFilterChange('sortBy', v)}
              >
                <SelectTrigger className="h-9 border-border/50 bg-background/60 text-sm hover:bg-background/80 transition-colors">
                  <SelectValue placeholder={t('filters.commercialBlock.sortOptions.relevance')} />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-lg z-50">
                  <SelectItem value="all">{t('filters.commercialBlock.sortOptions.relevance')}</SelectItem>
                  <SelectItem value="newest">{t('filters.commercialBlock.sortOptions.newest')}</SelectItem>
                  <SelectItem value="priceLow">{t('filters.commercialBlock.sortOptions.priceLow')}</SelectItem>
                  <SelectItem value="priceHigh">{t('filters.commercialBlock.sortOptions.priceHigh')}</SelectItem>
                  <SelectItem value="nameAZ">{t('filters.commercialBlock.sortOptions.nameAZ')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && activeFilterTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              {t('filters.activeFilters')}:
            </span>
            {activeFilterTags.map(({ key, label, type }) => (
              <button 
                key={key}
                onClick={() => removeFilter(key)}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors group ${
                  type === 'habitat' 
                    ? 'bg-moss/10 text-moss hover:bg-moss/20' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label}
                <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              {t('filters.clearFilters')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantFilters;
