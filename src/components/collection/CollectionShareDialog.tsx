import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Globe, Link2, Lock, Copy, Check, Trash2, Eye, Loader2,
} from 'lucide-react';
import {
  useCollectionShare,
  useUpdateCollectionShare,
  useRevokeCollectionShare,
  type ShareVisibility,
} from '@/hooks/collection/useCollectionSharing';

interface Props {
  collectionId: string;
  collectionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const visibilityOptions: { value: ShareVisibility; label: string; desc: string; icon: typeof Lock }[] = [
  { value: 'private', label: 'Privada', desc: 'Solo tú puedes ver esta colección', icon: Lock },
  { value: 'link', label: 'Con enlace', desc: 'Cualquiera con el enlace puede ver', icon: Link2 },
  { value: 'public', label: 'Pública', desc: 'Visible para todos', icon: Globe },
];

const CollectionShareDialog = ({ collectionId, collectionName, open, onOpenChange }: Props) => {
  const { data: share, isLoading } = useCollectionShare(open ? collectionId : undefined);
  const updateMutation = useUpdateCollectionShare();
  const revokeMutation = useRevokeCollectionShare();

  const [copied, setCopied] = useState(false);
  const currentVisibility: ShareVisibility = (share?.visibility as ShareVisibility) ?? 'private';

  const shareUrl = share?.share_token
    ? `${window.location.origin}/collection/shared/${share.share_token}`
    : '';

  const handleVisibilityChange = (value: string) => {
    updateMutation.mutate({
      collectionId,
      visibility: value as ShareVisibility,
    });
  };

  const handleAllowDownloadChange = (checked: boolean) => {
    updateMutation.mutate({ collectionId, allow_download: checked });
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  };

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  const handleRevoke = () => {
    revokeMutation.mutate(collectionId);
  };

  const isPending = updateMutation.isPending || revokeMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Compartir colección
          </DialogTitle>
          <DialogDescription>
            Configura cómo se comparte «{collectionName}»
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Visibility selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Visibilidad</Label>
              <RadioGroup
                value={currentVisibility}
                onValueChange={handleVisibilityChange}
                className="space-y-2"
                disabled={isPending}
              >
                {visibilityOptions.map(({ value, label, desc, icon: Icon }) => (
                  <label
                    key={value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      currentVisibility === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <RadioGroupItem value={value} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${currentVisibility === value ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="font-medium text-sm">{label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Share link (only when not private) */}
            {currentVisibility !== 'private' && shareUrl && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Enlace para compartir</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={shareUrl}
                      className="text-xs font-mono bg-muted"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleCopy}
                      className="shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  {share?.view_count != null && share.view_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      <span>{share.view_count} visualizaciones</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Options */}
            {currentVisibility !== 'private' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="allow-download" className="text-sm cursor-pointer">
                      Permitir descarga de fotos
                    </Label>
                    <Switch
                      id="allow-download"
                      checked={share?.allow_download ?? false}
                      onCheckedChange={handleAllowDownloadChange}
                      disabled={isPending}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Revoke */}
            {share && currentVisibility !== 'private' && (
              <>
                <Separator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive w-full"
                  onClick={handleRevoke}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revocar enlace e ir a privada
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CollectionShareDialog;
