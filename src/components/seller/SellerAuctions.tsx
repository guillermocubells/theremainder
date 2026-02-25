import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useRef, useMemo } from 'react';
import {
  Loader2, Clock, CheckCircle, XCircle, MessageSquare, Image as ImageIcon,
  FileText, Upload, X, Send, Eye, Users, Gavel, DollarSign, RotateCcw, Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface SellerAuction {
  id: string;
  title: string;
  slug: string;
  status: string;
  starting_price: number;
  current_price: number;
  total_bids: number;
  reserve_met: boolean;
  images: string[] | null;
  provenance_documents: string[] | null;
  admin_notes: string | null;
  change_request_message: string | null;
  reviewed_at: string | null;
  seller_notes: string | null;
  created_at: string;
  ends_at: string | null;
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

const PLATFORM_FEE_RATE = 0.06;

const SellerAuctions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: auctions, isLoading } = useQuery({
    queryKey: ['seller-auctions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('auctions' as any)
        .select('id, title, slug, status, starting_price, current_price, total_bids, reserve_met, images, provenance_documents, admin_notes, change_request_message, reviewed_at, seller_notes, created_at, ends_at')
        .eq('seller_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as SellerAuction[];
    },
    enabled: !!user,
  });

  const sortedAuctions = useMemo(() => {
    if (!auctions) return [];
    if (sortBy === 'status') {
      const order = ['live', 'scheduled', 'pending_review', 'changes_requested', 'approved', 'draft', 'ended', 'settled', 'rejected', 'cancelled'];
      return [...auctions].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
    }
    return auctions;
  }, [auctions, sortBy]);

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
        .update({ status: 'pending_review', seller_notes: notes || null })
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

  const withdrawDraft = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('auctions' as any)
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-auctions'] });
      toast.success('Borrador retirado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!sortedAuctions.length) {
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
      {/* Sort control */}
      <div className="flex justify-end">
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Por fecha</SelectItem>
            <SelectItem value="status">Por estado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sortedAuctions.map(auction => {
        const isExpanded = expandedId === auction.id;
        const canResubmit = auction.status === 'changes_requested';
        const canAttachDocs = ['draft', 'pending_review', 'changes_requested'].includes(auction.status);
        const canWithdraw = auction.status === 'draft';
        const canViewListing = ['approved', 'scheduled', 'live', 'ended', 'settled'].includes(auction.status);
        const isEndedUnsold = auction.status === 'ended' && !auction.reserve_met;
        const isSettled = auction.status === 'settled' || (auction.status === 'ended' && auction.reserve_met);

        // Payout estimate
        const hammerPrice = auction.current_price;
        const platformFee = hammerPrice * PLATFORM_FEE_RATE;
        const estimatedProceeds = hammerPrice - platformFee;

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
              <div className="flex items-center gap-2">
                {auction.change_request_message && auction.status === 'changes_requested' && (
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Badge variant={STATUS_VARIANT[auction.status] || 'outline'}>
                  {STATUS_LABELS[auction.status] || auction.status}
                </Badge>
              </div>
            </div>

            {isExpanded && (
              <CardContent className="pt-0 space-y-4">
                <Separator />

                {/* Metrics for live/ended */}
                {['live', 'ended', 'settled', 'scheduled'].includes(auction.status) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard icon={<Gavel className="h-4 w-4" />} label="Pujas" value={auction.total_bids.toString()} />
                    <MetricCard icon={<DollarSign className="h-4 w-4" />} label="Precio actual" value={`${hammerPrice.toFixed(2)} €`} />
                    <MetricCard
                      icon={<DollarSign className="h-4 w-4" />}
                      label="Est. neto (−6%)"
                      value={`${estimatedProceeds.toFixed(2)} €`}
                      sublabel={`Comisión: ${platformFee.toFixed(2)} €`}
                    />
                    <MetricCard
                      icon={<Eye className="h-4 w-4" />}
                      label="Reserva"
                      value={auction.reserve_met ? 'Alcanzada ✓' : 'No alcanzada'}
                    />
                  </div>
                )}

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
                    <div className="flex items-center gap-1.5 text-xs text-destructive"><XCircle className="h-3 w-3" />Motivo del rechazo</div>
                    <p className="text-sm">{auction.admin_notes}</p>
                  </div>
                )}

                {auction.status === 'approved' && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs text-primary"><CheckCircle className="h-3 w-3" />Aprobado — pendiente de programación.</div>
                  </div>
                )}

                {/* Provenance documents */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Documentos ({auction.provenance_documents?.length || 0})
                  </Label>
                  {auction.provenance_documents && auction.provenance_documents.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {auction.provenance_documents.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline hover:no-underline flex items-center gap-1 bg-muted rounded px-2 py-1">
                          <FileText className="h-3 w-3" />Doc {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  {canAttachDocs && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => docInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                        Adjuntar documento
                      </Button>
                      <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={e => uploadDoc(e.target.files, auction.id)} />
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {canViewListing && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/subastas/${auction.slug}`}><Eye className="h-3 w-3 mr-1" />Ver lote</Link>
                    </Button>
                  )}
                  {canWithdraw && (
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => withdrawDraft.mutate(auction.id)} disabled={withdrawDraft.isPending}>
                      <Trash2 className="h-3 w-3 mr-1" />Retirar borrador
                    </Button>
                  )}
                  {isEndedUnsold && (
                    <Button size="sm" variant="outline" onClick={() => toast.info('Función de re-listado próximamente')}>
                      <RotateCcw className="h-3 w-3 mr-1" />Relistar
                    </Button>
                  )}
                </div>

                {/* Resubmit form */}
                {canResubmit && (
                  <div className="space-y-3 pt-2">
                    <Separator />
                    <Label className="text-sm">Respuesta al equipo</Label>
                    <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Describe los cambios realizados..." rows={3} />
                    <Button size="sm" onClick={() => resubmit.mutate({ id: auction.id, notes: replyText })} disabled={resubmit.isPending}>
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

const MetricCard = ({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string; sublabel?: string }) => (
  <div className="bg-muted/40 rounded-lg p-2.5 text-center">
    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">{icon}<span className="text-[10px]">{label}</span></div>
    <p className="text-sm font-semibold text-foreground">{value}</p>
    {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
  </div>
);

export default SellerAuctions;
