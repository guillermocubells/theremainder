import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WishlistItem, useDeleteWishlistItem, useMoveWishlistItem, WishlistStatus } from '@/hooks/wishlist';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Bell, BellOff, Edit, Trash2, ArrowRight, ShoppingCart, ExternalLink, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WishlistCardProps {
  item: WishlistItem;
}

export const WishlistCard = ({ item }: WishlistCardProps) => {
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteItem = useDeleteWishlistItem();
  const moveItem = useMoveWishlistItem();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('itemId', item.id);
  };

  const handleDelete = () => {
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        toast.success('Planta eliminada de la lista');
        setIsDeleteDialogOpen(false);
      },
      onError: () => {
        toast.error('Error al eliminar');
      },
    });
  };

  const handleMove = (newStatus: WishlistStatus) => {
    moveItem.mutate(
      { id: item.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success('Planta movida');
        },
      }
    );
  };

  const getPriorityColor = () => {
    switch (item.priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityLabel = () => {
    switch (item.priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
    }
  };

  const getSourceIcon = () => {
    switch (item.source_preference) {
      case 'frondaprima': return <Leaf className="h-3 w-3" />;
      case 'specific': return <ExternalLink className="h-3 w-3" />;
      default: return null;
    }
  };

  const imageUrl = item.image_url || item.plants?.thumbnail_url || '/placeholder.svg';
  const isFromCatalog = !!item.catalog_product_id;
  const isInStock = item.plants?.stock_qty && item.plants.stock_qty > 0;

  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            {/* Image */}
            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
              <img
                src={imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-medium text-sm truncate">{item.name}</h4>
                  {item.scientific_name && (
                    <p className="text-xs text-muted-foreground italic truncate">
                      {item.scientific_name}
                    </p>
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/account/wishlist/${item.id}`)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {item.status !== 'wishlist' && (
                      <DropdownMenuItem onClick={() => handleMove('wishlist')}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Mover a Deseos
                      </DropdownMenuItem>
                    )}
                    {item.status !== 'looking' && (
                      <DropdownMenuItem onClick={() => handleMove('looking')}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Mover a Buscando
                      </DropdownMenuItem>
                    )}
                    {item.status !== 'acquired' && (
                      <DropdownMenuItem onClick={() => handleMove('acquired')}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Marcar Adquirida
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant="secondary" className={cn("text-xs", getPriorityColor())}>
                  {getPriorityLabel()}
                </Badge>
                
                {item.notify_availability && (
                  <Badge variant="outline" className="text-xs">
                    <Bell className="h-3 w-3 mr-1" />
                    Notificar
                  </Badge>
                )}
                
                {getSourceIcon() && (
                  <Badge variant="outline" className="text-xs">
                    {getSourceIcon()}
                    {item.source_preference === 'frondaprima' ? 'Frondaprima' : item.provider_name}
                  </Badge>
                )}
              </div>

              {/* Catalog plant actions */}
              {isFromCatalog && item.status !== 'acquired' && (
                <div className="mt-2 flex items-center gap-2">
                  {isInStock ? (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="h-6 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/plant/${item.plants?.id}`);
                      }}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      {item.plants?.price?.toFixed(2)}€
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Sin stock
                    </Badge>
                  )}
                </div>
              )}

              {/* Link to owned plant */}
              {item.acquired_owned_plant_id && (
                <Button
                  size="sm"
                  variant="link"
                  className="h-auto p-0 text-xs text-primary"
                  onClick={() => navigate(`/collection/plant/${item.acquired_owned_plant_id}`)}
                >
                  Ver en mi colección →
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar de la lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{item.name}" de tu lista de deseos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
