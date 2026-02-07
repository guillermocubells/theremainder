import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { plants } from '@/data/plants';
import { PlantFinderAnswers, initialAnswers, getQuestions } from './types';
import ProgressBar from './ProgressBar';
import QuestionStep from './QuestionStep';
import HardinessZoneStep from './HardinessZoneStep';
import PlantFinderResults from './PlantFinderResults';
import { filterPlantsByAnswers, trackPlantFinderEvent } from './filterLogic';

interface PlantFinderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlantFinderModal = ({ open, onOpenChange }: PlantFinderModalProps) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<PlantFinderAnswers>(initialAnswers);
  const [showResults, setShowResults] = useState(false);

  const questions = useMemo(() => getQuestions(t), [t]);
  const totalSteps = questions.length;

  useEffect(() => {
    if (open) {
      trackPlantFinderEvent('plant_finder_opened');
    }
  }, [open]);

  const handleAnswer = (questionId: keyof PlantFinderAnswers, value: string, autoAdvance: boolean = false) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    trackPlantFinderEvent('question_answered', { questionId, value, step: currentStep + 1 });
    
    if (autoAdvance) {
      setTimeout(() => {
        if (currentStep < totalSteps - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          trackPlantFinderEvent('questionnaire_completed', { ...answers, [questionId]: value });
          setShowResults(true);
        }
      }, 200);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      trackPlantFinderEvent('questionnaire_completed', { answers });
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setAnswers(initialAnswers);
    setCurrentStep(0);
    setShowResults(false);
    trackPlantFinderEvent('questionnaire_reset');
  };

  const handleEditAnswers = () => {
    setShowResults(false);
    setCurrentStep(0);
  };

  const currentQuestion = questions[currentStep];
  const currentAnswer = answers[currentQuestion.id];
  const isLastStep = currentStep === totalSteps - 1;

  const { plants: filteredPlants, activeFilters } = filterPlantsByAnswers(plants, answers);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${showResults ? 'max-w-5xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        {!showResults && (
          <DialogHeader>
            <DialogTitle className="text-center text-primary flex items-center justify-center gap-2">
              <Search className="h-5 w-5" />
              {t('plantFinder.title')}
            </DialogTitle>
          </DialogHeader>
        )}
        {showResults && <DialogHeader><DialogTitle className="sr-only">{t('plantFinder.resultsSrOnly')}</DialogTitle></DialogHeader>}

        {!showResults ? (
          <div className="space-y-6 py-4">
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

            {currentQuestion.id === 'hardinessZone' ? (
              <HardinessZoneStep
                selectedValue={currentAnswer}
                onSelect={(value) => handleAnswer('hardinessZone', value, true)}
              />
            ) : (
              <QuestionStep
                question={currentQuestion}
                selectedValue={currentAnswer}
                onSelect={(value) => handleAnswer(currentQuestion.id, value, true)}
              />
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('plantFinder.previous')}
              </Button>

              <Button
                onClick={handleNext}
              >
                {isLastStep ? (
                  <>
                    {t('plantFinder.viewResults')}
                    <Search className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    {t('plantFinder.next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <PlantFinderResults
            plants={filteredPlants}
            activeFilters={activeFilters}
            answers={answers}
            onReset={handleReset}
            onEditAnswers={handleEditAnswers}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlantFinderModal;
