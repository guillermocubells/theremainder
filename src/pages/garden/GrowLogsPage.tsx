import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useGrowLogs, useCreateGrowLog } from "@/hooks/garden/useGrowLogs";
import GrowLogCard from "@/components/garden/GrowLogCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const GrowLogsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Filters
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const filters = useMemo(
    () => ({
      search: search || undefined,
      species: speciesFilter || undefined,
      tag: tagFilter || undefined,
    }),
    [search, speciesFilter, tagFilter],
  );

  const { data: logs, isLoading } = useGrowLogs(filters);
  const createLog = useCreateGrowLog();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSpecies, setNewSpecies] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const log = await createLog.mutateAsync({
        title: newTitle.trim(),
        species: newSpecies.trim() || undefined,
      });
      toast.success("Diario creado");
      setCreateOpen(false);
      setNewTitle("");
      setNewSpecies("");
      navigate(`/garden/logs/${log.id}`);
    } catch {
      toast.error("Error al crear el diario");
    }
  };

  // Extract unique species for filter suggestions
  const speciesList = useMemo(() => {
    if (!logs) return [];
    const set = new Set<string>();
    logs.forEach((l) => l.species && set.add(l.species));
    return [...set].sort();
  }, [logs]);

  const hasActiveFilters = speciesFilter || tagFilter;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-2xl">
        {/* Back link */}
        <Link
          to="/garden"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Mi Jardín
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Diarios de cultivo</h1>
              <p className="text-sm text-muted-foreground">
                {logs?.length ?? 0} {logs?.length === 1 ? "diario" : "diarios"}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar diarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {/* Species filter */}
          <div className="relative">
            <Input
              placeholder="Especie…"
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="h-8 text-xs w-36"
              list="species-list"
            />
            <datalist id="species-list">
              {speciesList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          {/* Tag filter */}
          <Input
            placeholder="Etiqueta…"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="h-8 text-xs w-32"
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setSpeciesFilter("");
                setTagFilter("");
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {speciesFilter && (
              <Badge variant="secondary" className="text-xs gap-1">
                Especie: {speciesFilter}
                <button onClick={() => setSpeciesFilter("")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {tagFilter && (
              <Badge variant="secondary" className="text-xs gap-1">
                Tag: {tagFilter}
                <button onClick={() => setTagFilter("")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Log list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log) => (
              <GrowLogCard key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              {hasActiveFilters || search
                ? "Sin resultados"
                : "Aún no tienes diarios"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {hasActiveFilters || search
                ? "Prueba cambiando los filtros"
                : "Crea tu primer diario de cultivo para documentar el crecimiento de tus plantas."}
            </p>
            {!hasActiveFilters && !search && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Crear diario
              </Button>
            )}
          </div>
        )}
      </main>

      {!isMobile && <Footer />}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo diario de cultivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Título *
              </label>
              <Input
                placeholder="Ej: Adenium obesum desde semilla"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Especie (opcional)
              </label>
              <Input
                placeholder="Ej: Adenium obesum"
                value={newSpecies}
                onChange={(e) => setNewSpecies(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || createLog.isPending}
            >
              {createLog.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GrowLogsPage;
