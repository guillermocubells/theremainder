import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  User, 
  Shield, 
  Search,
  Leaf,
  Gift,
  MessageSquare,
  LogOut
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGardenStats } from '@/hooks/garden';
import AccountDashboard from '@/components/account/AccountDashboard';
import AccountOrders from '@/components/account/AccountOrders';
import AccountAddresses from '@/components/account/AccountAddresses';
import AccountProfile from '@/components/account/AccountProfile';
import AccountSecurity from '@/components/account/AccountSecurity';
import AccountSavedSearches from '@/components/account/AccountSavedSearches';
import AccountReferrals from '@/components/account/AccountReferrals';
import AccountInquiries from '@/components/account/AccountInquiries';
import MobileAccountHub from '@/components/account/MobileAccountHub';
import MobileAccountSection from '@/components/account/MobileAccountSection';
import { useInquiryCount } from '@/hooks/collection/useGardenInquiries';

const Account = () => {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { data: gardenStats } = useGardenStats();
  const { data: inquiryCount } = useInquiryCount();
  const menuItems = [
    { id: 'dashboard', label: t('account.dashboard'), icon: LayoutDashboard },
    { id: 'garden', label: 'Mi Jardín', icon: Leaf, badge: gardenStats?.total, href: '/garden' },
    { id: 'orders', label: t('account.orders'), icon: Package },
    { id: 'addresses', label: t('account.addresses'), icon: MapPin },
    { id: 'profile', label: t('account.profile'), icon: User },
    { id: 'security', label: t('account.security'), icon: Shield },
    { id: 'searches', label: t('account.savedSearches'), icon: Search },
    { id: 'inquiries', label: 'Consultas', icon: MessageSquare, badge: inquiryCount },
    { id: 'referrals', label: t('referral.title', 'Referidos'), icon: Gift },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleLanguageChange = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  const handleMobileNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const handleMobileBack = () => {
    setActiveTab(null);
  };

  const getSectionTitle = (tab: string) => {
    switch (tab) {
      case 'orders': return t('account.orders');
      case 'addresses': return t('account.addresses');
      case 'profile': return t('account.profile');
      case 'security': return t('account.security');
      case 'searches': return t('account.savedSearches');
      case 'referrals': return t('referral.title', 'Referidos');
      case 'inquiries': return 'Consultas';
      default: return '';
    }
  };

  const renderContent = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return <AccountDashboard onNavigate={isMobile ? handleMobileNavigate : setActiveTab} />;
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
      case 'referrals':
        return <AccountReferrals />;
      case 'inquiries':
        return <AccountInquiries />;
      default:
        return <AccountDashboard onNavigate={isMobile ? handleMobileNavigate : setActiveTab} />;
    }
  };

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.href) {
      navigate(item.href);
    } else {
      setActiveTab(item.id);
    }
  };

  const SidebarContent = () => (
    <div className="space-y-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              isActive
                ? 'bg-secondary text-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </div>
            {item.badge && item.badge > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
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

  // Mobile view
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-6">
          {/* Back to catalog link - only show on hub */}
          {!activeTab && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <span className="text-lg">←</span>
              {t('navigation.backToCatalog')}
            </Link>
          )}

          {activeTab ? (
            <MobileAccountSection 
              title={getSectionTitle(activeTab)} 
              onBack={handleMobileBack}
            >
              {renderContent(activeTab)}
            </MobileAccountSection>
          ) : (
            <MobileAccountHub 
              onNavigate={handleMobileNavigate}
              onLanguageChange={handleLanguageChange}
            />
          )}
        </main>

        <Footer />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back to catalog link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <span className="text-lg">←</span>
          {t('navigation.backToCatalog')}
        </Link>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-card rounded-xl shadow-sm p-4 sticky top-24">
              <h2 className="text-lg font-semibold text-foreground mb-4 px-4">{t('account.title')}</h2>
              <SidebarContent />
            </div>
          </aside>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            <div className="bg-card rounded-xl shadow-sm p-6">
              {renderContent(activeTab || 'dashboard')}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Account;
