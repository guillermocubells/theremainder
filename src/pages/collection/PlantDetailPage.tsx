import { useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOwnedPlant, useUpdateOwnedPlant, useDeleteOwnedPlant } from '@/hooks/collection/useOwnedPlants';
import { useObservations } from '@/hooks/collection/useObservations';
import { usePlantNotes, useCreatePlantNote, useDeletePlantNote } from '@/hooks/collection/usePlantNotes';
import { usePublicSlug, useCreatePublicSlug, useTogglePublicSharing } from '@/hooks/collection/usePublicSharing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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
  ExternalLink,
  Plus,
  StickyNote,
  Tag,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Leaf,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import AddObservationDialog from '@/components/collection/AddObservationDialog';
import { cn } from '@/lib/utils';

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
  
  const updatePlant = useUpdateOwnedPlant();
  const deletePlant = useDeleteOwnedPlant();
  const createNote = useCreatePlantNote();
  const deleteNote = useDeletePlantNote();
  const createPublicSlug = useCreatePublicSlug();
  const togglePublic = useTogglePublicSharing();
  
  const [addObservationOpen, setAddObservationOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [observationsOpen, setObservationsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);

  // Touch handling for lightbox
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const displayImages = plant?.photos?.slice(0, 6) || [];

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (displayImages.length === 0) return;
    if (direction === 'prev') {
      setSelectedIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
    } else {
      setSelectedIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
    }
  }, [displayImages.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || displayImages.length <= 1) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = Math.abs((touchStartY.current || 0) - touchEndY);
    const swipeThreshold = 50;

    if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > diffY) {
      if (diffX > 0) {
        navigateLightbox('next');
      } else {
        navigateLightbox('prev');
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [displayImages.length, navigateLightbox]);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deletePlant.mutateAsync(id);
      toast.success('Planta eliminada');
      navigate('/garden');
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
    
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-${plant?.nickname || 'plant'}.png`;
    link.click();
  };

  // Calculate viability score (mock - you can integrate real calculation)
  const viabilityScore = 70; // This should come from your viability calculator

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
          <Link to="/garden">
            <Button variant="link">Volver a mi jardín</Button>
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
      
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back link */}
          <Link 
            to="/garden" 
            className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors duration-200 text-sm mb-4 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span>Volver a mi jardín</span>
          </Link>

          {/* Two column layout - matching PDP style */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
            {/* Left column - Plant Header (2/3 width) */}
            <div className="lg:col-span-2 animate-fade-in flex" style={{ animationDelay: '0ms' }}>
              <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-border h-full w-full flex flex-col">
                <div className="flex flex-col space-y-4 flex-1">
                  {/* Title row with actions */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 flex flex-col gap-1">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                        {plant.nickname}
                      </h1>
                      {(plant.scientific_name || plant.common_name) && (
                        <p className="text-base sm:text-lg text-muted-foreground font-medium italic">
                          {plant.scientific_name || plant.common_name}
                        </p>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-9 w-9 sm:h-10 sm:w-10"
                        asChild
                      >
                        <Link to={`/collection/plant/${id}/edit`}>
                          <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-9 w-9 sm:h-10 sm:w-10 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Status and info tags */}
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <Badge className={cn("text-xs sm:text-sm", statusColors[plant.status])}>
                      {statusLabels[plant.status]}
                    </Badge>
                    
                    {locationName && (
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-secondary text-secondary-foreground">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{locationName}</span>
                      </div>
                    )}
                    
                    {plant.purchase_date && (
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-accent text-accent-foreground border border-border">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{format(new Date(plant.purchase_date), 'd MMM yyyy', { locale: es })}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {plant.tags && plant.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
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

                  {/* Viability Score - prominent display */}
                  <div className="bg-secondary border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Leaf className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-foreground">Viabilidad en tu jardín</span>
                      </div>
                      <span className={cn(
                        "text-lg font-bold",
                        viabilityScore >= 70 ? "text-green-600" :
                        viabilityScore >= 50 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {viabilityScore}%
                      </span>
                    </div>
                    <Progress 
                      value={viabilityScore} 
                      className="h-2"
                      indicatorClassName={cn(
                        viabilityScore >= 70 ? "bg-green-500" :
                        viabilityScore >= 50 ? "bg-yellow-500" : "bg-red-500"
                      )}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Basado en las condiciones de tu jardín activo
                    </p>
                  </div>

                  {/* Public Sharing Section */}
                  <Collapsible className="bg-muted border border-border rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 sm:p-4 hover:bg-muted/80 transition-colors">
                      <div className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground text-sm sm:text-base">
                          Compartir públicamente
                        </h3>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
                      <div className="space-y-3">
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
                              <Label htmlFor="public-toggle" className="text-sm">Página pública activa</Label>
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
                          La página pública muestra solo el nombre, fotos y observaciones recientes.
                        </p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </div>
            
            {/* Right column - Image Gallery (1/3 width) */}
            <div className="animate-fade-in flex" style={{ animationDelay: '50ms' }}>
              <div className="h-full flex flex-col w-full">
                {displayImages.length > 0 ? (
                  <>
                    {/* Main Image */}
                    <div className="relative mb-4">
                      <div 
                        className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-xl cursor-pointer group shadow-lg"
                        onClick={() => setLightboxOpen(true)}
                      >
                        <img
                          src={displayImages[selectedIndex]}
                          alt={`${plant.nickname} - imagen ${selectedIndex + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <button 
                          className="absolute bottom-3 right-3 bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxOpen(true);
                          }}
                        >
                          <Search className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnails */}
                    {displayImages.length > 1 && (
                      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {displayImages.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedIndex(index)}
                            className={cn(
                              "flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200",
                              selectedIndex === index 
                                ? "border-primary ring-2 ring-primary/30" 
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <img
                              src={image}
                              alt={`${plant.nickname} - miniatura ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center min-h-[200px] bg-card rounded-xl border border-border">
                    <div className="text-center text-muted-foreground p-6">
                      <div className="w-16 h-16 mx-auto mb-2 bg-muted rounded-lg flex items-center justify-center">
                        <Leaf className="w-8 h-8" />
                      </div>
                      <p className="text-sm">Sin fotos</p>
                      <Button variant="outline" size="sm" className="mt-2" asChild>
                        <Link to={`/collection/plant/${id}/edit`}>
                          Añadir fotos
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Observations Section - collapsible like PDP sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
            {/* Observations History */}
            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <Collapsible open={observationsOpen} onOpenChange={setObservationsOpen}>
                <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 sm:p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      <h3 className="text-sm sm:text-base font-semibold text-foreground">
                        Historial de observaciones
                      </h3>
                      <Badge variant="secondary" className="ml-2">
                        {observations?.length || 0}
                      </Badge>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
                      <Button size="sm" onClick={() => setAddObservationOpen(true)} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-1" />
                        Nueva observación
                      </Button>
                      
                      {observations && observations.length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {observations.map(obs => (
                            <div key={obs.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                              {obs.photos?.[0] && (
                                <img 
                                  src={obs.photos[0]} 
                                  alt="" 
                                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={cn("text-xs", conditionColors[obs.condition])}>
                                    {conditionLabels[obs.condition]}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(obs.observation_date), "d MMM yyyy", { locale: es })}
                                  </span>
                                </div>
                                {obs.notes && (
                                  <p className="text-sm text-foreground line-clamp-2">{obs.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">Sin observaciones todavía</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>

            {/* Notes Section */}
            <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 sm:p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <StickyNote className="h-5 w-5 text-primary" />
                      <h3 className="text-sm sm:text-base font-semibold text-foreground">
                        Notas privadas
                      </h3>
                      <Badge variant="secondary" className="ml-2">
                        {notes?.length || 0}
                      </Badge>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
                      {/* Add note form */}
                      <div className="space-y-2">
                        <Textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Escribe una nota privada..."
                          rows={2}
                          className="text-sm"
                        />
                        <Button 
                          size="sm"
                          onClick={handleAddNote}
                          disabled={createNote.isPending || !newNote.trim()}
                          className="w-full sm:w-auto"
                        >
                          {createNote.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Plus className="h-4 w-4 mr-1" />
                          )}
                          Añadir nota
                        </Button>
                      </div>
                      
                      {notes && notes.length > 0 ? (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                          {notes.map(note => (
                            <div key={note.id} className="flex justify-between items-start gap-2 p-3 bg-muted rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(note.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <StickyNote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">Sin notas todavía</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-black/95 border-none gap-0">
          <VisuallyHidden>
            <DialogTitle>{plant.nickname} - Imagen ampliada</DialogTitle>
          </VisuallyHidden>
          
          <div className="relative">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-white/90 hover:bg-white text-foreground px-3 py-1.5 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            >
              <X className="h-4 w-4" />
              <span className="text-sm font-medium">Cerrar</span>
            </button>

            <div 
              className="p-2 relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={() => navigateLightbox('prev')}
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-all duration-200 hover:scale-110"
                  >
                    <ChevronLeft className="h-6 w-6 text-white" />
                  </button>
                  <button
                    onClick={() => navigateLightbox('next')}
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-all duration-200 hover:scale-110"
                  >
                    <ChevronRight className="h-6 w-6 text-white" />
                  </button>
                </>
              )}

              <img
                src={displayImages[selectedIndex]}
                alt={`${plant.nickname} - imagen ${selectedIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg select-none"
                draggable={false}
              />
              
              {displayImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
                  {selectedIndex + 1} / {displayImages.length}
                </div>
              )}
            </div>

            <p className="text-center text-white/60 text-xs pb-3 sm:hidden">
              Desliza para navegar
            </p>
          </div>
        </DialogContent>
      </Dialog>

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
