import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldCheck } from "lucide-react";

interface ConfidenceMeterProps {
  score: number;
  confidence: number | null;
  level: string;
  compact?: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  newcomer: "text-muted-foreground",
  contributor: "text-primary",
  trusted: "text-accent-foreground",
  expert: "text-chart-4",
};

export default function ConfidenceMeter({
  score,
  confidence,
  level,
  compact = false,
}: ConfidenceMeterProps) {
  const { t } = useTranslation();
  const pct = Math.min(Math.max(confidence ?? 0, 0), 100);

  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${LEVEL_COLORS[level] ?? "text-muted-foreground"}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {score}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            <p className="font-medium capitalize mb-0.5">
              {t(`reputation.level.${level}`, level)}
            </p>
            <p className="text-muted-foreground">
              {t("reputation.confidence", "Confianza")}: {pct}%
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium capitalize ${LEVEL_COLORS[level] ?? ""}`}>
          {t(`reputation.level.${level}`, level)}
        </span>
        <span className="text-muted-foreground">{score} pts</span>
      </div>
      <Progress value={pct} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground text-right">
        {t("reputation.confidence", "Confianza")} {pct}%
      </p>
    </div>
  );
}
