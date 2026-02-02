import { useState } from "react";
import { Droplets, Sun } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plant } from "@/data/plants";
import { calculateViability, analyzePlantCare } from "@/utils/viabilityCalculator";
import ViabilityScale from "@/components/ViabilityScale";

const RESULTS_INCREMENT = 3;

interface ViabilityResult {
  plant: Plant;
  viability: ReturnType<typeof calculateViability>;
}

interface ViabilityAnalysisPanelProps {
  sortedPlants: ViabilityResult[];
  searchQuery: string;
  postalCode?: string;
  showCareAnalysis?: boolean;
}

const ViabilityAnalysisPanel = ({
  sortedPlants,
  searchQuery,
  postalCode,
  showCareAnalysis = false
}: ViabilityAnalysisPanelProps) => {
  const { t } = useTranslation();
  const [resultsToShow, setResultsToShow] = useState(RESULTS_INCREMENT);

  if (!sortedPlants.length) return null;

  return (
    <div className="space-y-4">
      {/* Viability Analysis */}
      <Card className="bg-card/90 backdrop-blur-sm border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              📊 {t('filters.viabilityAnalysis')}
              {postalCode && (
                <span className="text-sm font-normal text-primary">
                  {t('filters.postalCode')} {postalCode}
                </span>
              )}
            </h3>
            <span className="text-xs text-muted-foreground">{t('filters.sortedByViability')}</span>
          </div>
          
          <p className="text-xs text-muted-foreground mb-4">
            {t('filters.showingResults', { 
              shown: Math.min(resultsToShow, sortedPlants.length), 
              total: sortedPlants.length 
            })}
          </p>

          <div className="space-y-3">
            {sortedPlants.slice(0, resultsToShow).map(({ plant, viability }) => (
              <ViabilityScale 
                key={`${plant.id}-${searchQuery}`}
                viability={viability} 
                plantName={plant.name}
              />
            ))}
          </div>

          {resultsToShow < sortedPlants.length && (
            <div className="text-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResultsToShow(prev => prev + RESULTS_INCREMENT)}
                className="border-border hover:bg-muted"
              >
                {t('filters.showMore')} ({Math.min(RESULTS_INCREMENT, sortedPlants.length - resultsToShow)})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Care Analysis */}
      {showCareAnalysis && (
        <Card className="bg-card/90 backdrop-blur-sm border-border">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              💡 {t('filters.careTips')}
            </h3>
            
            <div className="space-y-3">
              {sortedPlants.slice(0, Math.min(resultsToShow, 3)).map(({ plant }) => {
                const care = analyzePlantCare(plant, searchQuery);
                return (
                  <div key={`care-${plant.id}`} className="bg-accent/50 rounded-lg p-3">
                    <h4 className="font-medium text-foreground mb-2 text-sm">{plant.name}</h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <Droplets className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <span><span className="font-medium">{t('filters.water')}:</span> {care.waterNeeds}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Sun className="h-3.5 w-3.5 text-warning mt-0.5 flex-shrink-0" />
                        <span><span className="font-medium">{t('filters.coverage')}:</span> {care.coverageNeeds}</span>
                      </div>
                      {care.careAdvice && (
                        <div className="bg-background/60 p-2 rounded text-muted-foreground mt-2">
                          <span className="font-medium">{t('filters.tip')}:</span> {care.careAdvice}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ViabilityAnalysisPanel;
