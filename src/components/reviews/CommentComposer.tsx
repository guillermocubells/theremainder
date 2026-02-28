import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CommentComposerProps {
  onSubmit: (authorName: string, body: string) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
  onCancel?: () => void;
  initialBody?: string;
  hideNameField?: boolean;
  compact?: boolean;
}

const CommentComposer = ({
  onSubmit,
  placeholder,
  submitLabel,
  onCancel,
  initialBody = '',
  hideNameField = false,
  compact = false,
}: CommentComposerProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [body, setBody] = useState(initialBody);
  const [authorName, setAuthorName] = useState('');
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info(t('comments.loginRequired', 'Inicia sesión para comentar'));
      return;
    }
    if (!body.trim()) return;
    if (!hideNameField && !authorName.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(authorName.trim(), body.trim());
      setBody('');
      setAuthorName('');
      setPreview(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Simple markdown-to-html for preview (bold, italic, code, line breaks)
  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br/>');
    return html;
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-2 ${compact ? '' : 'p-3 bg-secondary/50 rounded-lg border border-border'}`}>
      {!hideNameField && (
        <Input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder={t('comments.yourName', 'Tu nombre')}
          className="text-sm h-8"
          required
          maxLength={100}
        />
      )}

      <div>
        <Tabs value={preview ? 'preview' : 'write'} onValueChange={(v) => setPreview(v === 'preview')}>
          <TabsList className="h-7 mb-1">
            <TabsTrigger value="write" className="text-xs px-2 py-0.5">
              {t('comments.write', 'Escribir')}
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs px-2 py-0.5" disabled={!body.trim()}>
              {t('comments.preview', 'Vista previa')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {preview ? (
          <div
            className="min-h-[60px] p-2 text-sm text-foreground bg-muted rounded border border-border prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
          />
        ) : (
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder ?? t('comments.placeholder', 'Escribe un comentario... (soporta **negrita**, *cursiva*, `código`)')}
            className="text-sm min-h-[60px] resize-none"
            required
            maxLength={2000}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={submitting || !body.trim()} className="text-xs h-7">
          {submitting ? t('common.loading') : (submitLabel ?? t('comments.submit', 'Comentar'))}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-xs h-7">
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </form>
  );
};

export default CommentComposer;
