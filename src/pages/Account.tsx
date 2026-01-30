import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  User, 
  Shield, 
  Search,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AccountDashboard from '@/components/account/AccountDashboard';
import AccountOrders from '@/components/account/AccountOrders';
import AccountAddresses from '@/components/account/AccountAddresses';
import AccountProfile from '@/components/account/AccountProfile';
import AccountSecurity from '@/components/account/AccountSecurity';
import AccountSavedSearches from '@/components/account/AccountSavedSearches';

const Account = () => {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: t('account.dashboard'), icon: LayoutDashboard },
    { id: 'orders', label: t('account.orders'), icon: Package },
    { id: 'addresses', label: t('account.addresses'), icon: MapPin },
    { id: 'profile', label: t('account.profile'), icon: User },
    { id: 'security', label: t('account.security'), icon: Shield },
    { id: 'searches', label: t('account.savedSearches'), icon: Search },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AccountDashboard onNavigate={setActiveTab} />;
      case 'orders':
        return <AccountOrders />;
      case 'addresses':
        return <AccountAddresses />;
      case 'profile':
        return <AccountProfile />;
      case 'security':
        return <AccountSecurity />;
      case 'searches':
        return <AccountSavedSearches />;
      default:
        return <AccountDashboard onNavigate={setActiveTab} />;
    }
  };

  const SidebarContent = () => (
    <div className="space-y-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === item.id
                ? 'bg-secondary text-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}
      <hr className="my-4 border-border" />
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-5 w-5" />
        <span>{t('auth.logout')}</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-card rounded-xl shadow-sm p-4 sticky top-24">
              <h2 className="text-lg font-semibold text-foreground mb-4 px-4">{t('account.title')}</h2>
              <SidebarContent />
            </div>
          </aside>

          {/* Mobile menu trigger */}
          <div className="lg:hidden fixed bottom-4 right-4 z-50">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button size="lg" className="rounded-full shadow-lg">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <div className="py-4">
                  <h2 className="text-lg font-semibold text-foreground mb-4 px-4">{t('account.title')}</h2>
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            <div className="bg-card rounded-xl shadow-sm p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Account;
