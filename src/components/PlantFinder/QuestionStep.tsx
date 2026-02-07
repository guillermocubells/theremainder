import { Question, QuestionOption } from './types';
import { cn } from '@/lib/utils';

interface QuestionStepProps {
  question: Question;
  selectedValue: string | null;
  onSelect: (value: string) => void;
}

const QuestionStep = ({ question, selectedValue, onSelect }: QuestionStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          {question.title}
        </h3>
        {question.subtitle && (
          <p className="text-sm sm:text-base text-muted-foreground">
            {question.subtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((option: QuestionOption) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
              "hover:border-primary/60 hover:bg-primary/5",
              selectedValue === option.value
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card"
            )}
          >
            {option.icon && (
              <span className="text-2xl flex-shrink-0">{option.icon}</span>
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium",
                selectedValue === option.value ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </p>
              {option.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuestionStep;
