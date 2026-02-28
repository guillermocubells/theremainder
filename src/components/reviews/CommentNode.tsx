import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Pencil, Trash2, MessageSquare, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewComment, useDeleteComment, useUpdateComment } from '@/hooks/useReviewComments';
import CommentComposer from './CommentComposer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CommentNodeProps {
  comment: ReviewComment;
  reviewId: string;
  onReply: (parentId: string, authorName: string, body: string) => Promise<void>;
  maxDepth?: number;
}

const MAX_DEPTH = 3;

const CommentNode = ({ comment, reviewId, onReply, maxDepth = MAX_DEPTH }: CommentNodeProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const deleteComment = useDeleteComment();
  const updateComment = useUpdateComment();

  const isOwner = user?.id === comment.user_id;

  const renderMarkdown = (text: string) => {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  const handleDelete = async () => {
    try {
      await deleteComment.mutateAsync({ id: comment.id, reviewId });
      toast.success(t('comments.deleted', 'Comentario eliminado'));
    } catch {
      toast.error(t('comments.errorDeleting', 'Error al eliminar'));
    }
  };

  const handleEdit = async (_: string, body: string) => {
    try {
      await updateComment.mutateAsync({ id: comment.id, body, reviewId });
      setEditing(false);
      toast.success(t('comments.updated', 'Comentario actualizado'));
    } catch {
      toast.error(t('comments.errorUpdating', 'Error al actualizar'));
    }
  };

  const handleReply = async (authorName: string, body: string) => {
    await onReply(comment.id, authorName, body);
    setReplying(false);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className={cn('group', comment.depth > 0 && 'ml-4 sm:ml-6 pl-3 border-l-2 border-border')}>
      <div className="py-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1 bg-secondary rounded-full">
            <User className="h-2.5 w-2.5 text-primary" />
          </div>
          <span className="text-xs font-medium text-foreground">{comment.author_name}</span>
          <span className="text-[10px] text-muted-foreground">{formatDate(comment.created_at)}</span>
          {comment.is_edited && (
            <span className="text-[10px] text-muted-foreground italic">({t('comments.edited', 'editado')})</span>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <CommentComposer
            onSubmit={handleEdit}
            initialBody={comment.body}
            hideNameField
            compact
            submitLabel={t('comments.saveEdit', 'Guardar')}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div
            className="text-xs sm:text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.body) }}
          />
        )}

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {comment.depth < maxDepth && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] text-muted-foreground"
                onClick={() => {
                  if (!user) { toast.info(t('comments.loginRequired', 'Inicia sesión para comentar')); return; }
                  setReplying(!replying);
                }}
              >
                <CornerDownRight className="h-3 w-3 mr-0.5" />
                {t('comments.reply', 'Responder')}
              </Button>
            )}
            {isOwner && (
              <>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-muted-foreground" onClick={() => setEditing(true)}>
                  <Pencil className="h-3 w-3 mr-0.5" />
                  {t('common.edit')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[10px] text-destructive"
                  onClick={handleDelete}
                  disabled={deleteComment.isPending}
                >
                  <Trash2 className="h-3 w-3 mr-0.5" />
                  {t('common.delete')}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Reply composer */}
        {replying && (
          <div className="mt-2">
            <CommentComposer
              onSubmit={handleReply}
              compact
              placeholder={t('comments.replyPlaceholder', 'Escribe una respuesta...')}
              submitLabel={t('comments.reply', 'Responder')}
              onCancel={() => setReplying(false)}
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              reviewId={reviewId}
              onReply={onReply}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentNode;
