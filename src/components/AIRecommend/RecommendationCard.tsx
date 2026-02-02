import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, ExternalLink, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlantRecommendation, CatalogPlant } from "@/hooks/useRecommendPlants";

interface RecommendationCardProps {
  recommendation: PlantRecommendation;
  plant: CatalogPlant | undefined;
  onAddToWishlist?: (plantId: string) => void;
  rank: number;
}

const RecommendationCard = ({ 
  recommendation, 
  plant, 
  onAddToWishlist,
  rank 
}: RecommendationCardProps) => {
  const { t } = useTranslation();
  
  if (!plant) return null;

  const scorePercentage = Math.round(recommendation.fit_score * 100);
  
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "text-moss bg-moss/10";
    if (score >= 0.5) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return "Excelente match";
    if (score >= 0.7) return "Buen match";
    if (score >= 0.5) return "Match aceptable";
    return "Match débil";
  };

  return (
    <Card className="overflow-hidden border-border bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image Section */}
          <div className="relative w-full sm:w-40 h-40 sm:h-auto flex-shrink-0">
            {plant.thumbnail_url ? (
              <img 
                src={plant.thumbnail_url} 
                alt={plant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Sin imagen</span>
              </div>
            )}
            
            {/* Rank Badge */}
            <div className="absolute top-2 left-2">
              <Badge 
                variant="secondary" 
                className="bg-background/90 backdrop-blur-sm font-bold text-sm px-2 py-1"
              >
                #{rank}
              </Badge>
            </div>
            
            {/* Score Badge */}
            <div className="absolute top-2 right-2">
              <Badge className={`${getScoreColor(recommendation.fit_score)} font-semibold`}>
                {scorePercentage}%
              </Badge>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base truncate">
                  {plant.name}
                </h3>
                {plant.scientific_name && (
                  <p className="text-xs text-muted-foreground italic truncate">
                    {plant.scientific_name}
                  </p>
                )}
              </div>
              {plant.price !== undefined && (
                <span className="font-bold text-primary text-sm whitespace-nowrap">
                  {plant.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </span>
              )}
            </div>

            {/* Score Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {getScoreLabel(recommendation.fit_score)}
                </span>
              </div>
              <Progress 
                value={scorePercentage} 
                className="h-1.5"
              />
            </div>

            {/* Reasoning */}
            <div className="space-y-2">
              <div className="bg-moss/5 border border-moss/20 rounded-lg p-2.5">
                <p className="text-xs text-foreground leading-relaxed">
                  <span className="font-medium text-moss">✓ Por qué encaja:</span>{" "}
                  {recommendation.reasoning}
                </p>
              </div>
              
              {recommendation.tradeoffs && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <p className="text-xs text-foreground leading-relaxed flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium text-amber-700">Consideraciones:</span>{" "}
                      {recommendation.tradeoffs}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-2 pt-1">
              <Button 
                asChild 
                size="sm" 
                className="flex-1"
              >
                <Link to={`/plant/${plant.id}`} className="flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver ficha
                </Link>
              </Button>
              
              {onAddToWishlist && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddToWishlist(plant.id)}
                >
                  <Heart className="h-3.5 w-3.5 mr-1.5" />
                  Wishlist
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecommendationCard;
