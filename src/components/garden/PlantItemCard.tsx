import { useNavigate } from 'react-router-dom';
import { PlantItem } from '@/hooks/garden/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Leaf, 
  Bell, 
  BellOff, 
  MoreVertical, 
  MapPin, 
  ShoppingCart,
  Eye,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpdateWishlistItem, useMoveWishlistItem } from '@/hooks/wishlist/useWishlistItems';
import { useUpdateOwnedPlant } from '@/hooks/collection/useOwnedPlants';
import { toast } from 'sonner';

interface PlantItemCardProps {
  item: PlantItem;
}

const statusConfig = {
  searching: {
    label: 'En búsqueda',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    icon: Heart,
  },
  available: {
    label: 'Disponible',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    icon: CheckCircle2,
  },
  purchased: {
    label: 'Comprada',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    icon: ShoppingCart,
  },
  in_collection: {
    label: 'En colección',
    color: 'bg-primary/10 text-primary',
    icon: Leaf,
  },
  archived: {
    label: 'Archivada',
    color: 'bg-muted text-muted-foreground',
    icon: Archive,
  },
};

const healthConfig = {
  healthy: { label: 'Saludable', color: 'text-green-600' },
  okay: { label: 'Aceptable', color: 'text-yellow-600' },
  concern: { label: 'Preocupante', color: 'text-orange-600' },
  critical: { label: 'Crítico', color: 'text-red-600' },
};

export const PlantItemCard = ({ item }: PlantItemCardProps) => {
  const navigate = useNavigate();
  const updateWishlist = useUpdateWishlistItem();
  const moveWishlist = useMoveWishlistItem();
  const updateOwned = useUpdateOwnedPlant();
  
  const config = statusConfig[item.status];
  const StatusIcon = config.icon;

  const handleCardClick = () => {
    if (item.sourceType === 'owned') {
      navigate(`/collection/plant/${item.sourceId}`);
    } else {
      navigate(`/garden/plant/${item.sourceId}?type=wishlist`);
    }
  };

  const handleToggleNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.wishlistData) {
      updateWishlist.mutate({
        id: item.sourceId,
        notify_availability: !item.wishlistData.notifyAvailability,
      }, {
        onSuccess: () => {
          toast.success(item.wishlistData?.notifyAvailability 
            ? 'Alertas desactivadas' 
            : 'Te avisaremos cuando esté disponible'
          );
        },
      });
    }
  };

  const handleMarkPurchased = (e: React.MouseEvent) => {
    e.stopPropagation();
    moveWishlist.mutate({
      id: item.sourceId,
      status: 'acquired',
    }, {
      onSuccess: () => {
        toast.success('¡Planta marcada como adquirida!');
      },
    });
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.sourceType === 'owned') {
      updateOwned.mutate({
        id: item.sourceId,
        status: 'removed',
      }, {
        onSuccess: () => {
          toast.success('Planta archivada');
        },
      });
    }
  };

  const handleViewCatalog = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.wishlistData?.catalogProductId) {
      navigate(`/plant/${item.wishlistData.catalogProductId}`);
    }
  };

  return (
    <Card 
      className="hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Image */}
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Leaf className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                {item.scientificName && (
                  <p className="text-sm text-muted-foreground italic truncate">
                    {item.scientificName}
                  </p>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.sourceType === 'wishlist' && (
                    <>
                      <DropdownMenuItem onClick={handleToggleNotifications}>
                        {item.wishlistData?.notifyAvailability ? (
                          <>
                            <BellOff className="h-4 w-4 mr-2" />
                            Desactivar alertas
                          </>
                        ) : (
                          <>
                            <Bell className="h-4 w-4 mr-2" />
                            Activar alertas
                          </>
                        )}
                      </DropdownMenuItem>
                      {item.wishlistData?.catalogProductId && (
                        <DropdownMenuItem onClick={handleViewCatalog}>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Ver en catálogo
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleMarkPurchased}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como comprada
                      </DropdownMenuItem>
                    </>
                  )}
                  {item.sourceType === 'owned' && (
                    <>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/collection/plant/${item.sourceId}`);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver ficha completa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleArchive}
                        className="text-destructive"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archivar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status badge and indicators */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className={cn("text-xs", config.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              
              {/* Wishlist indicators */}
              {item.sourceType === 'wishlist' && item.wishlistData && (
                <>
                  {item.wishlistData.notifyAvailability && (
                    <Badge variant="outline" className="text-xs">
                      <Bell className="h-3 w-3 mr-1 text-primary" />
                      Alerta
                    </Badge>
                  )}
                  {item.status === 'available' && item.wishlistData.catalogPrice && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      {item.wishlistData.catalogPrice.toFixed(2)}€
                    </Badge>
                  )}
                </>
              )}
              
              {/* Collection indicators */}
              {item.sourceType === 'owned' && item.collectionData && (
                <>
                  {item.collectionData.lastObservation && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", healthConfig[item.collectionData.lastObservation.condition].color)}
                    >
                      {healthConfig[item.collectionData.lastObservation.condition].label}
                    </Badge>
                  )}
                  {item.collectionData.plantStatus === 'sick' && (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                </>
              )}
            </div>

            {/* Secondary info */}
            <div className="mt-2">
              {item.sourceType === 'owned' && item.collectionData?.locationName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{item.collectionData.locationName}</span>
                </div>
              )}
              {item.sourceType === 'wishlist' && item.status === 'searching' && (
                <p className="text-xs text-muted-foreground">
                  Te avisaremos cuando esté disponible
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlantItemCard;
