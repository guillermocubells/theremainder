import { useUserReputation, useUserBadges } from "@/hooks/useUserReputation";
import { ConfidenceMeter, ContributorBadges } from "@/components/reputation";

interface ReviewerReputationProps {
  userId: string | null;
}

export default function ReviewerReputation({ userId }: ReviewerReputationProps) {
  const { data: reputation } = useUserReputation(userId ?? undefined);
  const { data: badges = [] } = useUserBadges(userId ?? undefined);

  if (!userId || !reputation) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <ConfidenceMeter
        score={reputation.total_score}
        confidence={reputation.confidence}
        level={reputation.level}
        compact
      />
      <ContributorBadges badges={badges} maxVisible={2} />
    </div>
  );
}
