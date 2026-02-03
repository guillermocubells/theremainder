import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Edit2, Trash2, Star, Leaf, Sun, Droplets } from 'lucide-react';
import { Address } from '@/hooks/useAddresses';

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

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (addressId: string) => void;
  onSetDefault: (address: Address) => void;
}

const AddressCard = ({ address, onEdit, onDelete, onSetDefault }: AddressCardProps) => {
  const hasGardenProfile = address.is_garden_location;
  
  return (
    <Card className={`${address.is_default ? 'ring-2 ring-primary' : ''} ${hasGardenProfile ? 'border-primary/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              {/* Badges row */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {address.is_default && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Principal
                  </Badge>
                )}
                {hasGardenProfile && (
                  <Badge className="text-xs flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                    <Leaf className="h-3 w-3" />
                    Jardín
                  </Badge>
                )}
              </div>
              
              <p className="font-medium text-foreground">{address.full_name}</p>
              <p className="text-sm text-muted-foreground">{address.street}</p>
              {address.apartment && (
                <p className="text-sm text-muted-foreground">{address.apartment}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {address.postal_code} {address.city}
              </p>
              <p className="text-sm text-muted-foreground">
                {address.province}, {address.country}
              </p>
              {address.phone && (
                <p className="text-sm text-muted-foreground/80 mt-1">{address.phone}</p>
              )}
              
              {/* Garden profile summary */}
              {hasGardenProfile && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Leaf className="h-3 w-3" />
                    Perfil del jardín
                  </p>
                  <div className="flex flex-wrap gap-1.5">
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
                        {address.avg_annual_rainfall_mm}mm/año
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onEdit(address)}
              aria-label="Editar dirección"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onDelete(address.id)}
              aria-label="Eliminar dirección"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        
        {!address.is_default && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => onSetDefault(address)}
          >
            Establecer como principal
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AddressCard;
