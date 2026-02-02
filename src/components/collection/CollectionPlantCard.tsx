import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OwnedPlant } from '@/hooks/collection/useOwnedPlants';
import { Leaf, MapPin, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CollectionPlantCardProps {
  plant: OwnedPlant;
}

const statusColors: Record<string, string> = {
  alive: 'bg-green-100 text-green-800',
  dormant: 'bg-yellow-100 text-yellow-800',
  sick: 'bg-orange-100 text-orange-800',
  removed: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  alive: 'Viva',
  dormant: 'Latente',
  sick: 'Enferma',
  removed: 'Eliminada',
};

const CollectionPlantCard = ({ plant }: CollectionPlantCardProps) => {
  const locationName = plant.plant_locations?.name || plant.location_text;
  
  return (
    <Link to={`/collection/plant/${plant.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-0">
          {/* Image */}
          <div className="relative h-40 bg-muted">
            {plant.photos && plant.photos.length > 0 ? (
              <img 
                src={plant.photos[0]} 
                alt={plant.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Leaf className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <Badge className={`absolute top-2 right-2 ${statusColors[plant.status]}`}>
              {statusLabels[plant.status]}
            </Badge>
            {plant.photos && plant.photos.length > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                +{plant.photos.length - 1}
              </span>
            )}
          </div>
          
          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-foreground truncate">{plant.nickname}</h3>
            {(plant.scientific_name || plant.common_name) && (
              <p className="text-sm text-muted-foreground italic truncate">
                {plant.scientific_name || plant.common_name}
              </p>
            )}
            
            <div className="mt-3 space-y-1.5">
              {locationName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{locationName}</span>
                </div>
              )}
              {plant.next_checkin_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Próximo: {format(new Date(plant.next_checkin_date), 'd MMM', { locale: es })}</span>
                </div>
              )}
            </div>
            
            {plant.tags && plant.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {plant.tags.slice(0, 3).map(tag => (
                  <span 
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
                {plant.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{plant.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CollectionPlantCard;
