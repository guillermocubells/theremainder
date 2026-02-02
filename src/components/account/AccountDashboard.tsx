import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useOrders } from '@/hooks/useOrders';
import { useAddresses } from '@/hooks/useAddresses';
import { useOwnedPlants } from '@/hooks/collection/useOwnedPlants';
import { useWishlistStats } from '@/hooks/wishlist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, MapPin, User, Clock, Leaf, ArrowRight, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AccountDashboardProps {
  onNavigate: (tab: string) => void;
}

const AccountDashboard = ({ onNavigate }: AccountDashboardProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: orders } = useOrders();
  const { data: addresses } = useAddresses();
  const { data: ownedPlants } = useOwnedPlants();
  const { data: wishlistStats } = useWishlistStats();

  const recentOrders = orders?.slice(0, 3) || [];
  const defaultAddress = addresses?.find(a => a.is_default);
  const alivePlantsCount = ownedPlants?.filter(p => p.status === 'alive').length || 0;
  const totalWishlistItems = (wishlistStats?.wishlist || 0) + (wishlistStats?.looking || 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'paid': return 'Pagado';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          ¡Hola, {profile?.full_name || user?.email?.split('@')[0]}!
        </h1>
        <p className="text-gray-600 mt-1">
          Bienvenido a tu espacio personal en Frondaprima
        </p>
      </div>

      {/* Plant Collection Card */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
                <Leaf className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Mi Colección de Plantas</h3>
                <p className="text-green-700 dark:text-green-300">
                  {ownedPlants?.length || 0} plantas en tu colección
                  {alivePlantsCount > 0 && ` • ${alivePlantsCount} vivas`}
                </p>
              </div>
            </div>
            <Link to="/collection">
              <Button className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600">
                Ir a mi colección
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Wishlist Card */}
      <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 dark:from-rose-950/20 dark:to-pink-950/20 dark:border-rose-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-rose-100 dark:bg-rose-900/50 p-3 rounded-full">
                <Heart className="h-8 w-8 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100">Mi Lista de Deseos</h3>
                <p className="text-rose-700 dark:text-rose-300">
                  {totalWishlistItems} plantas en tu wishlist
                  {(wishlistStats?.looking || 0) > 0 && ` • ${wishlistStats?.looking} buscando`}
                </p>
              </div>
            </div>
            <Link to="/account/wishlist">
              <Button className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600">
                Ver lista de deseos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders?.length || 0}</div>
            <p className="text-xs text-muted-foreground">pedidos realizados</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('addresses')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Direcciones</CardTitle>
            <MapPin className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{addresses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">direcciones guardadas</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('profile')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Perfil</CardTitle>
            <User className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">{profile?.email || user?.email}</div>
            <p className="text-xs text-muted-foreground">
              {profile?.phone ? 'Teléfono añadido' : 'Sin teléfono'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            Pedidos recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{order.order_number}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="font-medium text-gray-800">
                      {order.total_amount.toFixed(2)}€
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={() => onNavigate('orders')}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Ver todos los pedidos →
              </button>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Aún no tienes pedidos. ¡Explora nuestra colección!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Default address */}
      {defaultAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Dirección principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-800">{defaultAddress.full_name}</p>
              <p className="text-sm text-gray-600">{defaultAddress.street}</p>
              {defaultAddress.apartment && (
                <p className="text-sm text-gray-600">{defaultAddress.apartment}</p>
              )}
              <p className="text-sm text-gray-600">
                {defaultAddress.postal_code} {defaultAddress.city}, {defaultAddress.province}
              </p>
              <p className="text-sm text-gray-600">{defaultAddress.country}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccountDashboard;
