
import { Leaf, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-green-900 text-white py-10 sm:py-14">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-green-200/80 text-xs uppercase tracking-[0.25em] mb-4">Fronda Prima</p>
          <p className="text-base sm:text-lg font-light italic text-green-100 mb-6 leading-relaxed">
            "To plant a tree from a high place is to carry elevation into the lowlands — an act of quiet defiance against forgetting."
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
