import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOwnedPlants, OwnedPlantsFilters, OwnedPlant } from '@/hooks/collection/useOwnedPlants';
import { useRecentObservations } from '@/hooks/collection/useObservations';
import { usePlantLocations } from '@/hooks/collection/usePlantLocations';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Leaf, Plus, Eye, MapPin, Calendar, Filter, ArrowLeft
} from 'lucide-react';
import CollectionPlantCard from '@/components/collection/CollectionPlantCard';
import CollectionFilters from '@/components/collection/CollectionFilters';
import CollectionSortSelect, { CollectionSortKey } from '@/components/collection/CollectionSortSelect';
import CollectionActiveFilters from '@/components/collection/CollectionActiveFilters';
import CollectionGridSkeleton from '@/components/collection/CollectionGridSkeleton';
import AddPlantDialog from '@/components/collection/AddPlantDialog';
import AddObservationDialog from '@/components/collection/AddObservationDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PAGE_SIZE = 12;

// ── Sort helpers ──
function sortPlants(plants: OwnedPlant[], key: CollectionSortKey): OwnedPlant[] {
  const sorted = [...plants];
  switch (key) {
    case 'created_desc':
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'created_asc':
      return sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case 'nickname_asc':
      return sorted.sort((a, b) => a.nickname.localeCompare(b.nickname, 'es'));
    case 'nickname_desc':
      return sorted.sort((a, b) => b.nickname.localeCompare(a.nickname, 'es'));
    case 'status': {
      const order = { alive: 0, sick: 1, dormant: 2, removed: 3 };
      return sorted.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
    }
    default:
      return sorted;
  }
}

const CollectionDashboard = () => {
  const [filters, setFilters] = useState<OwnedPlantsFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [addPlantOpen, setAddPlantOpen] = useState(false);
  const [addObservationOpen, setAddObservationOpen] = useState(false);
  const [sortKey, setSortKey] = useState<CollectionSortKey>('created_desc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: plants, isLoading: plantsLoading } = useOwnedPlants(filters);
  const { data: recentObservations, isLoading: observationsLoading } = useRecentObservations(5);
  const { data: locations } = usePlantLocations();

  // ── Sorted + paginated plants ──
  const sortedPlants = useMemo(
    () => sortPlants(plants || [], sortKey),
    [plants, sortKey]
  );

  const visiblePlants = useMemo(
    () => sortedPlants.slice(0, visibleCount),
    [sortedPlants, visibleCount]
  );

  const hasMore = visibleCount < sortedPlants.length;

  // ── Reset visible count when filters or sort change ──
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, sortKey]);

  // ── Intersection Observer for lazy loading ──
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visiblePlants.length]);

  // ── Stats ──
  const statusCounts = useMemo(() => ({
    alive: plants?.filter(p => p.status === 'alive').length || 0,
    dormant: plants?.filter(p => p.status === 'dormant').length || 0,
    sick: plants?.filter(p => p.status === 'sick').length || 0,
    removed: plants?.filter(p => p.status === 'removed').length || 0,
  }), [plants]);

  const allTags = useMemo(
    () => [...new Set(plants?.flatMap(p => p.tags) || [])],
    [plants]
  );

  const hasActiveFilters = Object.values(filters).some(v => v !== null && v !== undefined && v !== '');

  const getConditionColor = useCallback((condition: string) => {
    switch (condition) {
      case 'healthy': return 'text-success-muted-foreground bg-success-muted';
      case 'okay': return 'text-warning-muted-foreground bg-warning-muted';
      case 'concern': return 'text-caution-muted-foreground bg-caution-muted';
      case 'critical': return 'text-danger-muted-foreground bg-danger-muted';
      default: return 'text-muted-foreground bg-muted';
    }
  }, []);

  const conditionLabels: Record<string, string> = {
    healthy: 'Saludable',
    okay: 'Aceptable',
    concern: 'Preocupante',
    critical: 'Crítico',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mi cuenta
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Leaf className="h-8 w-8 text-primary" />
              Mi Colección de Plantas
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona y registra el cuidado de tus plantas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" onClick={() => setAddObservationOpen(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Observación
            </Button>
            <Button onClick={() => setAddPlantOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir Planta
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-success-muted p-2 rounded-lg">
                  <Leaf className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{plants?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total plantas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statusCounts.alive}</p>
                  <p className="text-sm text-muted-foreground">Vivas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-caution-muted p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-caution" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statusCounts.sick}</p>
                  <p className="text-sm text-muted-foreground">Enfermas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{locations?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Ubicaciones</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <CollectionFilters
            filters={filters}
            onFiltersChange={setFilters}
            locations={locations || []}
            tags={allTags}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Active filter chips */}
        <CollectionActiveFilters
          filters={filters}
          locations={locations || []}
          onFiltersChange={setFilters}
        />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Plants grid */}
          <div className="lg:col-span-2">
            {/* Toolbar: count + sort */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Mis Plantas
                {!plantsLoading && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({sortedPlants.length})
                  </span>
                )}
              </h2>
              <CollectionSortSelect value={sortKey} onChange={setSortKey} />
            </div>

            {/* Loading skeleton */}
            {plantsLoading ? (
              <CollectionGridSkeleton count={6} />
            ) : visiblePlants.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visiblePlants.map(plant => (
                    <CollectionPlantCard key={plant.id} plant={plant} />
                  ))}
                </div>

                {/* Lazy-load sentinel */}
                {hasMore && (
                  <div ref={sentinelRef} className="mt-6">
                    <CollectionGridSkeleton count={3} />
                  </div>
                )}

                {!hasMore && sortedPlants.length > PAGE_SIZE && (
                  <p className="text-center text-sm text-muted-foreground mt-6">
                    Mostrando todas las {sortedPlants.length} plantas
                  </p>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {hasActiveFilters
                      ? 'No hay plantas con estos filtros'
                      : 'Tu colección está vacía'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {hasActiveFilters
                      ? 'Prueba a ajustar los filtros'
                      : 'Añade tu primera planta para empezar a registrar su cuidado'}
                  </p>
                  {!hasActiveFilters && (
                    <Button onClick={() => setAddPlantOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir primera planta
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent observations sidebar */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Observaciones recientes</h2>
            
            {observationsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recentObservations && recentObservations.length > 0 ? (
              <div className="space-y-3">
                {recentObservations.map(obs => (
                  <Card key={obs.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {obs.owned_plants?.photos?.[0] ? (
                          <img 
                            src={obs.owned_plants.photos[0]} 
                            alt={obs.owned_plants.nickname}
                            className="w-12 h-12 rounded-lg object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                            <Leaf className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{obs.owned_plants?.nickname}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getConditionColor(obs.condition)}`}>
                              {conditionLabels[obs.condition]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(obs.observation_date), 'd MMM', { locale: es })}
                            </span>
                          </div>
                          {obs.notes && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {obs.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Sin observaciones todavía
                  </p>
                </CardContent>
              </Card>
            )}
            
            <div className="mt-4">
              <Link to="/garden/locations">
                <Button variant="outline" className="w-full">
                  <MapPin className="h-4 w-4 mr-2" />
                  Gestionar ubicaciones
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <AddPlantDialog open={addPlantOpen} onOpenChange={setAddPlantOpen} />
      <AddObservationDialog 
        open={addObservationOpen} 
        onOpenChange={setAddObservationOpen}
        plants={plants || []}
      />
    </div>
  );
};

export default CollectionDashboard;
