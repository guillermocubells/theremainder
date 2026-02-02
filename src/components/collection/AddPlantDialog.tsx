import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateOwnedPlant, PlantStatus } from '@/hooks/collection/useOwnedPlants';
import { usePlantLocations, useCreatePlantLocation } from '@/hooks/collection/usePlantLocations';
import { Loader2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AddPlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions: { value: PlantStatus; label: string }[] = [
  { value: 'alive', label: 'Viva' },
  { value: 'dormant', label: 'Latente' },
  { value: 'sick', label: 'Enferma' },
  { value: 'removed', label: 'Eliminada' },
];

const AddPlantDialog = ({ open, onOpenChange }: AddPlantDialogProps) => {
  const { user } = useAuth();
  const { data: locations } = usePlantLocations();
  const createPlant = useCreateOwnedPlant();
  const createLocation = useCreatePlantLocation();
  
  const [formData, setFormData] = useState({
    nickname: '',
    scientific_name: '',
    common_name: '',
    status: 'alive' as PlantStatus,
    location_id: '',
    location_text: '',
    purchase_date: '',
    next_checkin_date: '',
    tags: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [showNewLocation, setShowNewLocation] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    
    setUploading(true);
    const newPhotos: string[] = [];
    
    for (const file of Array.from(e.target.files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('collection-photos')
        .upload(fileName, file);
      
      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('collection-photos')
          .getPublicUrl(fileName);
        newPhotos.push(publicUrl);
      }
    }
    
    setPhotos([...photos, ...newPhotos]);
    setUploading(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleCreateLocation = async () => {
    if (!newLocation.trim()) return;
    
    try {
      const loc = await createLocation.mutateAsync({ name: newLocation.trim() });
      setFormData({ ...formData, location_id: loc.id });
      setNewLocation('');
      setShowNewLocation(false);
      toast.success('Ubicación creada');
    } catch (error) {
      toast.error('Error al crear ubicación');
    }
  };

  const handleSubmit = async () => {
    if (!formData.nickname.trim()) {
      toast.error('El apodo es obligatorio');
      return;
    }
    
    try {
      await createPlant.mutateAsync({
        nickname: formData.nickname.trim(),
        scientific_name: formData.scientific_name || null,
        common_name: formData.common_name || null,
        status: formData.status,
        location_id: formData.location_id || null,
        location_text: formData.location_text || null,
        purchase_date: formData.purchase_date || null,
        next_checkin_date: formData.next_checkin_date || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        photos,
        source_plant_id: null,
      });
      
      toast.success('Planta añadida a tu colección');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Error al añadir la planta');
    }
  };

  const resetForm = () => {
    setFormData({
      nickname: '',
      scientific_name: '',
      common_name: '',
      status: 'alive',
      location_id: '',
      location_text: '',
      purchase_date: '',
      next_checkin_date: '',
      tags: '',
    });
    setPhotos([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir planta a mi colección</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Photos */}
          <div className="space-y-2">
            <Label>Fotos</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative w-20 h-20">
                  <img src={photo} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
              </label>
            </div>
          </div>
          
          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname">Apodo *</Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="Ej: Mi monstera del salón"
            />
          </div>
          
          {/* Scientific & Common names */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scientific_name">Nombre científico</Label>
              <Input
                id="scientific_name"
                value={formData.scientific_name}
                onChange={(e) => setFormData({ ...formData, scientific_name: e.target.value })}
                placeholder="Monstera deliciosa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="common_name">Nombre común</Label>
              <Input
                id="common_name"
                value={formData.common_name}
                onChange={(e) => setFormData({ ...formData, common_name: e.target.value })}
                placeholder="Costilla de Adán"
              />
            </div>
          </div>
          
          {/* Status */}
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as PlantStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Location */}
          <div className="space-y-2">
            <Label>Ubicación</Label>
            {!showNewLocation ? (
              <div className="flex gap-2">
                <Select
                  value={formData.location_id}
                  onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewLocation(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Nueva ubicación"
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateLocation}
                  disabled={createLocation.isPending}
                >
                  {createLocation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewLocation(false)}
                >
                  Cancelar
                </Button>
              </div>
            )}
            <Input
              value={formData.location_text}
              onChange={(e) => setFormData({ ...formData, location_text: e.target.value })}
              placeholder="O describe la ubicación..."
              className="mt-2"
            />
          </div>
          
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Fecha de compra</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_checkin_date">Próximo chequeo</Label>
              <Input
                id="next_checkin_date"
                type="date"
                value={formData.next_checkin_date}
                onChange={(e) => setFormData({ ...formData, next_checkin_date: e.target.value })}
              />
            </div>
          </div>
          
          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Etiquetas (separadas por coma)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="interior, tropical, favorita"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createPlant.isPending}>
            {createPlant.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Añadir planta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPlantDialog;
