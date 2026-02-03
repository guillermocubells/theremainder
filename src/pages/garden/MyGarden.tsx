import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMyGarden, useGardenStats } from '@/hooks/garden';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { GardenKanban, GardenEmptyState } from '@/components/garden';
import AddPlantDialog from '@/components/collection/AddPlantDialog';
import { AddWishlistItemDialog } from '@/components/wishlist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Leaf, Plus, Search, Loader2, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const MyGarden = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [addPlantOpen, setAddPlantOpen] = useState(false);
  const [addWishlistOpen, setAddWishlistOpen] = useState(false);

  const { data: plants, isLoading } = useMyGarden({ filter: 'all', search: searchQuery });
  const { data: stats } = useGardenStats();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Back link */}
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Mi cuenta
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Mi Jardín</h1>
              <p className="text-sm text-muted-foreground">
                {stats?.total || 0} plantas en total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAddWishlistOpen(true)}
              className="hidden sm:flex"
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar planta
            </Button>
            <Button size="icon" onClick={() => setAddPlantOpen(true)}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar en tu jardín..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content - Kanban Board */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : plants && plants.length > 0 ? (
          <GardenKanban items={plants} />
        ) : (
          <GardenEmptyState
            filter="all"
            onAddPlant={() => setAddPlantOpen(true)}
            onSearchCatalog={() => navigate('/')}
          />
        )}
      </main>

      {!isMobile && <Footer />}

      <AddPlantDialog open={addPlantOpen} onOpenChange={setAddPlantOpen} />
      <AddWishlistItemDialog open={addWishlistOpen} onOpenChange={setAddWishlistOpen} />
    </div>
  );
};

export default MyGarden;
