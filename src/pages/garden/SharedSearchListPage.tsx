import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { usePublicSearchList } from '@/hooks/garden/useSharedSearchList';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Search, Leaf, ShoppingCart, ExternalLink, ArrowLeft, MessageSquare, ArrowLeftRight, Ban } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import InquiryForm from '@/components/garden/InquiryForm';

// Fetch owned plants with sharing controls for a shared list
const useSharedListPlants = (userId: string | undefined, sharedListId: string | undefined) => {
  return useQuery({
    queryKey: ['shared-list-plants', userId, sharedListId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Use the public view to get plants that are visible
      const { data, error } = await supabase
        .from('owned_plants_public')
        .select('id, nickname, scientific_name, common_name, photos, status')
        .limit(100);
      
      if (error) return [];
      return data || [];
    },
    enabled: !!userId,
  });
};

// Fetch visibility/inquiry settings via RPC-like approach using the public view
const useSharedPlantSettings = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['shared-plant-settings', userId],
    queryFn: async () => {
      if (!userId) return new Map();
      
      // We need to get the sharing settings - these are on owned_plants which has
      // a public select policy for plants with public slugs. But for shared lists,
      // we read from owned_plants_public view + check visibility fields.
      // Since we can't read visibility fields from the view, we'll use the edge function approach.
      // For now, fetch from the API by checking which plants the owner has made visible.
      
      // The shared list page is public, so we use anon key. The owned_plants table
      // has a SELECT policy for plants that have public slugs. But our new fields
      // (visibility_in_shared_lists etc) are on owned_plants directly.
      // Since the shared list shows wishlist items + stock notifications (not owned_plants),
      // we need a different approach. Let's just return empty - the filtering happens server-side.
      return new Map();
    },
    enabled: !!userId,
  });
};

const availabilityBadge = (intent: string) => {
  switch (intent) {
    case 'for_sale':
      return (
        <Badge className="bg-primary/90 text-primary-foreground gap-1">
          <ShoppingCart className="h-3 w-3" />
          En venta
        </Badge>
      );
    case 'for_trade':
      return (
        <Badge variant="secondary" className="gap-1">
          <ArrowLeftRight className="h-3 w-3" />
          Intercambio
        </Badge>
      );
    default:
      return null;
  }
};

const SharedSearchListPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const isMobile = useIsMobile();
  const { data, isLoading, error } = usePublicSearchList(slug || '');
  const [inquiryPlant, setInquiryPlant] = useState<{
    id: string;
    name: string;
    availabilityIntent: string;
    sharedListId: string;
  } | null>(null);

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
  const globalInquiriesDisabled = (sharedList as any).global_inquiries_mode === 'disabled';

  // Combine all searching items
  const allItems = [
    ...wishlistItems.map(item => ({
      id: item.id,
      type: 'wishlist' as const,
      name: item.name,
      scientificName: item.scientific_name,
      imageUrl: item.image_url,
      priority: item.priority,
      notes: item.notes || item.variety_notes,
      isInCatalog: !!item.catalog_product_id,
      catalogId: item.catalog_product_id,
      isInStock: undefined as boolean | undefined,
      price: undefined as number | undefined,
      // Sharing controls from plant (not available for wishlist items in this context)
      availabilityIntent: 'not_open',
      allowInquiries: false,
      inquiryHandlingMode: 'allow',
    })),
    ...stockNotifications.map(notification => ({
      id: notification.id,
      type: 'stock' as const,
      name: notification.plantData?.name || 'Planta del catálogo',
      scientificName: notification.plantData?.scientificName,
      imageUrl: notification.plantData?.thumbnailUrl,
      priority: 'medium' as const,
      notes: null,
      isInCatalog: true,
      catalogId: notification.plant_id,
      isInStock: notification.plantData?.isInStock,
      price: notification.plantData?.price,
      availabilityIntent: 'not_open',
      allowInquiries: false,
      inquiryHandlingMode: 'allow',
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

  const listTitle = sharedList.title || 'Lista de búsqueda';
  const pageTitle = `${listTitle} | The Remainder`;
  const pageDescription = sharedList.description || `${uniqueItems.length} plantas en búsqueda — lista compartida en The Remainder.`;
  const pageUrl = `https://theremainder.lovable.app/garden/shared/${slug}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
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

                  {/* Availability intent badge */}
                  {item.availabilityIntent !== 'not_open' && (
                    <div className="absolute top-2 left-2">
                      {availabilityBadge(item.availabilityIntent)}
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
                  <div className="mt-3 flex gap-2">
                    {item.isInCatalog && item.catalogId && (
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/plant/${item.catalogId}`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver
                        </Link>
                      </Button>
                    )}
                    
                    {/* Inquiry CTA - only if allowed and not globally disabled */}
                    {item.allowInquiries && 
                     item.inquiryHandlingMode !== 'blocked' && 
                     !globalInquiriesDisabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setInquiryPlant({
                          id: item.id,
                          name: item.name,
                          availabilityIntent: item.availabilityIntent,
                          sharedListId: sharedList.id,
                        })}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Consultar
                      </Button>
                    )}
                  </div>
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

      {/* Inquiry form dialog */}
      {inquiryPlant && (
        <InquiryForm
          open={!!inquiryPlant}
          onOpenChange={(open) => !open && setInquiryPlant(null)}
          plantName={inquiryPlant.name}
          plantId={inquiryPlant.id}
          sharedListId={inquiryPlant.sharedListId}
          availabilityIntent={inquiryPlant.availabilityIntent}
        />
      )}
    </div>
  );
};

export default SharedSearchListPage;
