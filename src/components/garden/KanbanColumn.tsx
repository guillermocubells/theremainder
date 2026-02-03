import { useState } from 'react';
import { PlantItem } from '@/hooks/garden/types';
import { KanbanPlantCard } from './KanbanPlantCard';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export type KanbanColumnId = 'searching' | 'in_collection' | 'watching' | 'archived';

interface KanbanColumnProps {
  id: KanbanColumnId;
  title: string;
  items: PlantItem[];
  icon: React.ReactNode;
  colorClass: string;
  emptyMessage: string;
  onDrop: (itemId: string, columnId: KanbanColumnId) => void;
  isCollapsedMobile?: boolean;
  onToggleCollapse?: () => void;
}

export const KanbanColumn = ({ 
  id,
  title, 
  items, 
  icon, 
  colorClass, 
  emptyMessage,
  onDrop,
  isCollapsedMobile,
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
      onDrop(itemId, id);
    }
  };

  return (
    <div 
      className={cn(
        "flex flex-col rounded-xl border bg-card transition-all h-full",
        isDragOver && "ring-2 ring-primary ring-offset-2"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between p-3 sm:p-4 border-b rounded-t-xl",
        colorClass
      )}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
          <span className="bg-background/80 text-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        {onToggleCollapse && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 md:hidden"
            onClick={onToggleCollapse}
          >
            {isCollapsedMobile ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        )}
      </div>
      
      {/* Column Content */}
      {!isCollapsedMobile && (
        <ScrollArea className="flex-1 max-h-[calc(100vh-280px)] md:max-h-[600px]">
          <div className="p-3 space-y-3">
            {items.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm text-center px-4">
                {emptyMessage}
              </div>
            ) : (
              items.map(item => (
                <KanbanPlantCard key={item.id} item={item} />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
