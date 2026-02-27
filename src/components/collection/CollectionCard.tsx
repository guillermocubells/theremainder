import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collection } from '@/hooks/collection/useCollections';
import { FolderOpen, MoreVertical, Pencil, Archive, Star } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  collection: Collection;
  onEdit: (c: Collection) => void;
  onArchive: (id: string) => void;
}

const CollectionCard = ({ collection, onEdit, onArchive }: Props) => (
  <Card className="hover:shadow-md transition-shadow group">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {collection.cover_image_url ? (
            <img
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-12 h-12 rounded-lg object-cover shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{collection.name}</h3>
              {collection.is_default && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Predeterminada
                </Badge>
              )}
            </div>
            {collection.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {collection.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{collection.item_count ?? 0} plantas</span>
              <span>·</span>
              <span>{format(new Date(collection.created_at), 'd MMM yyyy', { locale: es })}</span>
            </div>
          </div>
        </div>

        {!collection.is_default && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(collection)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onArchive(collection.id)}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </CardContent>
  </Card>
);

export default CollectionCard;
