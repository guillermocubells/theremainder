import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { plants, Plant } from "@/data/plants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf } from "lucide-react";

interface RelatedPlantsProps {
  currentPlant: Plant;
  maxItems?: number;
}

const RelatedPlants = ({ currentPlant, maxItems = 4 }: RelatedPlantsProps) => {
  const { t } = useTranslation();

  // Filter plants by same plantGroup, excluding current plant
  const relatedPlants = plants
    .filter(
      (p) =>
        p.plantGroup === currentPlant.plantGroup &&
        p.id !== currentPlant.id &&
        p.quantity > 0
    )
    .slice(0, maxItems);

  if (relatedPlants.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 sm:mt-12">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <Leaf className="h-5 w-5 text-moss" />
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">
          {t('plant.relatedPlants', 'Plantas relacionadas')}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {relatedPlants.map((plant) => (
          <Link
            key={plant.id}
            to={`/plant/${plant.id}`}
            className="group"
          >
            <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md h-full">
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {plant.images?.[0] ? (
                  <img
                    src={plant.images[0]}
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
                {/* Plant name */}
                <h3 className="text-sm sm:text-base font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {plant.name}
                </h3>

                {/* Common name */}
                {plant.commonName && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {plant.commonName}
                  </p>
                )}

                {/* Price and availability */}
                <div className="flex items-center justify-between mt-2 gap-2">
                  <span className="text-sm sm:text-base font-semibold text-foreground">
                    {plant.price?.toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                  {plant.quantity <= 3 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-warning/50 text-warning bg-warning/10"
                    >
                      {plant.quantity}x
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RelatedPlants;
