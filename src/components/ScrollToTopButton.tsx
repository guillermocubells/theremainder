import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SCROLL_THRESHOLD = 400;

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setVisible(window.scrollY > SCROLL_THRESHOLD);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Volver arriba"
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary/80 text-primary-foreground shadow-lg backdrop-blur-md transition-all duration-300 animate-fade-in hover:bg-primary hover:shadow-xl hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        Volver arriba
      </TooltipContent>
    </Tooltip>
  );
}
