
import { Leaf, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-green-800 text-white py-8 sm:py-12">
      <div className="container mx-auto px-4 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-4">
          <div className="flex items-center space-x-2">
            <Leaf className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-lg sm:text-xl font-semibold text-center">Una casa siempre debería empezar por un jardín</span>
            <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
        <p className="text-green-200 text-sm sm:text-base leading-relaxed max-w-3xl mx-auto">Porque cuando nada parece que avanza, plantar se convierte en un acto de resistencia, crecimiento y de fe</p>
      </div>
    </footer>
  );
};

export default Footer;
