import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import LanguageSwitcher from "./LanguageSwitcher";

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
    { key: 'contact', href: '/contact' },
    { key: 'shipping', href: '/envios-y-entregas' },
    { key: 'referrals', href: '/programa-referidos' },
    { key: 'faq', href: '#' },
  ];

  const legalLinks = [
    { key: 'notice', href: '/aviso-legal' },
    { key: 'termsOfSale', href: '/condiciones-venta' },
    { key: 'privacyPolicy', href: '/privacy' },
  ];

  const socialLinks = [
    { icon: Instagram, href: 'https://www.instagram.com/frondaprima/', label: 'Instagram' },
    { icon: MessageCircle, href: 'https://wa.me/34655699978?text=Hola%2C%20tengo%20una%20consulta%20sobre%20Frondaprima', label: 'WhatsApp' },
    { icon: Mail, href: 'mailto:guillermocubells@gmail.com?subject=Consulta%20desde%20Frondaprima', label: 'Email' },
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
      
      <section className="py-10 sm:py-20 px-4 relative z-10">
        <div className="container mx-auto">
          {/* Mobile layout: stacked and centered (< md) */}
          <div className="block md:hidden">
            {/* Brand - centered on mobile */}
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold tracking-tight text-primary-foreground mb-1.5">
                Frondaprima
              </h3>
              <p className="text-[10px] uppercase tracking-[0.35em] text-primary-foreground/40 font-medium">
                {t('footer.tagline')}
              </p>
            </div>

            {/* Newsletter - prominent on mobile */}
            <div className="mb-8 max-w-sm mx-auto">
              <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-4 text-center">
                {t('footer.newsletter.title')}
              </h4>
              <p className="text-[13px] text-primary-foreground/50 mb-4 leading-[1.7] text-center">
                {t('footer.newsletter.description')}
              </p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={t('footer.newsletter.placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-primary-foreground/[0.03] border-primary-foreground/[0.08] text-primary-foreground text-[13px] placeholder:text-primary-foreground/30 focus:border-moss/40 focus:ring-moss/15 h-11 rounded-lg"
                  required
                />
                <Button
                  type="submit"
                  disabled={isSubscribing}
                  className="w-full bg-moss/90 hover:bg-moss text-primary-foreground border-0 h-11 text-[13px] font-medium tracking-wide transition-all duration-300 rounded-lg"
                >
                  {isSubscribing ? "..." : t('footer.newsletter.subscribe')}
                </Button>
              </form>
            </div>

            {/* Links grid - 2 columns on mobile */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Navigation */}
              <div className="text-left">
                <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-4">
                  {t('footer.navigation.title')}
                </h4>
                <ul className="space-y-2.5">
                  {navigationLinks.map((link) => (
                    <li key={link.key}>
                      <Link
                        to={link.href}
                        className="text-[13px] text-primary-foreground/55 hover:text-primary-foreground/80 transition-colors duration-300"
                      >
                        {t(`footer.navigation.${link.key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div className="text-left">
                <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-4">
                  {t('footer.legal.title')}
                </h4>
                <ul className="space-y-2.5">
                  {legalLinks.map((link) => (
                    <li key={link.key}>
                      <Link
                        to={link.href}
                        className="text-[13px] text-primary-foreground/55 hover:text-primary-foreground/80 transition-colors duration-300"
                      >
                        {t(`footer.legal.${link.key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Social & Language - centered on mobile */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-10 h-10 rounded-full bg-primary-foreground/[0.05] hover:bg-primary-foreground/[0.1] border border-primary-foreground/[0.08] flex items-center justify-center transition-all duration-300 group"
                  >
                    <social.icon className="h-4 w-4 text-primary-foreground/50 group-hover:text-primary-foreground/70 transition-colors duration-300" />
                  </a>
                ))}
              </div>
              <div className="h-6 w-px bg-primary-foreground/10" />
              <LanguageSwitcher variant="footer" />
            </div>
          </div>

          {/* Tablet layout: 2x2 grid reorganized (md to lg) */}
          <div className="hidden md:block lg:hidden">
            {/* Row 1: Brand+Iconos left, Newsletter right */}
            <div className="grid grid-cols-2 gap-10 mb-10">
              {/* Left: Brand + Social icons */}
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-primary-foreground mb-1.5">
                  Frondaprima
                </h3>
                <p className="text-[10px] uppercase tracking-[0.35em] text-primary-foreground/40 font-medium mb-6">
                  {t('footer.tagline')}
                </p>
                <div className="flex items-center gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="w-10 h-10 rounded-full bg-primary-foreground/[0.05] hover:bg-primary-foreground/[0.1] border border-primary-foreground/[0.08] flex items-center justify-center transition-all duration-300 group"
                    >
                      <social.icon className="h-4 w-4 text-primary-foreground/50 group-hover:text-primary-foreground/70 transition-colors duration-300" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Right: Newsletter */}
              <div>
                <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-4">
                  {t('footer.newsletter.title')}
                </h4>
                <p className="text-[13px] text-primary-foreground/50 mb-4 leading-[1.7]">
                  {t('footer.newsletter.description')}
                </p>
                <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder={t('footer.newsletter.placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-primary-foreground/[0.03] border-primary-foreground/[0.08] text-primary-foreground text-[13px] placeholder:text-primary-foreground/30 focus:border-moss/40 focus:ring-moss/15 h-11 rounded-lg"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={isSubscribing}
                    className="w-full bg-moss/90 hover:bg-moss text-primary-foreground border-0 h-11 text-[13px] font-medium tracking-wide transition-all duration-300 rounded-lg"
                  >
                    {isSubscribing ? "..." : t('footer.newsletter.subscribe')}
                  </Button>
                </form>
              </div>
            </div>

            {/* Row 2: Explorar left, Legal right */}
            <div className="grid grid-cols-2 gap-10 mb-10">
              {/* Left: Explorar/Navigation */}
              <div>
                <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-4">
                  {t('footer.navigation.title')}
                </h4>
                <ul className="space-y-2.5">
                  {navigationLinks.map((link) => (
                    <li key={link.key}>
                      <Link
                        to={link.href}
                        className="text-[13px] text-primary-foreground/55 hover:text-primary-foreground/80 transition-colors duration-300 inline-block py-0.5"
                      >
                        {t(`footer.navigation.${link.key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Legal */}
              <div>
                <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-4">
                  {t('footer.legal.title')}
                </h4>
                <ul className="space-y-2.5">
                  {legalLinks.map((link) => (
                    <li key={link.key}>
                      <Link
                        to={link.href}
                        className="text-[13px] text-primary-foreground/55 hover:text-primary-foreground/80 transition-colors duration-300 inline-block py-0.5"
                      >
                        {t(`footer.legal.${link.key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Language switcher - centered on tablet */}
            <div className="flex items-center justify-center mb-8">
              <LanguageSwitcher variant="footer" />
            </div>
          </div>

          {/* Desktop layout: 4 columns grid */}
          <div className="hidden lg:grid grid-cols-4 gap-10 mb-10">
            {/* Brand column */}
            <div>
              <div className="mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-primary-foreground mb-1.5">
                  Frondaprima
                </h3>
                <p className="text-[10px] uppercase tracking-[0.35em] text-primary-foreground/40 font-medium">
                  {t('footer.tagline')}
                </p>
              </div>
              <div className="flex items-center gap-2.5 mt-6">
              {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-8 h-8 rounded-full bg-primary-foreground/[0.03] hover:bg-primary-foreground/[0.08] border border-primary-foreground/[0.06] hover:border-primary-foreground/[0.12] flex items-center justify-center transition-all duration-300 ease-out group"
                  >
                    <social.icon className="h-3.5 w-3.5 text-primary-foreground/40 group-hover:text-primary-foreground/60 transition-colors duration-300" />
                  </a>
                ))}
              </div>
            </div>

            {/* Navigation column */}
            <div>
              <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-5">
                {t('footer.navigation.title')}
              </h4>
              <ul className="space-y-3">
                {navigationLinks.map((link) => (
                  <li key={link.key}>
                    <Link
                      to={link.href}
                      className="text-[13px] text-primary-foreground/55 hover:text-primary-foreground/80 transition-colors duration-300 leading-relaxed"
                    >
                      {t(`footer.navigation.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal column */}
            <div>
              <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary-foreground/35 mb-5">
                {t('footer.legal.title')}
              </h4>
              <ul className="space-y-3">
                {legalLinks.map((link) => (
                  <li key={link.key}>
                    <Link
                      to={link.href}
                      className="text-[13px] text-primary-foreground/55 hover:text-primary-foreground/80 transition-colors duration-300 leading-relaxed"
                    >
                      {t(`footer.legal.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter column */}
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
                  autoComplete="email"
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

          {/* Quote - hidden on mobile for cleaner experience */}
          <div className="hidden sm:block max-w-xl mx-auto text-center mb-8">
            <blockquote className="text-sm font-light italic text-primary-foreground/35 leading-[1.9] tracking-wide">
              <span className="block">
                "{t('footer.quote').split('—')[0].trim()}"
              </span>
              <span className="block mt-2 text-primary-foreground/25">
                — {t('footer.quoteBreak')}
              </span>
            </blockquote>
          </div>

          {/* Final divider */}
          <div className="border-t border-primary-foreground/[0.06] pt-6 sm:pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] tracking-wide text-primary-foreground/30">
              <div className="flex items-center gap-2">
                <span className="font-medium">© {new Date().getFullYear()} Frondaprima</span>
              </div>
              <div className="hidden lg:flex items-center gap-4">
                <LanguageSwitcher variant="footer" />
                <span className="text-primary-foreground/25">
                  {t('footer.rights')}
                </span>
              </div>
              <span className="lg:hidden text-primary-foreground/25">
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
