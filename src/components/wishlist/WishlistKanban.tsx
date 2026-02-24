import { useState } from 'react';
import { WishlistItem, WishlistStatus, useMoveWishlistItem } from '@/hooks/wishlist';
import { WishlistCard } from './WishlistCard';
import { cn } from '@/lib/utils';
import { Heart, Search, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WishlistKanbanProps {
  wishlistItems: WishlistItem[];
  lookingItems: WishlistItem[];
  acquiredItems: WishlistItem[];
}

interface KanbanColumnProps {
  title: string;
  status: WishlistStatus;
  items: WishlistItem[];
  icon: React.ReactNode;
  colorClass: string;
  onDrop: (itemId: string, newStatus: WishlistStatus) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const KanbanColumn = ({ 
  title, 
  status, 
  items, 
  icon, 
  colorClass, 
  onDrop,
  isCollapsed,
  onToggleCollapse
}: KanbanColumnProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const itemId = e.dataTransfer.getData('itemId');
    if (itemId) {
      onDrop(itemId, status);
    }
  };

  return (
    <div 
      className={cn(
        "flex flex-col rounded-lg border bg-card transition-all",
        isDragOver && "ring-2 ring-primary ring-offset-2",
        isCollapsed && "md:flex-shrink-0 md:w-auto"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={cn(
        "flex items-center justify-between p-4 border-b",
        colorClass
      )}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold">{title}</h3>
          <span className="bg-background/80 text-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 md:hidden"
          onClick={onToggleCollapse}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>
      
      {!isCollapsed && (
        <div className="flex-1 p-3 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              {status === 'wishlist' && 'Añade plantas que deseas'}
              {status === 'looking' && 'Mueve aquí las que buscas activamente'}
              {status === 'acquired' && '¡Tus plantas adquiridas!'}
            </div>
          ) : (
            items.map(item => (
              <WishlistCard key={item.id} item={item} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const WishlistKanban = ({ wishlistItems, lookingItems, acquiredItems }: WishlistKanbanProps) => {
  const [collapsedColumns, setCollapsedColumns] = useState<Record<WishlistStatus, boolean>>({
    wishlist: false,
    looking: false,
    acquired: false,
  });

  const moveItem = useMoveWishlistItem();

  const handleDrop = (itemId: string, newStatus: WishlistStatus) => {
    moveItem.mutate(
      { id: itemId, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Planta movida a "${getStatusLabel(newStatus)}"`);
        },
        onError: () => {
          toast.error('Error al mover la planta');
        },
      }
    );
  };

  const getStatusLabel = (status: WishlistStatus) => {
    switch (status) {
      case 'wishlist': return 'Lista de Deseos';
      case 'looking': return 'Buscando';
      case 'acquired': return 'Adquirida';
    }
  };

  const toggleCollapse = (status: WishlistStatus) => {
    setCollapsedColumns(prev => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <KanbanColumn
        title="Lista de Deseos"
        status="wishlist"
        items={wishlistItems}
        icon={<Heart className="h-5 w-5 text-danger" />}
        colorClass="bg-danger-muted dark:bg-danger-muted"
        onDrop={handleDrop}
        isCollapsed={collapsedColumns.wishlist}
        onToggleCollapse={() => toggleCollapse('wishlist')}
      />
      
      <KanbanColumn
        title="Buscando Activamente"
        status="looking"
        items={lookingItems}
        icon={<Search className="h-5 w-5 text-warning" />}
        colorClass="bg-warning-muted dark:bg-warning-muted"
        onDrop={handleDrop}
        isCollapsed={collapsedColumns.looking}
        onToggleCollapse={() => toggleCollapse('looking')}
      />
      
      <KanbanColumn
        title="Adquiridas"
        status="acquired"
        items={acquiredItems}
        icon={<ShoppingBag className="h-5 w-5 text-success" />}
        colorClass="bg-success-muted dark:bg-success-muted"
        onDrop={handleDrop}
        isCollapsed={collapsedColumns.acquired}
        onToggleCollapse={() => toggleCollapse('acquired')}
      />
    </div>
  );
};
