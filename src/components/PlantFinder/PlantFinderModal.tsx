import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, SkipForward, Search } from 'lucide-react';
import { plants } from '@/data/plants';
import { PlantFinderAnswers, initialAnswers, questions } from './types';
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
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<PlantFinderAnswers>(initialAnswers);
  const [showResults, setShowResults] = useState(false);

  const totalSteps = questions.length;

  // Track modal open
  useEffect(() => {
    if (open) {
      trackPlantFinderEvent('plant_finder_opened');
    }
  }, [open]);

  const handleAnswer = (questionId: keyof PlantFinderAnswers, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    trackPlantFinderEvent('question_answered', { questionId, value, step: currentStep + 1 });
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Show results
      trackPlantFinderEvent('questionnaire_completed', { answers });
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    trackPlantFinderEvent('question_skipped', { questionId: questions[currentStep].id, step: currentStep + 1 });
    handleNext();
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

  const handleClose = () => {
    onOpenChange(false);
    // Reset after closing
    setTimeout(() => {
      setAnswers(initialAnswers);
      setCurrentStep(0);
      setShowResults(false);
    }, 300);
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
            <DialogTitle className="text-center text-green-800 flex items-center justify-center gap-2">
              <Search className="h-5 w-5" />
              Encuentra tu planta ideal
            </DialogTitle>
          </DialogHeader>
        )}
        {showResults && <DialogHeader><DialogTitle className="sr-only">Resultados</DialogTitle></DialogHeader>}

        {!showResults ? (
          <div className="space-y-6 py-4">
            {/* Progress bar */}
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

            {/* Question content */}
            {currentQuestion.id === 'hardinessZone' ? (
              <HardinessZoneStep
                selectedValue={currentAnswer}
                onSelect={(value) => handleAnswer('hardinessZone', value)}
              />
            ) : (
              <QuestionStep
                question={currentQuestion}
                selectedValue={currentAnswer}
                onSelect={(value) => handleAnswer(currentQuestion.id, value)}
              />
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="text-gray-500"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <Button
                onClick={handleNext}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLastStep ? (
                  <>
                    Ver resultados
                    <Search className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Siguiente
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
            onReset={handleReset}
            onEditAnswers={handleEditAnswers}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlantFinderModal;
