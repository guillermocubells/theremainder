
import { useTranslation } from "react-i18next";
import { Leaf } from "lucide-react";

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-primary text-primary-foreground py-10 sm:py-14">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-primary-foreground/70 text-xs uppercase tracking-[0.25em] mb-4">Frondaprima</p>
          <p className="text-base sm:text-lg font-light italic text-primary-foreground/90 mb-6 leading-relaxed">
            "{t('footer.quote')}"
          </p>
          <div className="flex items-center justify-center space-x-3 text-primary-foreground/50">
            <div className="w-8 h-px bg-current"></div>
            <Leaf className="h-4 w-4" />
            <div className="w-8 h-px bg-current"></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
