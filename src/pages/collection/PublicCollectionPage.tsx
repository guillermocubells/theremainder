import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { usePublicCollection } from '@/hooks/collection/useCollectionSharing';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Loader2, FolderOpen, Eye } from 'lucide-react';

const statusLabels: Record<string, string> = {
  alive: 'Viva',
  dormant: 'Latente',
  sick: 'Necesita cuidados',
  removed: 'Retirada',
};

const PublicCollectionPage = () => {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = usePublicCollection(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Colección no disponible</h1>
            <p className="text-muted-foreground">
              Esta colección no existe, no es pública o el enlace ha expirado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const collection = data.collection ?? data;
  const items: any[] = data.items ?? [];
  const pageTitle = `${collection.name} | The Remainder`;
  const pageDescription = collection.description
    ? collection.description.slice(0, 155)
    : `Colección de ${items.length} plantas en The Remainder`;

  return (
    <div className="min-h-screen bg-background py-8">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="container max-w-4xl mx-auto px-4">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-primary mb-2">
            <Leaf className="h-6 w-6" />
            <span className="font-semibold">The Remainder</span>
          </div>
          <p className="text-sm text-muted-foreground">Colección compartida</p>
        </div>

        {/* Collection header */}
        <div className="text-center mb-8">
          {collection.cover_image_url && (
            <img
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-full h-48 sm:h-64 object-cover rounded-xl mb-6"
            />
          )}
          <h1 className="text-3xl font-bold text-foreground">{collection.name}</h1>
          {collection.description && (
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              {collection.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>{items.length} plantas</span>
          </div>
        </div>

        {/* Plants grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item: any) => {
              const plant = item.owned_plants ?? item;
              const photo = plant.photos?.[0];
              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  {photo ? (
                    <img
                      src={photo}
                      alt={plant.nickname || plant.common_name || ''}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-40 bg-muted flex items-center justify-center">
                      <Leaf className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground truncate">
                      {plant.nickname || plant.common_name || 'Sin nombre'}
                    </h3>
                    {plant.scientific_name && (
                      <p className="text-sm text-muted-foreground italic truncate">
                        {plant.scientific_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {statusLabels[plant.status] || plant.status || 'Activa'}
                      </Badge>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Esta colección no tiene plantas todavía</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-sm text-muted-foreground">
            Compartida con{' '}
            <a
              href="https://theremainder.lovable.app"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              The Remainder
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicCollectionPage;
