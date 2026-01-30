import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Leaf, Instagram, Facebook, Mail, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Footer = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubscribing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success(t('footer.newsletter.success'));
    setEmail("");
    setIsSubscribing(false);
  };

  const navigationLinks = [
    { key: 'contact', href: '#' },
    { key: 'visit', href: '#' },
    { key: 'delivery', href: '#' },
    { key: 'loyalty', href: '#' },
    { key: 'faq', href: '#' },
  ];

  const legalLinks = [
    { key: 'notice', href: '#' },
    { key: 'termsOfSale', href: '#' },
    { key: 'privacyPolicy', href: '#' },
    { key: 'sitemap', href: '#' },
  ];

  const socialLinks = [
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Mail, href: '#', label: 'Email' },
  ];

  return (
    <footer className="relative bg-primary text-primary-foreground overflow-hidden">
      {/* Textured overlay for volcanic/earth feel */}
      <div 
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }}
      />
      
      <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="h-5 w-5 text-moss" />
              <span className="text-lg font-semibold tracking-tight">Frondaprima</span>
            </div>
            <p className="text-primary-foreground/60 text-sm leading-relaxed mb-6">
              {t('footer.tagline')}
            </p>
            
            {/* Social icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-full bg-primary-foreground/5 hover:bg-primary-foreground/10 border border-primary-foreground/10 flex items-center justify-center transition-colors duration-200"
                >
                  <social.icon className="h-4 w-4 text-primary-foreground/70" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/50 mb-4">
              {t('footer.navigation.title')}
            </h4>
            <ul className="space-y-2.5">
              {navigationLinks.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200"
                  >
                    {t(`footer.navigation.${link.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/50 mb-4">
              {t('footer.legal.title')}
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200"
                  >
                    {t(`footer.legal.${link.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/50 mb-4">
              {t('footer.newsletter.title')}
            </h4>
            <p className="text-sm text-primary-foreground/60 mb-4 leading-relaxed">
              {t('footer.newsletter.description')}
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder={t('footer.newsletter.placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-moss/50 focus:ring-moss/20 h-10"
                required
              />
              <Button
                type="submit"
                disabled={isSubscribing}
                className="w-full bg-moss hover:bg-moss-light text-primary-foreground border-0 h-10 font-medium transition-colors duration-200"
              >
                {isSubscribing ? "..." : t('footer.newsletter.subscribe')}
              </Button>
            </form>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-primary-foreground/10 pt-8">
          {/* Quote */}
          <div className="max-w-2xl mx-auto text-center mb-8">
            <p className="text-sm font-light italic text-primary-foreground/50 leading-relaxed">
              "{t('footer.quote')}"
            </p>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/40">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()} Frondaprima</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{t('footer.rights')}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <div className="w-6 h-px bg-primary-foreground/20"></div>
              <Leaf className="h-3 w-3 text-moss/60" />
              <div className="w-6 h-px bg-primary-foreground/20"></div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
