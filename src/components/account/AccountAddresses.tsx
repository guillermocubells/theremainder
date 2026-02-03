import { useState } from 'react';
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, Address, AddressInput } from '@/hooks/useAddresses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MapPin, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AddressCard from './AddressCard';
import ActiveGardenSelector from './ActiveGardenSelector';
import GardenProfileForm, { GardenProfileData } from './GardenProfileForm';

const emptyAddress: AddressInput = {
  full_name: '',
  street: '',
  apartment: '',
  city: '',
  postal_code: '',
  province: '',
  country: 'España',
  phone: '',
  is_default: false,
  // Garden profile fields
  is_garden_location: false,
  climate_zone: null,
  avg_annual_rainfall_mm: null,
  sun_exposure: null,
  soil_type: null,
  drainage: null,
  wind_exposure: null,
  altitude_m: null,
  min_winter_temp_c: null,
  humidity_level: null,
  frost_frequency: null,
  soil_ph: null,
  garden_notes: null,
};

const AccountAddresses = () => {
  const { data: addresses, isLoading } = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressInput>(emptyAddress);

  const handleOpenModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        full_name: address.full_name,
        street: address.street,
        apartment: address.apartment || '',
        city: address.city,
        postal_code: address.postal_code,
        province: address.province,
        country: address.country,
        phone: address.phone || '',
        is_default: address.is_default,
        // Garden profile fields
        is_garden_location: address.is_garden_location,
        climate_zone: address.climate_zone,
        avg_annual_rainfall_mm: address.avg_annual_rainfall_mm,
        sun_exposure: address.sun_exposure,
        soil_type: address.soil_type,
        drainage: address.drainage,
        wind_exposure: address.wind_exposure,
        altitude_m: address.altitude_m,
        min_winter_temp_c: address.min_winter_temp_c,
        humidity_level: address.humidity_level,
        frost_frequency: address.frost_frequency,
        soil_ph: address.soil_ph,
        garden_notes: address.garden_notes,
      });
    } else {
      setEditingAddress(null);
      // Si no hay direcciones, marcar automáticamente como principal
      const shouldBeDefault = !addresses || addresses.length === 0;
      setFormData({ ...emptyAddress, is_default: shouldBeDefault });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAddress) {
        await updateAddress.mutateAsync({ id: editingAddress.id, ...formData });
        toast.success('Dirección actualizada');
      } else {
        await createAddress.mutateAsync(formData);
        toast.success('Dirección añadida');
      }
      setIsModalOpen(false);
      setFormData(emptyAddress);
      setEditingAddress(null);
    } catch (error) {
      toast.error('Error al guardar la dirección');
    }
  };

  const handleDelete = async () => {
    if (!addressToDelete) return;
    
    try {
      await deleteAddress.mutateAsync(addressToDelete);
      toast.success('Dirección eliminada');
    } catch (error) {
      toast.error('Error al eliminar la dirección');
    } finally {
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    }
  };

  const handleSetDefault = async (address: Address) => {
    try {
      await updateAddress.mutateAsync({ id: address.id, is_default: true });
      toast.success('Dirección principal actualizada');
    } catch (error) {
      toast.error('Error al actualizar la dirección');
    }
  };

  const handleGardenProfileChange = (gardenData: GardenProfileData) => {
    setFormData(prev => ({
      ...prev,
      ...gardenData,
    }));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis direcciones</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus direcciones de envío y jardines</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Añadir dirección
        </Button>
      </div>

      {/* Active Garden Selector */}
      <ActiveGardenSelector />

      {addresses && addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleOpenModal}
              onDelete={(id) => {
                setAddressToDelete(id);
                setDeleteDialogOpen(true);
              }}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Sin direcciones</h3>
            <p className="text-muted-foreground mb-4">
              Añade una dirección para agilizar tus compras y configurar tu jardín
            </p>
            <Button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Añadir dirección
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Address form modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Editar dirección' : 'Nueva dirección'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Calle y número *</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apartment">Piso / Puerta (opcional)</Label>
              <Input
                id="apartment"
                value={formData.apartment || ''}
                onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Código postal *</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province">Provincia *</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked as boolean })}
              />
              <Label htmlFor="is_default" className="text-sm font-normal">
                Establecer como dirección principal
              </Label>
            </div>

            {/* Garden Profile Section */}
            <GardenProfileForm
              data={{
                is_garden_location: formData.is_garden_location,
                climate_zone: formData.climate_zone,
                avg_annual_rainfall_mm: formData.avg_annual_rainfall_mm,
                sun_exposure: formData.sun_exposure,
                soil_type: formData.soil_type,
                drainage: formData.drainage,
                wind_exposure: formData.wind_exposure,
                altitude_m: formData.altitude_m,
                min_winter_temp_c: formData.min_winter_temp_c,
                humidity_level: formData.humidity_level,
                frost_frequency: formData.frost_frequency,
                soil_ph: formData.soil_ph,
                garden_notes: formData.garden_notes,
              }}
              onChange={handleGardenProfileChange}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90"
                disabled={createAddress.isPending || updateAddress.isPending}
              >
                {(createAddress.isPending || updateAddress.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingAddress ? (
                  'Guardar cambios'
                ) : (
                  'Añadir dirección'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar dirección?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La dirección será eliminada permanentemente.
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

export default AccountAddresses;