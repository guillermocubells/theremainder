import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useRef } from 'react';
import {
  Loader2, Clock, CheckCircle, XCircle, MessageSquare, Image as ImageIcon,
  FileText, Upload, X, Send,
} from 'lucide-react';

interface SellerAuction {
  id: string;
  title: string;
  status: string;
  starting_price: number;
  images: string[] | null;
  provenance_documents: string[] | null;
  admin_notes: string | null;
  change_request_message: string | null;
  reviewed_at: string | null;
  seller_notes: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', pending_review: 'Pendiente revisión', approved: 'Aprobado',
  rejected: 'Rechazado', changes_requested: 'Cambios solicitados', scheduled: 'Programado',
  live: 'En vivo', ended: 'Finalizado', settled: 'Liquidado', cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline', pending_review: 'secondary', approved: 'default',
  rejected: 'destructive', changes_requested: 'secondary', scheduled: 'default',
  live: 'default', ended: 'outline', settled: 'outline', cancelled: 'destructive',
};

const SellerAuctions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [uploading, setUploading] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: auctions, isLoading } = useQuery({
    queryKey: ['seller-auctions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('auctions' as any)
        .select('id, title, status, starting_price, images, provenance_documents, admin_notes, change_request_message, reviewed_at, seller_notes, created_at')
        .eq('seller_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as SellerAuction[];
    },
    enabled: !!user,
  });

  const uploadDoc = async (files: FileList | null, auctionId: string) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `auctions/docs/${auctionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('plant-images').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('plant-images').getPublicUrl(path);
        uploaded.push(publicUrl);
      }

      const auction = auctions?.find(a => a.id === auctionId);
      const existing = auction?.provenance_documents || [];
      const { error } = await supabase
        .from('auctions' as any)
        .update({ provenance_documents: [...existing, ...uploaded] })
        .eq('id', auctionId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['seller-auctions'] });
      toast.success('Documento adjuntado');
    } catch (e: any) {
      toast.error('Error al subir: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const resubmit = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('auctions' as any)
        .update({
          status: 'pending_review',
          seller_notes: notes || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-auctions'] });
      setExpandedId(null);
      setReplyText('');
      toast.success('Lote reenviado para revisión');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!auctions?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
          No tienes lotes enviados aún.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {auctions.map(auction => {
        const isExpanded = expandedId === auction.id;
        const canResubmit = auction.status === 'changes_requested';
        const canAttachDocs = ['draft', 'pending_review', 'changes_requested'].includes(auction.status);

        return (
          <Card key={auction.id} className="overflow-hidden">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : auction.id)}
            >
              {auction.images?.[0] ? (
                <img src={auction.images[0]} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{auction.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(auction.created_at), 'dd MMM yyyy', { locale: es })} · {auction.starting_price.toFixed(2)} €
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[auction.status] || 'outline'}>
                {STATUS_LABELS[auction.status] || auction.status}
              </Badge>
            </div>

            {isExpanded && (
              <CardContent className="pt-0 space-y-4">
                <Separator />

                {/* Admin feedback */}
                {auction.change_request_message && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      Cambios solicitados
                      {auction.reviewed_at && (
                        <span>· {format(new Date(auction.reviewed_at), 'dd MMM HH:mm', { locale: es })}</span>
                      )}
                    </div>
                    <p className="text-sm">{auction.change_request_message}</p>
                  </div>
                )}

                {auction.status === 'rejected' && auction.admin_notes && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-destructive">
                      <XCircle className="h-3 w-3" />
                      Motivo del rechazo
                    </div>
                    <p className="text-sm">{auction.admin_notes}</p>
                  </div>
                )}

                {auction.status === 'approved' && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs text-primary">
                      <CheckCircle className="h-3 w-3" />
                      Aprobado — pendiente de programación por el equipo.
                    </div>
                  </div>
                )}

                {/* Provenance documents */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Documentos de procedencia ({auction.provenance_documents?.length || 0})
                  </Label>
                  {auction.provenance_documents && auction.provenance_documents.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {auction.provenance_documents.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline hover:no-underline flex items-center gap-1 bg-muted rounded px-2 py-1"
                        >
                          <FileText className="h-3 w-3" />
                          Doc {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  {canAttachDocs && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => docInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                        Adjuntar documento
                      </Button>
                      <input
                        ref={docInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        multiple
                        className="hidden"
                        onChange={e => uploadDoc(e.target.files, auction.id)}
                      />
                    </>
                  )}
                </div>

                {/* Resubmit form */}
                {canResubmit && (
                  <div className="space-y-3 pt-2">
                    <Separator />
                    <Label className="text-sm">Respuesta al equipo</Label>
                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Describe los cambios realizados..."
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={() => resubmit.mutate({ id: auction.id, notes: replyText })}
                      disabled={resubmit.isPending}
                    >
                      {resubmit.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                      Reenviar para revisión
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default SellerAuctions;
