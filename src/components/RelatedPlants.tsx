import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { plants as staticPlants, Plant } from "@/data/plants";
import { useCatalogPlants } from "@/hooks/useCatalogPlants";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import { Leaf } from "lucide-react";
import { getMainImage } from "@/utils/plantImageUtils";

interface RelatedPlantsProps {
  currentPlant: Plant;
  maxItems?: number;
}

const RelatedPlants = ({ currentPlant, maxItems = 4 }: RelatedPlantsProps) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { plants: catalogPlants } = useCatalogPlants();

  // Merge static + catalog, deduplicate by id, prefer catalog
  const allPlants = (() => {
    const map = new Map<string, Plant>();
    for (const p of staticPlants) map.set(p.id, p);
    for (const p of catalogPlants) map.set(p.id, p);
    return Array.from(map.values());
  })();

  // Filter by same plantGroup, excluding current, prefer in-stock
  const relatedPlants = allPlants
    .filter(
      (p) =>
        p.plantGroup === currentPlant.plantGroup &&
        p.id !== currentPlant.id
    )
    .sort((a, b) => (b.quantity > 0 ? 1 : 0) - (a.quantity > 0 ? 1 : 0))
    .slice(0, maxItems);

  if (relatedPlants.length === 0) return null;

  return (
    <section className="mt-8 sm:mt-12">
      <h2 className="text-sm sm:text-base font-semibold text-foreground mb-4 sm:mb-6">
        {t('plant.relatedPlants', 'Plantas relacionadas')}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {relatedPlants.map((plant) => {
          const heroImg = getMainImage(plant.images, plant.productImages, plant.primaryImage);
          return (
            <Link key={plant.id} to={`/plant/${plant.id}`} className="group">
              <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md h-full">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {heroImg ? (
                    <img
                      src={heroImg}
                      alt={plant.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Leaf className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3 sm:p-4">
                  <h3 className="text-sm sm:text-base font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {plant.name}
                  </h3>
                  {plant.commonName && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{plant.commonName}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-sm sm:text-base font-semibold text-foreground">
                      {plant.price != null && formatPrice(plant.price)}
                    </span>
                    {plant.quantity > 0 && plant.quantity <= 3 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning/50 text-warning bg-warning/10">
                        {plant.quantity}x
                      </Badge>
                    )}
                    {plant.quantity === 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">
                        Agotado
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default RelatedPlants;
