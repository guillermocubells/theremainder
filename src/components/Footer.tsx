
import { useTranslation } from "react-i18next";
import { Leaf } from "lucide-react";

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-green-900 text-white py-10 sm:py-14">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-green-200/80 text-xs uppercase tracking-[0.25em] mb-4">Frondaprima</p>
          <p className="text-base sm:text-lg font-light italic text-green-100 mb-6 leading-relaxed">
            "{t('footer.quote')}"
          </p>
          <div className="flex items-center justify-center space-x-3 text-green-300/60">
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
