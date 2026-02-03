import { useParams } from 'react-router-dom';
import { usePublicPlant } from '@/hooks/collection/usePublicSharing';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  alive: 'Viva',
  dormant: 'Latente',
  sick: 'Necesita cuidados',
  removed: 'Retirada',
};

const conditionLabels: Record<string, string> = {
  healthy: 'Saludable',
  okay: 'Aceptable',
  concern: 'Necesita atención',
  critical: 'Crítico',
};

const conditionColors: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800',
  okay: 'bg-yellow-100 text-yellow-800',
  concern: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const PublicPlantPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: plant, isLoading, error } = usePublicPlant(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!plant || error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Planta no encontrada</h1>
            <p className="text-muted-foreground">
              Esta planta no existe o no está disponible públicamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header with logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-green-700 mb-2">
            <Leaf className="h-6 w-6" />
            <span className="font-semibold">Fronda Prima</span>
          </div>
          <p className="text-sm text-muted-foreground">Colección de plantas</p>
        </div>

        <Card className="overflow-hidden">
          {/* Photo */}
          {plant.photos && plant.photos.length > 0 ? (
            <img 
              src={plant.photos[0]} 
              alt={plant.nickname}
              className="w-full h-64 sm:h-80 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-green-100 flex items-center justify-center">
              <Leaf className="h-16 w-16 text-green-300" />
            </div>
          )}
          
          <CardContent className="p-6">
            {/* Plant info */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">{plant.nickname}</h1>
              {(plant.scientific_name || plant.common_name) && (
                <p className="text-muted-foreground italic mt-1">
                  {plant.scientific_name || plant.common_name}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge variant="secondary">
                  {statusLabels[plant.status] || plant.status}
                </Badge>
              </div>
            </div>
            
            {/* Recent observations */}
            {plant.observations && plant.observations.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Observaciones recientes</h2>
                <div className="space-y-3">
                  {plant.observations.map((obs: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={conditionColors[obs.condition]}>
                          {conditionLabels[obs.condition]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(obs.observation_date), "d 'de' MMMM", { locale: es })}
                        </span>
                      </div>
                      {obs.notes && (
                        <p className="text-sm text-foreground">{obs.notes}</p>
                      )}
                      {obs.photos?.[0] && (
                        <img 
                          src={obs.photos[0]} 
                          alt="" 
                          className="mt-3 w-full h-32 object-cover rounded-lg"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Página generada con{' '}
            <a 
              href="https://frondaprima.lovable.app" 
              className="text-green-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fronda Prima
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicPlantPage;
