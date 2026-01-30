import { useTranslation } from "react-i18next";
import { Facebook, Instagram, Youtube, Leaf } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

const Footer = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [acceptPolicy, setAcceptPolicy] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && acceptPolicy) {
      console.log("Newsletter subscription:", email);
      setEmail("");
      setAcceptPolicy(false);
    }
  };

  const infoLinks = [
    { label: t('footer.contact'), href: "#" },
    { label: t('footer.visitUs'), href: "#" },
    { label: t('footer.delivery'), href: "#" },
    { label: t('footer.faq'), href: "#" },
  ];

  const legalLinks = [
    { label: t('footer.legalNotice'), href: "#" },
    { label: t('footer.terms'), href: "#" },
    { label: t('footer.privacy'), href: "#" },
    { label: t('footer.sitemap'), href: "#" },
  ];

  return (
    <footer className="bg-[#1a1a1a] text-white relative overflow-hidden">
      {/* Texture overlay */}
      <div 
        className="absolute inset-0 opacity-30 bg-cover bg-center"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Info links */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-white/90">{t('footer.information')}</h4>
            <ul className="space-y-3">
              {infoLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-white/70 hover:text-[#a8a145] transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-white/90">{t('footer.legal')}</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-white/70 hover:text-[#a8a145] transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-2">
            <h4 className="font-semibold text-lg mb-4 text-white/90">{t('footer.newsletter')}</h4>
            <form onSubmit={handleSubscribe} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder={t('footer.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-white border-0 text-gray-800 placeholder:text-gray-500 h-12 rounded-l-md rounded-r-none sm:rounded-r-none"
                />
                <Button 
                  type="submit"
                  className="bg-[#a8a145] hover:bg-[#8f8a3b] text-white font-medium h-12 px-8 rounded-r-md rounded-l-none sm:rounded-l-none"
                  disabled={!email || !acceptPolicy}
                >
                  {t('footer.subscribe')}
                </Button>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="privacy"
                  checked={acceptPolicy}
                  onCheckedChange={(checked) => setAcceptPolicy(checked as boolean)}
                  className="mt-1 border-white/50 data-[state=checked]:bg-[#a8a145] data-[state=checked]:border-[#a8a145]"
                />
                <label htmlFor="privacy" className="text-xs text-white/60 leading-relaxed cursor-pointer">
                  {t('footer.privacyConsent')}
                </label>
              </div>
            </form>
          </div>
        </div>

        {/* Social media section */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <p className="text-white/80 italic text-sm">{t('footer.followUs')}</p>
              <div className="flex gap-3">
                <a 
                  href="#" 
                  className="bg-[#a8a145] hover:bg-[#8f8a3b] p-2.5 rounded transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5 text-white" />
                </a>
                <a 
                  href="#" 
                  className="bg-[#a8a145] hover:bg-[#8f8a3b] p-2.5 rounded transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5 text-white" />
                </a>
                <a 
                  href="#" 
                  className="bg-[#a8a145] hover:bg-[#8f8a3b] p-2.5 rounded transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5 text-white" />
                </a>
              </div>
            </div>

            {/* Brand */}
            <div className="flex items-center gap-2 text-white/60">
              <Leaf className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.2em]">Frondaprima</span>
            </div>
          </div>
        </div>

        {/* Quote section */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-sm font-light italic text-white/50 max-w-xl mx-auto">
            "{t('footer.quote')}"
          </p>
          <p className="text-xs text-white/40 mt-4">
            © {new Date().getFullYear()} Frondaprima. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
