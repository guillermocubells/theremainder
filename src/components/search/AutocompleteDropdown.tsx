import { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Leaf } from "lucide-react";
import { Plant } from "@/data/plants";
import { fuzzySearch, splitByHighlights, SearchableItem, SearchResult } from "@/utils/fuzzySearch";
import { getMainImage } from "@/utils/plantImageUtils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

interface AutocompleteDropdownProps {
  query: string;
  plants: Plant[];
  visible: boolean;
  onClose: () => void;
  onSelect: (plant: Plant) => void;
}

type PlantSearchItem = SearchableItem & { _plant: Plant };

function toSearchable(plants: Plant[]): PlantSearchItem[] {
  return plants.map(p => ({
    id: p.id,
    fields: [
      p.name,
      p.commonName,
      p.variety || "",
      p.description,
      p.plantGroup || "",
      p.location,
    ],
    _plant: p,
  }));
}

const AutocompleteDropdown = ({ query, plants, visible, onClose, onSelect }: AutocompleteDropdownProps) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [results, setResults] = useState<SearchResult<PlantSearchItem>[]>([]);

  // Perform search whenever query or plants change
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const searchable = toSearchable(plants);
    const found = fuzzySearch(searchable, query, 6);
    setResults(found);
    setActiveIndex(-1);
  }, [query, plants]);

  // Close on click outside
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!visible || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      onSelect(results[activeIndex].item._plant);
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [visible, results, activeIndex, onSelect, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!visible || results.length === 0 || query.trim().length < 2) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in"
      role="listbox"
    >
      {results.map((result, idx) => {
        const plant = result.item._plant;
        const heroImg = getMainImage(plant.images, plant.productImages, plant.primaryImage);
        // Highlight name (field 0) and commonName (field 1)
        const nameHighlights = result.highlights.get(0) || [];
        const commonHighlights = result.highlights.get(1) || [];
        const nameSegments = splitByHighlights(plant.name, nameHighlights);
        const commonSegments = splitByHighlights(plant.commonName, commonHighlights);

        return (
          <Link
            key={plant.id}
            to={`/plant/${plant.id}`}
            onClick={() => { onSelect(plant); onClose(); }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer",
              idx === activeIndex ? "bg-accent" : "hover:bg-muted/60",
              idx > 0 && "border-t border-border/40"
            )}
            role="option"
            aria-selected={idx === activeIndex}
          >
            {/* Thumbnail */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {heroImg ? (
                <img src={heroImg} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Leaf className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {nameSegments.map((seg, i) =>
                  seg.highlighted ? (
                    <mark key={i} className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">{seg.text}</mark>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {commonSegments.map((seg, i) =>
                  seg.highlighted ? (
                    <mark key={i} className="bg-primary/10 text-primary rounded-sm px-0.5">{seg.text}</mark>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </p>
            </div>

            {/* Price + stock */}
            <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
              {plant.price != null && (
                <span className="text-sm font-semibold text-foreground">{formatPrice(plant.price)}</span>
              )}
              {plant.quantity > 0 ? (
                <span className="text-[10px] text-emerald-600">
                  {plant.quantity <= 3 ? `${plant.quantity} disp.` : "En stock"}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Agotado</span>
              )}
            </div>
          </Link>
        );
      })}

      {/* Footer */}
      <div className="px-3 py-2 bg-muted/40 border-t border-border/40 flex items-center gap-1.5">
        <Search className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">
          {results.length} resultado{results.length !== 1 ? "s" : ""} · Enter para ver · ↑↓ navegar
        </span>
      </div>
    </div>
  );
};

export default AutocompleteDropdown;
