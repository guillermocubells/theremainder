import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Award,
  Flame,
  Star,
  Shield,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import type { UserBadge } from "@/hooks/useUserReputation";

const ICON_MAP: Record<string, LucideIcon> = {
  award: Award,
  flame: Flame,
  star: Star,
  shield: Shield,
  sprout: Sprout,
};

interface ContributorBadgesProps {
  badges: UserBadge[];
  maxVisible?: number;
}

export default function ContributorBadges({
  badges,
  maxVisible = 3,
}: ContributorBadgesProps) {
  const { t } = useTranslation();
  if (!badges.length) return null;

  const visible = badges.slice(0, maxVisible);
  const remaining = badges.length - maxVisible;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-1">
        {visible.map((b) => {
          const Icon = ICON_MAP[b.icon ?? ""] ?? Award;
          return (
            <Tooltip key={b.badge_key}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 gap-1 border-primary/30 bg-primary/5"
                  style={b.color ? { borderColor: b.color, color: b.color } : undefined}
                >
                  <Icon className="h-3 w-3" />
                  {b.label}
                </Badge>
              </TooltipTrigger>
              {b.description && (
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {b.description}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
        {remaining > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            +{remaining}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
