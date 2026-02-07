import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plant } from '@/data/plants';
import PlantCard from '@/components/PlantCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RotateCcw, Edit2, Sparkles, Bookmark, Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateSavedSearch } from '@/hooks/useSavedSearches';
import { PlantFinderAnswers } from './types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PlantFinderResultsProps {
  plants: Plant[];
  activeFilters: string[];
  answers: PlantFinderAnswers;
  onReset: () => void;
  onEditAnswers: () => void;
}

const PlantFinderResults = ({ 
  plants, 
  activeFilters, 
  answers,
  onReset, 
  onEditAnswers
}: PlantFinderResultsProps) => {
  const { t } = useTranslation();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const createSavedSearch = useCreateSavedSearch();
  
  const hasActiveFilters = Object.values(answers).some(v => v !== null);

  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast.error(t('plantFinder.results.saveDialog.nameRequired'));
      return;
    }

    try {
      await createSavedSearch.mutateAsync({
        name: searchName.trim(),
        filters: answers,
      });
      toast.success(t('plantFinder.results.saveDialog.saved'));
      setShowSaveDialog(false);
      setSearchName('');
    } catch (error) {
      toast.error(t('plantFinder.results.saveDialog.error'));
    }
  };

  const resultMessage = plants.length === 0
    ? t('plantFinder.results.noMatch')
    : plants.length === 1
      ? t('plantFinder.results.matchOne')
      : t('plantFinder.results.matchMany', { count: plants.length });

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t('plantFinder.results.title')}
          </h2>
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">{resultMessage}</span>
          </div>
        </div>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {activeFilters.map((filter, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
              >
                {filter}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditAnswers}
            className="text-muted-foreground"
          >
            <Edit2 className="h-4 w-4 mr-1" />
            {t('plantFinder.results.editAnswers')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            {t('plantFinder.results.reset')}
          </Button>
          
          {user && hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              className="text-primary border-primary/30 hover:bg-primary/5"
            >
              <Bookmark className="h-4 w-4 mr-1" />
              {t('plantFinder.results.save')}
            </Button>
          )}
        </div>
        
        {/* Login prompt for guests */}
        {!user && hasActiveFilters && (
          <p className="text-sm text-muted-foreground text-center">
            <a href="/auth" className="text-primary hover:underline font-medium">
              {t('plantFinder.results.loginLink')}
            </a>
            {' '}{t('plantFinder.results.loginToSave')}
          </p>
        )}

        {/* Save search dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('plantFinder.results.saveDialog.title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder={t('plantFinder.results.saveDialog.placeholder')}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {t('plantFinder.results.saveDialog.hint')}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSaveSearch}
                disabled={createSavedSearch.isPending || !searchName.trim()}
              >
                {createSavedSearch.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Bookmark className="h-4 w-4 mr-2" />
                )}
                {t('plantFinder.results.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Results grid */}
        {plants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plants.map(plant => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted rounded-xl">
            <p className="text-muted-foreground mb-4">
              {t('plantFinder.results.empty')}
            </p>
            <Button
              onClick={onReset}
              variant="outline"
              className="text-primary border-primary/30"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('plantFinder.results.startOver')}
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default PlantFinderResults;
