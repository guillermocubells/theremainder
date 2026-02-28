import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCastVote } from '@/hooks/useReviewVotes';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoteWidgetProps {
  reviewId: string;
  score: number;
  userVote?: 1 | -1 | null;
}

const VoteWidget = ({ reviewId, score, userVote }: VoteWidgetProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { mutate, isPending } = useCastVote();

  const handleVote = (type: 1 | -1) => {
    if (!user) {
      toast.info(t('reviews.loginToVote', 'Inicia sesión para votar'));
      return;
    }
    // Toggle: if same vote, remove it (0); otherwise cast new
    const newType = userVote === type ? 0 : type;
    mutate({ reviewId, voteType: newType as 1 | -1 | 0 });
  };

  const isUpvoted = userVote === 1;
  const isDownvoted = userVote === -1;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={isPending}
        aria-label={t('reviews.upvote', 'Votar positivo')}
        className={cn(
          'p-1 rounded transition-colors disabled:opacity-50',
          isUpvoted
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-primary hover:bg-primary/5',
          !user && 'cursor-not-allowed opacity-60'
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>

      <span
        className={cn(
          'text-xs font-semibold min-w-[1.25rem] text-center tabular-nums',
          score > 0 && 'text-primary',
          score < 0 && 'text-destructive',
          score === 0 && 'text-muted-foreground'
        )}
      >
        {score}
      </span>

      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={isPending}
        aria-label={t('reviews.downvote', 'Votar negativo')}
        className={cn(
          'p-1 rounded transition-colors disabled:opacity-50',
          isDownvoted
            ? 'text-destructive bg-destructive/10'
            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/5',
          !user && 'cursor-not-allowed opacity-60'
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default VoteWidget;
