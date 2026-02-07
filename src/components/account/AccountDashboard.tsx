import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useOrders } from '@/hooks/useOrders';
import { useAddresses } from '@/hooks/useAddresses';
import { useGardenStats } from '@/hooks/garden';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, MapPin, User, Clock, Leaf, ArrowRight, Heart, Search as SearchIcon, Gift } from 'lucide-react';
import { useWallet } from '@/hooks/useReferral';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AccountDashboardProps {
  onNavigate: (tab: string) => void;
}

const AccountDashboard = ({ onNavigate }: AccountDashboardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: orders } = useOrders();
  const { data: addresses } = useAddresses();
  const { data: gardenStats } = useGardenStats();
  const { data: wallet } = useWallet();

  const recentOrders = orders?.slice(0, 3) || [];
  const defaultAddress = addresses?.find(a => a.is_default);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-accent text-accent-foreground';
      case 'paid': return 'bg-secondary text-secondary-foreground';
      case 'shipped': return 'bg-primary/20 text-primary';
      case 'delivered': return 'bg-primary/10 text-primary';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
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
        <h1 className="text-2xl font-bold text-foreground">
          ¡Hola, {profile?.full_name || user?.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido a tu espacio personal en The Remainder
        </p>
      </div>

      {/* Unified Garden Card - Main CTA */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Leaf className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Mi Jardín</h3>
                <p className="text-muted-foreground">
                  {gardenStats?.total || 0} plantas en total
                </p>
              </div>
            </div>
            <Link to="/garden">
              <Button className="bg-primary hover:bg-primary/90">
                Ir a mi jardín
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-primary/10">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Heart className="h-4 w-4" />
                <span className="text-xs">En búsqueda</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{gardenStats?.searching || 0}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Leaf className="h-4 w-4" />
                <span className="text-xs">En colección</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{gardenStats?.inCollection || 0}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <SearchIcon className="h-4 w-4" />
                <span className="text-xs">Disponibles</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{gardenStats?.available || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Card */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow border-primary/10 bg-gradient-to-r from-primary/5 to-transparent"
        onClick={() => onNavigate('referrals')}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full shrink-0">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Programa de Referidos</h3>
            <p className="text-sm text-muted-foreground">
              {wallet?.availableBalance
                ? `${wallet.availableBalance.toFixed(2)} € disponibles`
                : 'Comparte y gana crédito'}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
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
            <div className="text-2xl font-bold text-foreground">{orders?.length || 0}</div>
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
            <div className="text-2xl font-bold text-foreground">{addresses?.length || 0}</div>
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
            <div className="text-sm font-medium truncate text-foreground">{profile?.email || user?.email}</div>
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
            <Clock className="h-5 w-5 text-primary" />
            Pedidos recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="font-medium text-foreground">
                      {order.total_amount.toFixed(2)}€
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={() => onNavigate('orders')}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Ver todos los pedidos →
              </button>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
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
              <MapPin className="h-5 w-5 text-primary" />
              Dirección principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-foreground">{defaultAddress.full_name}</p>
              <p className="text-sm text-muted-foreground">{defaultAddress.street}</p>
              {defaultAddress.apartment && (
                <p className="text-sm text-muted-foreground">{defaultAddress.apartment}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {defaultAddress.postal_code} {defaultAddress.city}, {defaultAddress.province}
              </p>
              <p className="text-sm text-muted-foreground">{defaultAddress.country}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccountDashboard;
