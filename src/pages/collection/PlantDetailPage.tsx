import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOwnedPlant, useUpdateOwnedPlant, useDeleteOwnedPlant } from '@/hooks/collection/useOwnedPlants';
import { useObservations } from '@/hooks/collection/useObservations';
import { usePlantNotes, useCreatePlantNote, useDeletePlantNote } from '@/hooks/collection/usePlantNotes';
import { usePublicSlug, useCreatePublicSlug, useTogglePublicSharing } from '@/hooks/collection/usePublicSharing';
import { usePlantLocations } from '@/hooks/collection/usePlantLocations';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Loader2, 
  Edit2, 
  Trash2, 
  Eye, 
  MapPin, 
  Calendar,
  Share2,
  QrCode,
  Download,
  ExternalLink,
  Plus,
  StickyNote,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import AddObservationDialog from '@/components/collection/AddObservationDialog';

const statusColors: Record<string, string> = {
  alive: 'bg-green-100 text-green-800',
  dormant: 'bg-yellow-100 text-yellow-800',
  sick: 'bg-orange-100 text-orange-800',
  removed: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  alive: 'Viva',
  dormant: 'Latente',
  sick: 'Enferma',
  removed: 'Eliminada',
};

const conditionColors: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800',
  okay: 'bg-yellow-100 text-yellow-800',
  concern: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const conditionLabels: Record<string, string> = {
  healthy: 'Saludable',
  okay: 'Aceptable',
  concern: 'Preocupante',
  critical: 'Crítico',
};

const PlantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: plant, isLoading } = useOwnedPlant(id);
  const { data: observations } = useObservations(id);
  const { data: notes } = usePlantNotes(id);
  const { data: publicSlug } = usePublicSlug(id);
  const { data: locations } = usePlantLocations();
  
  const updatePlant = useUpdateOwnedPlant();
  const deletePlant = useDeleteOwnedPlant();
  const createNote = useCreatePlantNote();
  const deleteNote = useDeletePlantNote();
  const createPublicSlug = useCreatePublicSlug();
  const togglePublic = useTogglePublicSharing();
  
  const [addObservationOpen, setAddObservationOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deletePlant.mutateAsync(id);
      toast.success('Planta eliminada');
      navigate('/collection');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleAddNote = async () => {
    if (!id || !newNote.trim()) return;
    
    try {
      await createNote.mutateAsync({
        owned_plant_id: id,
        content: newNote.trim(),
      });
      setNewNote('');
      toast.success('Nota añadida');
    } catch (error) {
      toast.error('Error al añadir nota');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!id) return;
    
    try {
      await deleteNote.mutateAsync({ id: noteId, plantId: id });
      toast.success('Nota eliminada');
    } catch (error) {
      toast.error('Error al eliminar nota');
    }
  };

  const handleCreateSlug = async () => {
    if (!id) return;
    
    try {
      await createPublicSlug.mutateAsync(id);
      toast.success('Enlace público creado');
    } catch (error) {
      toast.error('Error al crear enlace');
    }
  };

  const handleTogglePublic = async () => {
    if (!publicSlug || !id) return;
    
    try {
      await togglePublic.mutateAsync({
        slugId: publicSlug.id,
        isPublic: !publicSlug.is_public,
        plantId: id,
      });
      toast.success(publicSlug.is_public ? 'Planta ahora privada' : 'Planta ahora pública');
    } catch (error) {
      toast.error('Error al cambiar visibilidad');
    }
  };

  const generateQRCode = () => {
    if (!publicSlug) return;
    
    const url = `${window.location.origin}/plant/${publicSlug.slug}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    
    // Download QR
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-${plant?.nickname || 'plant'}.png`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <p>Planta no encontrada</p>
          <Link to="/collection">
            <Button variant="link">Volver a mi colección</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const locationName = plant.plant_locations?.name || plant.location_text;
  const publicUrl = publicSlug ? `${window.location.origin}/plant/${publicSlug.slug}` : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/collection"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mi colección
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card with photos */}
            <Card>
              <CardContent className="p-0">
                {/* Photo gallery */}
                {plant.photos && plant.photos.length > 0 ? (
                  <div className="relative">
                    <img 
                      src={selectedPhoto || plant.photos[0]} 
                      alt={plant.nickname}
                      className="w-full h-64 sm:h-80 object-cover cursor-pointer"
                      onClick={() => setSelectedPhoto(selectedPhoto || plant.photos[0])}
                    />
                    {plant.photos.length > 1 && (
                      <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2">
                        {plant.photos.map((photo, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedPhoto(photo)}
                            className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                              (selectedPhoto || plant.photos[0]) === photo
                                ? 'border-primary'
                                : 'border-white/50'
                            }`}
                          >
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground">Sin fotos</span>
                  </div>
                )}
                
                {/* Plant info */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">{plant.nickname}</h1>
                      {(plant.scientific_name || plant.common_name) && (
                        <p className="text-muted-foreground italic">
                          {plant.scientific_name || plant.common_name}
                        </p>
                      )}
                    </div>
                    <Badge className={statusColors[plant.status]}>
                      {statusLabels[plant.status]}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    {locationName && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {locationName}
                      </div>
                    )}
                    {plant.purchase_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Comprada: {format(new Date(plant.purchase_date), 'd MMM yyyy', { locale: es })}
                      </div>
                    )}
                    {plant.next_checkin_date && (
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        Próximo: {format(new Date(plant.next_checkin_date), 'd MMM', { locale: es })}
                      </div>
                    )}
                  </div>
                  
                  {plant.tags && plant.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {plant.tags.map(tag => (
                        <span 
                          key={tag}
                          className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabs for observations and notes */}
            <Tabs defaultValue="observations">
              <TabsList className="w-full">
                <TabsTrigger value="observations" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Observaciones ({observations?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">
                  <StickyNote className="h-4 w-4 mr-2" />
                  Notas ({notes?.length || 0})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="observations" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Historial de observaciones</h3>
                  <Button size="sm" onClick={() => setAddObservationOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir
                  </Button>
                </div>
                
                {observations && observations.length > 0 ? (
                  <div className="space-y-4">
                    {observations.map(obs => (
                      <Card key={obs.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {obs.photos?.[0] && (
                              <img 
                                src={obs.photos[0]} 
                                alt="" 
                                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={conditionColors[obs.condition]}>
                                  {conditionLabels[obs.condition]}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(obs.observation_date), "d 'de' MMMM, yyyy", { locale: es })}
                                </span>
                              </div>
                              {obs.notes && (
                                <p className="text-sm text-foreground">{obs.notes}</p>
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
                      <p className="text-muted-foreground">Sin observaciones todavía</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="notes" className="mt-4">
                <div className="space-y-4">
                  {/* Add note form */}
                  <Card>
                    <CardContent className="p-4">
                      <Textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Escribe una nota privada..."
                        rows={3}
                      />
                      <Button 
                        className="mt-2" 
                        size="sm"
                        onClick={handleAddNote}
                        disabled={createNote.isPending || !newNote.trim()}
                      >
                        {createNote.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        Añadir nota
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {notes && notes.length > 0 ? (
                    notes.map(note => (
                      <Card key={note.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(note.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <StickyNote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Sin notas todavía</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to={`/collection/plant/${id}/edit`}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar planta
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar planta
                </Button>
              </CardContent>
            </Card>
            
            {/* Public sharing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Compartir públicamente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!publicSlug ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleCreateSlug}
                    disabled={createPublicSlug.isPending}
                  >
                    {createPublicSlug.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Share2 className="h-4 w-4 mr-2" />
                    )}
                    Crear enlace público
                  </Button>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="public-toggle">Página pública</Label>
                      <Switch
                        id="public-toggle"
                        checked={publicSlug.is_public}
                        onCheckedChange={handleTogglePublic}
                        disabled={togglePublic.isPending}
                      />
                    </div>
                    
                    {publicSlug.is_public && publicUrl && (
                      <div className="space-y-2">
                        <Input 
                          value={publicUrl} 
                          readOnly 
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => window.open(publicUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={generateQRCode}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            QR
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  La página pública muestra solo el nombre, fotos y observaciones recientes. Tu email nunca se comparte.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      <AddObservationDialog 
        open={addObservationOpen} 
        onOpenChange={setAddObservationOpen}
        plants={plant ? [plant] : []}
        preselectedPlantId={id}
      />
      
      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta planta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas las observaciones y notas asociadas. Esta acción no se puede deshacer.
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

export default PlantDetailPage;
