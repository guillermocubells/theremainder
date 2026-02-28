import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReviewComments, useCreateComment } from '@/hooks/useReviewComments';
import CommentComposer from './CommentComposer';
import CommentNode from './CommentNode';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CommentThreadProps {
  reviewId: string;
}

const PAGE_SIZE = 5;

const CommentThread = ({ reviewId }: CommentThreadProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: comments = [], isLoading } = useReviewComments(reviewId, sort);
  const createComment = useCreateComment();

  const handleCreate = async (authorName: string, body: string) => {
    if (!user) { toast.info(t('comments.loginRequired', 'Inicia sesión para comentar')); return; }
    try {
      await createComment.mutateAsync({ review_id: reviewId, author_name: authorName, body });
    } catch {
      toast.error(t('comments.errorCreating', 'Error al publicar comentario'));
    }
  };

  const handleReply = async (parentId: string, authorName: string, body: string) => {
    if (!user) { toast.info(t('comments.loginRequired', 'Inicia sesión para comentar')); return; }
    try {
      await createComment.mutateAsync({ review_id: reviewId, parent_id: parentId, author_name: authorName, body });
    } catch {
      toast.error(t('comments.errorCreating', 'Error al publicar comentario'));
    }
  };

  const visibleComments = comments.slice(0, visibleCount);
  const hasMore = comments.length > visibleCount;
  const totalFlat = countAll(comments);

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {totalFlat} {totalFlat === 1 ? t('comments.comment', 'comentario') : t('comments.comments', 'comentarios')}
          </span>
        </div>
        {comments.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground"
            onClick={() => setSort(sort === 'new' ? 'top' : 'new')}
          >
            <ArrowUpDown className="h-3 w-3 mr-0.5" />
            {sort === 'new' ? t('comments.sortTop', 'Más antiguos') : t('comments.sortNew', 'Más recientes')}
          </Button>
        )}
      </div>

      {/* Composer */}
      <div className="mb-3">
        <CommentComposer onSubmit={handleCreate} />
      </div>

      {/* Thread */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-2">{t('common.loading')}</p>
      ) : (
        <>
          <div className="space-y-0.5">
            {visibleComments.map((comment) => (
              <CommentNode
                key={comment.id}
                comment={comment}
                reviewId={reviewId}
                onReply={handleReply}
              />
            ))}
          </div>

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs text-muted-foreground h-7"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              {t('comments.loadMore', 'Cargar más comentarios')} ({comments.length - visibleCount} {t('comments.remaining', 'restantes')})
            </Button>
          )}
        </>
      )}
    </div>
  );
};

function countAll(comments: { replies?: any[] }[]): number {
  return comments.reduce((sum, c) => sum + 1 + (c.replies ? countAll(c.replies) : 0), 0);
}

export default CommentThread;
