import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BadgeCheck, ExternalLink } from "lucide-react";
import type { VerificationStatus } from "@/hooks/useUserReputation";

interface VerificationBadgeProps {
  verification: VerificationStatus | null | undefined;
}

export default function VerificationBadge({
  verification,
}: VerificationBadgeProps) {
  const { t } = useTranslation();

  if (!verification || verification.status !== "approved") return null;

  const hasEvidence =
    verification.evidence_urls && verification.evidence_urls.length > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 gap-1 border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
          >
            <BadgeCheck className="h-3 w-3" />
            {t("verification.verified", "Verificado")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs space-y-1">
          <p className="font-medium">
            {t("verification.confirmedItem", "Ítem verificado por moderadores")}
          </p>
          {verification.reviewed_at && (
            <p className="text-muted-foreground">
              {new Date(verification.reviewed_at).toLocaleDateString()}
            </p>
          )}
          {hasEvidence && (
            <a
              href={verification.evidence_urls![0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {t("verification.viewEvidence", "Ver evidencia")}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
