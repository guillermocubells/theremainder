import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle,
  XCircle,
  MessageSquare,
  Eye,
  Gavel,
  Search,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type AuctionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'changes_requested' | 'scheduled' | 'live' | 'ended' | 'settled' | 'cancelled';

interface Auction {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  starting_price: number;
  reserve_price: number | null;
  buy_now_price: number | null;
  bid_increment: number;
  condition: string | null;
  provenance: string | null;
  dimensions: any;
  images: string[] | null;
  videos: string[] | null;
  status: AuctionStatus;
  created_by: string;
  seller_user_id: string | null;
  seller_notes: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  change_request_message: string | null;
  current_price: number;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending_review: 'Pendiente revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  changes_requested: 'Cambios solicitados',
  scheduled: 'Programado',
  live: 'En vivo',
  ended: 'Finalizado',
  settled: 'Liquidado',
  cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  pending_review: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  changes_requested: 'secondary',
  scheduled: 'default',
  live: 'default',
  ended: 'outline',
  settled: 'outline',
  cancelled: 'destructive',
};

const REVIEW_STATUSES = ['draft', 'pending_review', 'changes_requested'];

const AdminAuctions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_changes' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: auctions, isLoading } = useQuery({
    queryKey: ['admin-auctions', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('auctions' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Auction[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: AuctionStatus; notes: string }) => {
      const updateData: any = {
        status,
        admin_notes: notes || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };

      if (status === 'changes_requested') {
        updateData.change_request_message = notes;
      }

      const { error } = await supabase
        .from('auctions' as any)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Send notification email to seller
      try {
        const { data: auctionData } = await supabase
          .from('auctions' as any)
          .select('*')
          .eq('id', id)
          .single();

        const auc = auctionData as unknown as Auction | null;
        if (auc?.seller_user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', auc.seller_user_id)
            .single();

          if (profile?.email) {
            await supabase.functions.invoke('send-notification-email', {
              body: {
                type: 'auction_review',
                to: profile.email,
                lang: 'es',
                data: {
                  auction_title: auc.title,
                  status: STATUS_LABELS[status] || status,
                  admin_notes: notes || '',
                },
              },
            });
          }
        }
      } catch (e) {
        console.warn('Notification email failed:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      setReviewAction(null);
      setSelectedAuction(null);
      setReviewNotes('');
      toast.success('Estado actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = auctions?.filter(a =>
    !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const pendingCount = auctions?.filter(a => REVIEW_STATUSES.includes(a.status)).length || 0;

  const handleReview = (action: 'approve' | 'reject' | 'request_changes') => {
    if (!selectedAuction) return;

    const statusMap: Record<string, AuctionStatus> = {
      approve: 'approved',
      reject: 'rejected',
      request_changes: 'changes_requested',
    };

    if ((action === 'reject' || action === 'request_changes') && !reviewNotes.trim()) {
      toast.error('Añade una nota explicativa');
      return;
    }

    updateStatus.mutate({
      id: selectedAuction.id,
      status: statusMap[action],
      notes: reviewNotes,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subastas</h1>
          <p className="text-sm text-muted-foreground">
            Revisa y gestiona los lotes enviados por vendedores.
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingCount} pendientes</Badge>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="pending_review">Pendiente revisión</SelectItem>
            <SelectItem value="changes_requested">Cambios solicitados</SelectItem>
            <SelectItem value="approved">Aprobado</SelectItem>
            <SelectItem value="rejected">Rechazado</SelectItem>
            <SelectItem value="live">En vivo</SelectItem>
            <SelectItem value="ended">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gavel className="h-8 w-8 mx-auto mb-3 opacity-50" />
            No se encontraron subastas.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Precio salida</TableHead>
                <TableHead>Reserva</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Enviado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(auction => (
                <TableRow key={auction.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {auction.images?.[0] ? (
                        <img src={auction.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{auction.title}</p>
                        {auction.condition && (
                          <p className="text-xs text-muted-foreground capitalize">{auction.condition}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{auction.starting_price.toFixed(2)} €</TableCell>
                  <TableCell className="text-sm">
                    {auction.reserve_price ? `${auction.reserve_price.toFixed(2)} €` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[auction.status] || 'outline'}>
                      {STATUS_LABELS[auction.status] || auction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(auction.created_at), 'dd MMM yyyy', { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedAuction(auction); setReviewAction(null); setReviewNotes(auction.admin_notes || ''); }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail / Review Dialog */}
      <Dialog open={!!selectedAuction} onOpenChange={(open) => { if (!open) { setSelectedAuction(null); setReviewAction(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedAuction && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAuction.title}</DialogTitle>
                <DialogDescription>
                  <Badge variant={STATUS_VARIANT[selectedAuction.status] || 'outline'} className="mr-2">
                    {STATUS_LABELS[selectedAuction.status]}
                  </Badge>
                  Enviado {format(new Date(selectedAuction.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                </DialogDescription>
              </DialogHeader>

              {/* Images */}
              {selectedAuction.images && selectedAuction.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedAuction.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Precio salida</span>
                  <p className="font-medium">{selectedAuction.starting_price.toFixed(2)} €</p>
                </div>
                {selectedAuction.reserve_price && (
                  <div>
                    <span className="text-muted-foreground">Precio reserva</span>
                    <p className="font-medium">{selectedAuction.reserve_price.toFixed(2)} €</p>
                  </div>
                )}
                {selectedAuction.buy_now_price && (
                  <div>
                    <span className="text-muted-foreground">Compra inmediata</span>
                    <p className="font-medium">{selectedAuction.buy_now_price.toFixed(2)} €</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Incremento puja</span>
                  <p className="font-medium">{selectedAuction.bid_increment.toFixed(2)} €</p>
                </div>
                {selectedAuction.condition && (
                  <div>
                    <span className="text-muted-foreground">Estado</span>
                    <p className="font-medium capitalize">{selectedAuction.condition}</p>
                  </div>
                )}
                {selectedAuction.dimensions && Object.keys(selectedAuction.dimensions).length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Dimensiones</span>
                    <p className="font-medium">
                      {[selectedAuction.dimensions.height, selectedAuction.dimensions.width, selectedAuction.dimensions.pot_size].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                )}
              </div>

              {selectedAuction.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Descripción</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedAuction.description}</p>
                </div>
              )}

              {selectedAuction.provenance && (
                <div>
                  <Label className="text-muted-foreground text-xs">Procedencia</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedAuction.provenance}</p>
                </div>
              )}

              {selectedAuction.change_request_message && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <Label className="text-xs text-muted-foreground">Cambios solicitados anteriormente</Label>
                  <p className="text-sm mt-1">{selectedAuction.change_request_message}</p>
                </div>
              )}

              {selectedAuction.admin_notes && selectedAuction.reviewed_at && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <Label className="text-xs text-muted-foreground">
                    Notas admin · {format(new Date(selectedAuction.reviewed_at), 'dd MMM yyyy HH:mm', { locale: es })}
                  </Label>
                  <p className="text-sm mt-1">{selectedAuction.admin_notes}</p>
                </div>
              )}

              {/* Review actions */}
              {REVIEW_STATUSES.includes(selectedAuction.status) && (
                <>
                  <hr className="border-border" />
                  <div className="space-y-3">
                    <Label>Notas de revisión</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      placeholder="Escribe notas, motivo de rechazo o cambios necesarios..."
                      rows={3}
                    />
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => handleReview('request_changes')}
                      disabled={updateStatus.isPending}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Solicitar cambios
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReview('reject')}
                      disabled={updateStatus.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazar
                    </Button>
                    <Button
                      onClick={() => handleReview('approve')}
                      disabled={updateStatus.isPending}
                    >
                      {updateStatus.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      Aprobar
                    </Button>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAuctions;
