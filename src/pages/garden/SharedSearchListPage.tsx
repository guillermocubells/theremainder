import { useParams, Link } from 'react-router-dom';
import { usePublicSearchList } from '@/hooks/garden/useSharedSearchList';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Search, Leaf, ShoppingCart, ExternalLink, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const SharedSearchListPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const isMobile = useIsMobile();
  const { data, isLoading, error } = usePublicSearchList(slug || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Lista no encontrada</h1>
            <p className="text-muted-foreground mb-6">
              Esta lista no existe o ya no está disponible públicamente
            </p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ir al catálogo
              </Link>
            </Button>
          </div>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  const { sharedList, wishlistItems, stockNotifications } = data;

  // Combine all searching items
  const allItems = [
    ...wishlistItems.map(item => ({
      id: item.id,
      type: 'wishlist' as const,
      name: item.plants?.name || item.name,
      scientificName: item.plants?.scientific_name || item.scientific_name,
      imageUrl: item.plants?.thumbnail_url || item.image_url,
      priority: item.priority,
      notes: item.notes || item.variety_notes,
      isInCatalog: !!item.catalog_product_id,
      catalogId: item.catalog_product_id,
      isInStock: item.plants?.is_in_stock,
      price: item.plants?.price,
    })),
    ...stockNotifications.map(notification => ({
      id: notification.id,
      type: 'stock' as const,
      name: notification.plants?.name || 'Planta del catálogo',
      scientificName: notification.plants?.scientific_name,
      imageUrl: notification.plants?.thumbnail_url,
      priority: 'medium' as const,
      notes: null,
      isInCatalog: true,
      catalogId: notification.plant_id,
      isInStock: notification.plants?.is_in_stock,
      price: notification.plants?.price,
    })),
  ];

  // Remove duplicates (same catalog_product_id)
  const uniqueItems = allItems.filter((item, index, self) =>
    index === self.findIndex(i => 
      (item.catalogId && i.catalogId === item.catalogId) || 
      (!item.catalogId && i.id === item.id)
    )
  );

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'high':
        return <Badge className="bg-accent text-accent-foreground">Alta prioridad</Badge>;
      case 'medium':
        return <Badge variant="secondary">Media</Badge>;
      case 'low':
        return <Badge variant="outline">Baja</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{sharedList.title || 'Lista de búsqueda'}</h1>
              <p className="text-muted-foreground">
                {uniqueItems.length} {uniqueItems.length === 1 ? 'planta' : 'plantas'} en búsqueda
              </p>
            </div>
          </div>
          {sharedList.description && (
            <p className="text-muted-foreground mt-2">{sharedList.description}</p>
          )}
        </div>

        {/* Items Grid */}
        {uniqueItems.length === 0 ? (
          <div className="text-center py-16">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Esta lista aún no tiene plantas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {uniqueItems.map((item) => (
              <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                {/* Image */}
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Leaf className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Priority badge */}
                  <div className="absolute top-2 right-2">
                    {getPriorityBadge(item.priority)}
                  </div>

                  {/* Stock indicator */}
                  {item.isInCatalog && (
                    <div className="absolute bottom-2 left-2">
                      {item.isInStock ? (
                        <Badge className="bg-primary/90 text-primary-foreground">En stock</Badge>
                      ) : (
                        <Badge variant="secondary">Sin stock</Badge>
                      )}
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                  {item.scientificName && (
                    <p className="text-sm text-muted-foreground italic line-clamp-1">
                      {item.scientificName}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {item.notes}
                    </p>
                  )}

                  {item.price && (
                    <p className="font-semibold text-primary mt-2">
                      {item.price.toFixed(2)}€
                    </p>
                  )}

                  {/* Action buttons */}
                  {item.isInCatalog && item.catalogId && (
                    <div className="mt-3 flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/plant/${item.catalogId}`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver planta
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            ¿Tienes alguna de estas plantas? ¡Ponte en contacto!
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link to="/">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ver catálogo completo
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {!isMobile && <Footer />}
    </div>
  );
};

export default SharedSearchListPage;
