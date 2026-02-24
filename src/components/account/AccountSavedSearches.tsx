import { useState } from 'react';
import { useSavedSearches, useUpdateSavedSearch, useDeleteSavedSearch, SavedSearch } from '@/hooks/useSavedSearches';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Edit2, Trash2, Play, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AccountSavedSearches = () => {
  const navigate = useNavigate();
  const { data: searches, isLoading } = useSavedSearches();
  const updateSearch = useUpdateSavedSearch();
  const deleteSearch = useDeleteSavedSearch();

  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState<string | null>(null);

  const handleRename = async () => {
    if (!editingSearch || !newName.trim()) return;
    
    try {
      await updateSearch.mutateAsync({ id: editingSearch.id, name: newName.trim() });
      toast.success('Búsqueda renombrada');
      setEditingSearch(null);
      setNewName('');
    } catch (error) {
      toast.error('Error al renombrar la búsqueda');
    }
  };

  const handleDelete = async () => {
    if (!searchToDelete) return;
    
    try {
      await deleteSearch.mutateAsync(searchToDelete);
      toast.success('Búsqueda eliminada');
    } catch (error) {
      toast.error('Error al eliminar la búsqueda');
    } finally {
      setDeleteDialogOpen(false);
      setSearchToDelete(null);
    }
  };

  const handleApply = (search: SavedSearch) => {
    // Store the filters in sessionStorage and navigate to home
    sessionStorage.setItem('appliedFilters', JSON.stringify(search.filters));
    navigate('/');
    toast.success(`Filtros "${search.name}" aplicados`);
  };

  const getFilterSummary = (filters: SavedSearch['filters']) => {
    const parts: string[] = [];
    
    if (filters.plantGroup) parts.push(filters.plantGroup);
    if (filters.sunExposure) parts.push(filters.sunExposure);
    if (filters.waterNeeds) parts.push(`Agua: ${filters.waterNeeds}`);
    if (filters.hardinessZone) parts.push(`Zona ${filters.hardinessZone}`);
    if (filters.growthRate) parts.push(`Crecimiento: ${filters.growthRate}`);
    
    return parts.length > 0 ? parts.join(' • ') : 'Sin filtros específicos';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Búsquedas guardadas</h1>
        <p className="text-muted-foreground mt-1">
          Accede rápidamente a tus configuraciones de búsqueda favoritas
        </p>
      </div>

      {searches && searches.length > 0 ? (
        <div className="space-y-4">
          {searches.map((search) => (
            <Card key={search.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                      <Search className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{search.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {getFilterSummary(search.filters)}
                      </p>
                      <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(search.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => handleApply(search)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Aplicar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingSearch(search);
                        setNewName(search.name);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSearchToDelete(search.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Sin búsquedas guardadas</h3>
            <p className="text-muted-foreground">
              Cuando uses el buscador de plantas y apliques filtros, podrás guardar esa configuración para acceder rápidamente en el futuro.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Rename dialog */}
      <Dialog open={!!editingSearch} onOpenChange={() => setEditingSearch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar búsqueda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de la búsqueda"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSearch(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRename}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={updateSearch.isPending || !newName.trim()}
            >
              {updateSearch.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar búsqueda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La búsqueda guardada será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountSavedSearches;
