import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateObservation, ObservationCondition } from '@/hooks/collection/useObservations';
import { OwnedPlant } from '@/hooks/collection/useOwnedPlants';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AddObservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plants: OwnedPlant[];
  preselectedPlantId?: string;
}

const conditionOptions: { value: ObservationCondition; label: string; color: string }[] = [
  { value: 'healthy', label: 'Saludable', color: 'text-green-600' },
  { value: 'okay', label: 'Aceptable', color: 'text-yellow-600' },
  { value: 'concern', label: 'Preocupante', color: 'text-orange-600' },
  { value: 'critical', label: 'Crítico', color: 'text-red-600' },
];

const AddObservationDialog = ({ 
  open, 
  onOpenChange, 
  plants,
  preselectedPlantId 
}: AddObservationDialogProps) => {
  const { user } = useAuth();
  const createObservation = useCreateObservation();
  
  const [formData, setFormData] = useState({
    owned_plant_id: preselectedPlantId || '',
    condition: 'healthy' as ObservationCondition,
    observation_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    
    setUploading(true);
    const newPhotos: string[] = [];
    
    for (const file of Array.from(e.target.files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/obs-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
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

  const handleSubmit = async () => {
    if (!formData.owned_plant_id) {
      toast.error('Selecciona una planta');
      return;
    }
    
    try {
      await createObservation.mutateAsync({
        owned_plant_id: formData.owned_plant_id,
        condition: formData.condition,
        observation_date: formData.observation_date,
        notes: formData.notes || null,
        photos,
      });
      
      toast.success('Observación registrada');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Error al registrar observación');
    }
  };

  const resetForm = () => {
    setFormData({
      owned_plant_id: preselectedPlantId || '',
      condition: 'healthy',
      observation_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setPhotos([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar observación</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Plant selection */}
          <div className="space-y-2">
            <Label>Planta *</Label>
            <Select
              value={formData.owned_plant_id}
              onValueChange={(value) => setFormData({ ...formData, owned_plant_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar planta" />
              </SelectTrigger>
              <SelectContent>
                {plants.map(plant => (
                  <SelectItem key={plant.id} value={plant.id}>{plant.nickname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Date & Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="observation_date">Fecha</Label>
              <Input
                id="observation_date"
                type="date"
                value={formData.observation_date}
                onChange={(e) => setFormData({ ...formData, observation_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value as ObservationCondition })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditionOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Describe lo que observas..."
              rows={3}
            />
          </div>
          
          {/* Photos */}
          <div className="space-y-2">
            <Label>Fotos</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative w-16 h-16">
                  <img src={photo} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
              </label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createObservation.isPending}>
            {createObservation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Guardar observación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddObservationDialog;
