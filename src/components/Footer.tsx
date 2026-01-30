import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Leaf, Instagram, Facebook, Mail } from "lucide-react";
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
      {/* Organic textured overlay - botanical/volcanic feel */}
      <div 
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px'
        }}
      />
      
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
      
      <section className="py-14 sm:py-20 px-4 relative z-10">
        <div className="container mx-auto">
          {/* Main footer grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-10 mb-10">
            
            {/* Brand column - refined hierarchy */}
            <div className="lg:col-span-1">
              <div className="mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-primary-foreground mb-1.5">
                  Frondaprima
                </h3>
                <p className="text-[10px] uppercase tracking-[0.35em] text-primary-foreground/40 font-medium">
                  {t('footer.tagline')}
                </p>
              </div>
              
              {/* Social icons - refined: smaller, subtler, editorial */}
              <div className="flex items-center gap-2.5 mt-6">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-8 h-8 rounded-full bg-primary-foreground/[0.03] hover:bg-primary-foreground/[0.08] border border-primary-foreground/[0.06] hover:border-primary-foreground/[0.12] flex items-center justify-center transition-all duration-300 ease-out group"
                  >
                    <social.icon className="h-3.5 w-3.5 text-primary-foreground/40 group-hover:text-primary-foreground/60 transition-colors duration-300" />
                  </a>
                ))}
              </div>
            </div>

            {/* Navigation column - refined hierarchy */}
            <div>
              <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-5">
                {t('footer.navigation.title')}
              </h4>
              <ul className="space-y-3">
                {navigationLinks.map((link) => (
                  <li key={link.key}>
                    <a
                      href={link.href}
                      className="text-[13px] text-primary-foreground/55 hover:text-primary-foreground/80 transition-colors duration-300 leading-relaxed"
                    >
                      {t(`footer.navigation.${link.key}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal column - refined hierarchy */}
            <div>
              <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-5">
                {t('footer.legal.title')}
              </h4>
              <ul className="space-y-3">
                {legalLinks.map((link) => (
                  <li key={link.key}>
                    <a
                      href={link.href}
                      className="text-[13px] text-primary-foreground/55 hover:text-primary-foreground/80 transition-colors duration-300 leading-relaxed"
                    >
                      {t(`footer.legal.${link.key}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter column - editorial refinement */}
            <div>
              <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-5">
                {t('footer.newsletter.title')}
              </h4>
              <p className="text-[13px] text-primary-foreground/50 mb-5 leading-[1.7]">
                {t('footer.newsletter.description')}
              </p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <Input
                  type="email"
                  placeholder={t('footer.newsletter.placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-primary-foreground/[0.03] border-primary-foreground/[0.08] text-primary-foreground text-[13px] placeholder:text-primary-foreground/30 focus:border-moss/40 focus:ring-moss/15 h-10 rounded-md"
                  required
                />
                <Button
                  type="submit"
                  disabled={isSubscribing}
                  className="w-full bg-moss/90 hover:bg-moss text-primary-foreground border-0 h-10 text-[13px] font-medium tracking-wide transition-all duration-300 rounded-md"
                >
                  {isSubscribing ? "..." : t('footer.newsletter.subscribe')}
                </Button>
              </form>
            </div>
          </div>

          {/* Subtle divider before quote */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary-foreground/15 to-transparent" />
          </div>

          {/* Quote - editorial treatment with line break for impact */}
          <div className="max-w-xl mx-auto text-center mb-8">
            <blockquote className="text-[13px] sm:text-sm font-light italic text-primary-foreground/35 leading-[1.9] tracking-wide">
              <span className="block">
                "{t('footer.quote').split('—')[0].trim()}"
              </span>
              <span className="block mt-2 text-primary-foreground/25">
                — {t('footer.quoteBreak')}
              </span>
            </blockquote>
          </div>

          {/* Final divider */}
          <div className="border-t border-primary-foreground/[0.06] pt-8">
            {/* Bottom bar - refined legal line */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] tracking-wide text-primary-foreground/30">
              <div className="flex items-center gap-2">
                <span className="font-medium">© {new Date().getFullYear()} Frondaprima</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-px bg-primary-foreground/15"></div>
                <Leaf className="h-2.5 w-2.5 text-moss/40" />
                <div className="w-5 h-px bg-primary-foreground/15"></div>
              </div>

              <span className="text-primary-foreground/25">
                {t('footer.rights')}
              </span>
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
};

export default Footer;
