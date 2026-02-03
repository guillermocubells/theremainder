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
import { Progress } from '@/components/ui/progress';
import { 
  Leaf, 
  MoreVertical, 
  ShoppingCart,
  Eye,
  Archive,
  CheckCircle2,
  Trash2,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMoveWishlistItem, useDeleteWishlistItem } from '@/hooks/wishlist/useWishlistItems';
import { useUpdateOwnedPlant } from '@/hooks/collection/useOwnedPlants';
import { useDeleteStockNotification } from '@/hooks/collection/useStockNotifications';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface KanbanPlantCardProps {
  item: PlantItem;
}

// Mock viability score - in production this would come from the item or be calculated
const getViabilityScore = (item: PlantItem): number => {
  // For owned plants with observations, use health as proxy
  if (item.collectionData?.lastObservation) {
    const conditionScores = {
      healthy: 90,
      okay: 70,
      concern: 45,
      critical: 20,
    };
    return conditionScores[item.collectionData.lastObservation.condition] || 70;
  }
  // Default score for items without health data
  return 70;
};

const getViabilityColor = (score: number): string => {
  if (score >= 70) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

const getViabilityLabel = (score: number): string => {
  if (score >= 70) return 'text-green-700 dark:text-green-400';
  if (score >= 50) return 'text-amber-700 dark:text-amber-400';
  return 'text-red-700 dark:text-red-400';
};

const formatAddedDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7) {
    return `Añadida ${formatDistanceToNow(date, { addSuffix: false, locale: es })}`;
  }
  return `Añadida el ${format(date, "d MMM yyyy", { locale: es })}`;
};

export const KanbanPlantCard = ({ item }: KanbanPlantCardProps) => {
  const navigate = useNavigate();
  const moveWishlist = useMoveWishlistItem();
  const deleteWishlist = useDeleteWishlistItem();
  const updateOwned = useUpdateOwnedPlant();
  const deleteStockNotification = useDeleteStockNotification();
  
  const viabilityScore = getViabilityScore(item);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardClick = () => {
    if (item.sourceType === 'owned') {
      navigate(`/collection/plant/${item.sourceId}`);
    } else if (item.sourceType === 'stock_notification') {
      navigate(`/plant/${item.sourceId}`);
    } else if (item.wishlistData?.catalogProductId) {
      navigate(`/plant/${item.wishlistData.catalogProductId}`);
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
    const productId = item.wishlistData?.catalogProductId || 
                      (item.sourceType === 'stock_notification' ? item.sourceId : null);
    if (productId) {
      navigate(`/plant/${productId}`);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.sourceType === 'stock_notification') {
      deleteStockNotification.mutate(item.sourceId, {
        onSuccess: () => {
          toast.success('Planta eliminada');
        },
      });
    } else if (item.sourceType === 'wishlist') {
      deleteWishlist.mutate(item.sourceId, {
        onSuccess: () => {
          toast.success('Planta eliminada');
        },
      });
    }
  };

  return (
    <Card 
      className="hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
      draggable
      onDragStart={handleDragStart}
      onClick={handleCardClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Image with drag handle overlay */}
          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Leaf className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            {/* Drag indicator on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <GripVertical className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                {/* Scientific Name (Title) */}
                <h4 className="font-semibold text-sm text-foreground truncate leading-tight">
                  {item.scientificName || item.name}
                </h4>
                {/* Common Name */}
                {item.commonName && item.scientificName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.commonName}
                  </p>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 -mr-1 -mt-1">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {item.sourceType === 'wishlist' && (
                    <>
                      {item.wishlistData?.catalogProductId && (
                        <DropdownMenuItem onClick={handleViewCatalog}>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Ver en catálogo
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleMarkPurchased}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como adquirida
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleRemove}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Ya no me interesa
                      </DropdownMenuItem>
                    </>
                  )}
                  {item.sourceType === 'stock_notification' && (
                    <>
                      <DropdownMenuItem onClick={handleViewCatalog}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Ver en catálogo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleRemove}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
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

            {/* Viability Score */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Viabilidad</span>
                <span className={cn("text-xs font-medium", getViabilityLabel(viabilityScore))}>
                  {viabilityScore}%
                </span>
              </div>
              <Progress 
                value={viabilityScore} 
                className="h-1.5"
                indicatorClassName={getViabilityColor(viabilityScore)}
              />
            </div>

            {/* Added Date */}
            <p className="text-[10px] text-muted-foreground mt-2">
              {formatAddedDate(item.createdAt)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
