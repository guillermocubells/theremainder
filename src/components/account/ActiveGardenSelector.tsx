import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Leaf, Loader2, Sun, Droplets, Wind } from 'lucide-react';
import { toast } from 'sonner';

interface GardenAddress {
  id: string;
  full_name: string;
  city: string;
  province: string;
  climate_zone: string | null;
  sun_exposure: string | null;
  soil_type: string | null;
  avg_annual_rainfall_mm: number | null;
}

const sunExposureLabels: Record<string, string> = {
  full_sun: 'Pleno sol',
  partial_shade: 'Semisombra',
  shade: 'Sombra',
};

const soilTypeLabels: Record<string, string> = {
  sandy: 'Arenoso',
  loamy: 'Franco',
  clay: 'Arcilloso',
  rocky: 'Rocoso',
  peat: 'Turboso',
  mixed: 'Mixto',
};

export const useGardenAddresses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['garden-addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('addresses')
        .select('id, full_name, city, province, climate_zone, sun_exposure, soil_type, avg_annual_rainfall_mm')
        .eq('user_id', user.id)
        .eq('is_garden_location', true);
      
      if (error) throw error;
      return data as GardenAddress[];
    },
    enabled: !!user,
  });
};

export const useActiveGardenAddresses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-garden-addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('active_garden_addresses')
        .select('address_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(d => d.address_id);
    },
    enabled: !!user,
  });
};

export const useToggleActiveGarden = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ addressId, isActive }: { addressId: string; isActive: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      if (isActive) {
        const { error } = await supabase
          .from('active_garden_addresses')
          .insert({ user_id: user.id, address_id: addressId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('active_garden_addresses')
          .delete()
          .eq('user_id', user.id)
          .eq('address_id', addressId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-garden-addresses', user?.id] });
    },
    onError: () => {
      toast.error('Error al actualizar la selección');
    },
  });
};

const ActiveGardenSelector = () => {
  const { data: gardenAddresses, isLoading: loadingAddresses } = useGardenAddresses();
  const { data: activeAddresses, isLoading: loadingActive } = useActiveGardenAddresses();
  const toggleActive = useToggleActiveGarden();

  const isLoading = loadingAddresses || loadingActive;

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!gardenAddresses || gardenAddresses.length === 0) {
    return null;
  }

  const handleToggle = (addressId: string, currentlyActive: boolean) => {
    toggleActive.mutate({ addressId, isActive: !currentlyActive });
  };

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" />
          Direcciones activas para recomendaciones
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecciona los jardines que usarás para recibir recomendaciones personalizadas
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {gardenAddresses.map((address) => {
          const isActive = activeAddresses?.includes(address.id) || false;
          
          return (
            <div
              key={address.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                isActive ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
              }`}
            >
              <Checkbox
                id={`garden-${address.id}`}
                checked={isActive}
                onCheckedChange={() => handleToggle(address.id, isActive)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <Label 
                  htmlFor={`garden-${address.id}`} 
                  className="font-medium cursor-pointer flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {address.full_name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {address.city}, {address.province}
                </p>
                
                {/* Garden profile summary */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {address.climate_zone && (
                    <Badge variant="outline" className="text-xs">
                      Zona {address.climate_zone}
                    </Badge>
                  )}
                  {address.sun_exposure && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Sun className="h-3 w-3" />
                      {sunExposureLabels[address.sun_exposure] || address.sun_exposure}
                    </Badge>
                  )}
                  {address.soil_type && (
                    <Badge variant="outline" className="text-xs">
                      {soilTypeLabels[address.soil_type] || address.soil_type}
                    </Badge>
                  )}
                  {address.avg_annual_rainfall_mm && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      {address.avg_annual_rainfall_mm}mm
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {activeAddresses && activeAddresses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Selecciona al menos un jardín para activar las recomendaciones personalizadas
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveGardenSelector;
