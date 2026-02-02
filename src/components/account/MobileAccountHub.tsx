import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useOrders } from '@/hooks/useOrders';
import { useGardenStats } from '@/hooks/garden';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  MapPin, 
  User, 
  Shield, 
  Search, 
  Leaf, 
  Bell,
  Globe,
  LogOut,
  ChevronRight
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  href?: string;
  action?: () => void;
  variant?: 'default' | 'destructive';
  description?: string;
}

interface MobileAccountHubProps {
  onNavigate: (tab: string) => void;
  onLanguageChange: () => void;
}

const MobileAccountHub = ({ onNavigate, onLanguageChange }: MobileAccountHubProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: orders } = useOrders();
  const { data: gardenStats } = useGardenStats();

  const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'shipped').length || 0;
  const totalPlants = gardenStats?.total || 0;
  const currentLanguage = i18n.language === 'es' ? 'Español' : 'English';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuSections: { title?: string; items: MenuItem[] }[] = [
    {
      items: [
        {
          id: 'garden',
          label: t('account.mobileHub.myGarden', 'Mi Jardín'),
          icon: Leaf,
          badge: totalPlants > 0 ? totalPlants : undefined,
          href: '/garden',
          description: t('account.mobileHub.gardenDesc', 'Todas tus plantas en un solo lugar')
        },
      ]
    },
    {
      title: t('account.mobileHub.shopping', 'Compras'),
      items: [
        {
          id: 'orders',
          label: t('account.orders', 'Mis Pedidos'),
          icon: Package,
          badge: pendingOrders > 0 ? pendingOrders : undefined,
          action: () => onNavigate('orders'),
          description: t('account.mobileHub.ordersDesc', 'Historial y seguimiento')
        },
        {
          id: 'addresses',
          label: t('account.addresses', 'Mis Direcciones'),
          icon: MapPin,
          action: () => onNavigate('addresses'),
          description: t('account.mobileHub.addressesDesc', 'Direcciones de envío')
        },
        {
          id: 'searches',
          label: t('account.savedSearches', 'Búsquedas Guardadas'),
          icon: Search,
          action: () => onNavigate('searches'),
          description: t('account.mobileHub.searchesDesc', 'Alertas y filtros')
        },
      ]
    },
    {
      title: t('account.mobileHub.settings', 'Configuración'),
      items: [
        {
          id: 'profile',
          label: t('account.profile', 'Mis Datos'),
          icon: User,
          action: () => onNavigate('profile'),
          description: t('account.mobileHub.profileDesc', 'Nombre, email, teléfono')
        },
        {
          id: 'security',
          label: t('account.security', 'Seguridad'),
          icon: Shield,
          action: () => onNavigate('security'),
          description: t('account.mobileHub.securityDesc', 'Contraseña y acceso')
        },
        {
          id: 'notifications',
          label: t('account.mobileHub.notifications', 'Notificaciones'),
          icon: Bell,
          href: '/account/wishlist/notifications',
          description: t('account.mobileHub.notificationsDesc', 'Alertas de disponibilidad')
        },
        {
          id: 'language',
          label: t('account.mobileHub.language', 'Idioma'),
          icon: Globe,
          action: onLanguageChange,
          badge: currentLanguage,
          description: t('account.mobileHub.languageDesc', 'Cambiar idioma')
        },
      ]
    },
    {
      items: [
        {
          id: 'logout',
          label: t('auth.logout', 'Cerrar Sesión'),
          icon: LogOut,
          action: handleSignOut,
          variant: 'destructive'
        },
      ]
    }
  ];

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isDestructive = item.variant === 'destructive';
    
    const content = (
      <div 
        className={`flex items-center gap-4 p-4 rounded-xl transition-colors active:scale-[0.98] ${
          isDestructive 
            ? 'text-destructive hover:bg-destructive/10' 
            : 'hover:bg-muted/50 active:bg-muted'
        }`}
      >
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
          isDestructive 
            ? 'bg-destructive/10' 
            : 'bg-primary/10'
        }`}>
          <Icon className={`h-5 w-5 ${isDestructive ? 'text-destructive' : 'text-primary'}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isDestructive ? '' : 'text-foreground'}`}>
              {item.label}
            </span>
            {item.badge && typeof item.badge === 'number' && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                {item.badge}
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground truncate">{item.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {item.badge && typeof item.badge === 'string' && (
            <span className="text-sm text-muted-foreground">{item.badge}</span>
          )}
          {!isDestructive && (
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          )}
        </div>
      </div>
    );

    if (item.href) {
      return (
        <button
          key={item.id}
          onClick={() => navigate(item.href!)}
          className="w-full text-left"
        >
          {content}
        </button>
      );
    }

    return (
      <button
        key={item.id}
        onClick={item.action}
        className="w-full text-left"
      >
        {content}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* User header */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl">
        <Avatar className="h-16 w-16 border-2 border-primary/20">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">
            {profile?.full_name || user?.email?.split('@')[0]}
          </h2>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      {/* Menu sections */}
      {menuSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-1">
          {section.title && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
              {section.title}
            </h3>
          )}
          <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {section.items.map(renderMenuItem)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MobileAccountHub;
