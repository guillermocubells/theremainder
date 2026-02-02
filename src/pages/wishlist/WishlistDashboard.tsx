import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlistItems, useWishlistStats } from '@/hooks/wishlist';
import { WishlistKanban } from '@/components/wishlist/WishlistKanban';
import { WishlistFiltersBar } from '@/components/wishlist/WishlistFiltersBar';
import { AddWishlistItemDialog } from '@/components/wishlist/AddWishlistItemDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Heart, Search, ShoppingBag, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const WishlistDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const { data: items, isLoading } = useWishlistItems(filters);
  const { data: stats } = useWishlistStats();

  if (!user) {
    navigate('/auth');
    return null;
  }

  const wishlistItems = items?.filter(i => i.status === 'wishlist') || [];
  const lookingItems = items?.filter(i => i.status === 'looking') || [];
  const acquiredItems = items?.filter(i => i.status === 'acquired') || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <span className="text-lg">←</span>
          Volver a Mi Cuenta
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-8 w-8 text-primary" />
              Mi Lista de Deseos
            </h1>
            <p className="text-muted-foreground mt-1">
              Rastrea las plantas que sueñas tener
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/account/wishlist/notifications')}
            >
              <Bell className="h-4 w-4 mr-2" />
              Notificaciones
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir Planta
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 dark:from-rose-950/20 dark:to-pink-950/20 dark:border-rose-800">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-rose-100 dark:bg-rose-900/50 p-3 rounded-full">
                <Heart className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lista de Deseos</p>
                <p className="text-2xl font-bold text-foreground">{stats?.wishlist || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full">
                <Search className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Buscando Activamente</p>
                <p className="text-2xl font-bold text-foreground">{stats?.looking || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
                <ShoppingBag className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adquiridas</p>
                <p className="text-2xl font-bold text-foreground">{stats?.acquired || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <WishlistFiltersBar filters={filters} onFiltersChange={setFilters} />

        {/* Kanban Board */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <WishlistKanban
            wishlistItems={wishlistItems}
            lookingItems={lookingItems}
            acquiredItems={acquiredItems}
          />
        )}
      </main>

      <Footer />

      <AddWishlistItemDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
};

export default WishlistDashboard;
