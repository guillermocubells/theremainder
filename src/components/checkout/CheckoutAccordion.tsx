import { Check, ChevronDown, Truck, Mail, MapPin, FileText, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type CheckoutStep = "shipping" | "contact" | "address" | "notes" | "payment";

interface CheckoutStepConfig {
  id: CheckoutStep;
  title: string;
  icon: React.ReactNode;
  summary?: string;
}

interface CheckoutAccordionItemProps {
  step: CheckoutStepConfig;
  stepNumber: number;
  currentStep: CheckoutStep;
  completedSteps: CheckoutStep[];
  onStepClick: (step: CheckoutStep) => void;
  children: React.ReactNode;
  canEdit?: boolean;
}

export function CheckoutAccordionItem({
  step,
  stepNumber,
  currentStep,
  completedSteps,
  onStepClick,
  children,
  canEdit = true,
}: CheckoutAccordionItemProps) {
  const isActive = currentStep === step.id;
  const isCompleted = completedSteps.includes(step.id);
  const canOpen = canEdit && (isCompleted || isActive);

  return (
    <Collapsible
      open={isActive}
      onOpenChange={() => canOpen && onStepClick(step.id)}
    >
      <div
        className={cn(
          "bg-card border rounded-xl overflow-hidden transition-all",
          isActive ? "border-moss shadow-sm" : "border-border",
          isCompleted && !isActive && "bg-muted/30"
        )}
      >
        <CollapsibleTrigger
          className={cn(
            "w-full p-4 sm:p-6 flex items-center gap-4 text-left transition-colors",
            canOpen && "hover:bg-muted/50 cursor-pointer",
            !canOpen && "cursor-default"
          )}
          disabled={!canOpen}
        >
          {/* Step number/check indicator */}
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              isCompleted
                ? "bg-moss text-white"
                : isActive
                ? "bg-moss/10 text-moss border-2 border-moss"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isCompleted ? (
              <Check className="h-4 w-4" />
            ) : (
              stepNumber
            )}
          </div>

          {/* Step info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{step.icon}</span>
              <h3 className={cn(
                "font-semibold",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </h3>
            </div>
            {isCompleted && !isActive && step.summary && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {step.summary}
              </p>
            )}
          </div>

          {/* Chevron */}
          {canOpen && (
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isActive && "rotate-180"
              )}
            />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 sm:px-6 pb-6 pt-2">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface StepNavigationProps {
  onContinue: () => void;
  continueLabel: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function StepNavigation({
  onContinue,
  continueLabel,
  disabled = false,
  isLoading = false,
}: StepNavigationProps) {
  return (
    <div className="flex justify-end mt-6">
      <Button
        onClick={onContinue}
        disabled={disabled || isLoading}
        className="bg-moss hover:bg-moss/90 text-white min-w-[180px]"
      >
        {isLoading ? "Cargando..." : continueLabel}
      </Button>
    </div>
  );
}

export const STEP_ICONS = {
  shipping: <Truck className="h-4 w-4" />,
  contact: <Mail className="h-4 w-4" />,
  address: <MapPin className="h-4 w-4" />,
  notes: <FileText className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
};
