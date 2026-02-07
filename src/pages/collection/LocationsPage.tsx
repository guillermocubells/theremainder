import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlantLocations, useCreatePlantLocation, useUpdatePlantLocation, useDeletePlantLocation } from '@/hooks/collection/usePlantLocations';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, MapPin, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PlantLocation } from '@/hooks/collection/usePlantLocations';

const LocationsPage = () => {
  const { data: locations, isLoading } = usePlantLocations();
  const createLocation = useCreatePlantLocation();
  const updateLocation = useUpdatePlantLocation();
  const deleteLocation = useDeletePlantLocation();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<PlantLocation | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

  const openAddDialog = () => {
    setEditingLocation(null);
    setFormData({ name: '', description: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (location: PlantLocation) => {
    setEditingLocation(location);
    setFormData({ name: location.name, description: location.description || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    
    try {
      if (editingLocation) {
        await updateLocation.mutateAsync({
          id: editingLocation.id,
          name: formData.name.trim(),
          description: formData.description || null,
        });
        toast.success('Ubicación actualizada');
      } else {
        await createLocation.mutateAsync({
          name: formData.name.trim(),
          description: formData.description || null,
        });
        toast.success('Ubicación creada');
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error('Error al guardar ubicación');
    }
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;
    
    try {
      await deleteLocation.mutateAsync(locationToDelete);
      toast.success('Ubicación eliminada');
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/garden"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mi colección
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <MapPin className="h-7 w-7 text-primary" />
              Mis Ubicaciones
            </h1>
            <p className="text-muted-foreground mt-1">
              Organiza tus plantas por ubicación
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva ubicación
          </Button>
        </div>

        {/* Locations list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : locations && locations.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map(location => (
              <Card key={location.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{location.name}</h3>
                        {location.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {location.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(location)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setLocationToDelete(location.id);
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
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin ubicaciones</h3>
              <p className="text-muted-foreground mb-4">
                Crea ubicaciones para organizar tus plantas (ej: "Salón", "Terraza")
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera ubicación
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Editar ubicación' : 'Nueva ubicación'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Salón, Terraza, Jardín..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Notas sobre esta ubicación..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createLocation.isPending || updateLocation.isPending}
            >
              {(createLocation.isPending || updateLocation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingLocation ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ubicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Las plantas asignadas a esta ubicación quedarán sin ubicación asignada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LocationsPage;
