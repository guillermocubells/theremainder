import { useState } from 'react';
import { Share2, Copy, Check, Globe, GlobeLock, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSharedSearchList } from '@/hooks/garden/useSharedSearchList';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface ShareSearchListButtonProps {
  searchingCount: number;
}

export const ShareSearchListButton = ({ searchingCount }: ShareSearchListButtonProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { sharedList, isLoading, togglePublic, isToggling, getShareUrl, createOrUpdate } = useSharedSearchList();

  const shareUrl = getShareUrl();

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  };

  const handleToggle = () => {
    togglePublic();
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Create the shared list if it doesn't exist when opening
    if (newOpen && !sharedList && !isLoading) {
      createOrUpdate({ is_public: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Compartir lista</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartir lista de búsqueda
          </DialogTitle>
          <DialogDescription>
            Comparte las {searchingCount} plantas que estás buscando con otras personas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Toggle público */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              {sharedList?.is_public ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <GlobeLock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="public-toggle" className="font-medium">
                  Lista pública
                </Label>
                <p className="text-sm text-muted-foreground">
                  {sharedList?.is_public 
                    ? 'Cualquiera con el link puede ver tu lista'
                    : 'Solo tú puedes ver tu lista'
                  }
                </p>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-11" />
            ) : (
              <Switch
                id="public-toggle"
                checked={sharedList?.is_public ?? false}
                onCheckedChange={handleToggle}
                disabled={isToggling}
              />
            )}
          </div>

          {/* Link compartir */}
          {sharedList?.is_public && shareUrl && (
            <div className="space-y-3">
              <Label>Link para compartir</Label>
              <div className="flex gap-2">
                <Input 
                  value={shareUrl}
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Share options */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`¡Mira las plantas que estoy buscando! ${shareUrl}`)}`,
                      '_blank'
                    );
                  }}
                >
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    window.open(
                      `mailto:?subject=${encodeURIComponent('Mi lista de plantas')}&body=${encodeURIComponent(`¡Mira las plantas que estoy buscando! ${shareUrl}`)}`,
                      '_blank'
                    );
                  }}
                >
                  Email
                </Button>
              </div>
            </div>
          )}

          {/* Info message when not public */}
          {!sharedList?.is_public && !isLoading && (
            <div className="text-center py-4 text-muted-foreground">
              <GlobeLock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Activa la lista pública para generar un link que puedas compartir
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
