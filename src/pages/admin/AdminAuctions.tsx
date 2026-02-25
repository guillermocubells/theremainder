import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Loader2, CheckCircle, XCircle, MessageSquare, Eye, Gavel,
  Search, Image as ImageIcon, CalendarIcon, Clock, ArrowUpDown,
  ExternalLink, GripVertical, Banknote,
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
  starts_at: string | null;
  ends_at: string | null;
  display_order: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
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

const REVIEW_STATUSES = ['draft', 'pending_review', 'changes_requested'];

const TIMEZONES = [
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'Europe/London', label: 'Londres (GMT/BST)' },
  { value: 'Europe/Paris', label: 'París (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlín (CET/CEST)' },
  { value: 'America/New_York', label: 'Nueva York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (PST/PDT)' },
  { value: 'UTC', label: 'UTC' },
];

const AdminAuctions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  // Scheduling state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleAuction, setScheduleAuction] = useState<Auction | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('22:00');
  const [timezone, setTimezone] = useState('Europe/Madrid');

  const { data: auctions, isLoading } = useQuery({
    queryKey: ['admin-auctions', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('auctions' as any)
        .select('*')
        .order('display_order', { ascending: true })
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
      const { error } = await supabase.from('auctions' as any).update(updateData).eq('id', id);
      if (error) throw error;

      // Notify seller
      try {
        const { data: auctionData } = await supabase.from('auctions' as any).select('*').eq('id', id).single();
        const auc = auctionData as unknown as Auction | null;
        if (auc?.seller_user_id) {
          const { data: profile } = await supabase.from('profiles').select('email').eq('user_id', auc.seller_user_id).single();
          if (profile?.email) {
            await supabase.functions.invoke('send-notification-email', {
              body: { type: 'auction_review', to: profile.email, lang: 'es', data: { auction_title: auc.title, status: STATUS_LABELS[status] || status, admin_notes: notes || '' } },
            });
          }
        }
      } catch (e) { console.warn('Notification email failed:', e); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      setSelectedAuction(null);
      setReviewNotes('');
      toast.success('Estado actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scheduleAuctionMutation = useMutation({
    mutationFn: async ({ id, starts_at, ends_at }: { id: string; starts_at: string; ends_at: string }) => {
      const { error } = await supabase.from('auctions' as any).update({
        starts_at, ends_at, status: 'scheduled',
        reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      setScheduleDialogOpen(false);
      setScheduleAuction(null);
      toast.success('Subasta programada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, display_order }: { id: string; display_order: number }) => {
      const { error } = await supabase.from('auctions' as any).update({ display_order }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-auctions'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const settleAuction = useMutation({
    mutationFn: async (auctionId: string) => {
      const { data, error } = await supabase.functions.invoke('settle-auction', {
        body: { auction_id: auctionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      toast.success(`Liquidación completada: ${data.hammer_price?.toFixed(2)} € — Comisión: ${data.platform_fee?.toFixed(2)} €`);
    },
    onError: (e: Error) => toast.error(`Error al liquidar: ${e.message}`),
  });

  const handleSettle = (auction: Auction) => {
    if (!confirm(`¿Liquidar la subasta "${auction.title}"?\n\nPrecio actual: ${auction.current_price.toFixed(2)} €\nComisión plataforma (6%): ${(auction.current_price * 0.06).toFixed(2)} €`)) return;
    settleAuction.mutate(auction.id);
  };

  const filtered = auctions?.filter(a =>
    !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const pendingCount = auctions?.filter(a => REVIEW_STATUSES.includes(a.status)).length || 0;
  const approvedLots = auctions?.filter(a => a.status === 'approved') || [];
  const scheduledLots = auctions?.filter(a => a.status === 'scheduled') || [];

  const handleReview = (action: 'approve' | 'reject' | 'request_changes') => {
    if (!selectedAuction) return;
    const statusMap: Record<string, AuctionStatus> = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested' };
    if ((action === 'reject' || action === 'request_changes') && !reviewNotes.trim()) {
      toast.error('Añade una nota explicativa'); return;
    }
    updateStatus.mutate({ id: selectedAuction.id, status: statusMap[action], notes: reviewNotes });
  };

  const openScheduleDialog = (auction: Auction) => {
    setScheduleAuction(auction);
    setStartDate(auction.starts_at ? new Date(auction.starts_at) : undefined);
    setEndDate(auction.ends_at ? new Date(auction.ends_at) : undefined);
    setStartTime(auction.starts_at ? format(new Date(auction.starts_at), 'HH:mm') : '10:00');
    setEndTime(auction.ends_at ? format(new Date(auction.ends_at), 'HH:mm') : '22:00');
    setScheduleDialogOpen(true);
  };

  const handleSchedule = () => {
    if (!scheduleAuction || !startDate || !endDate) {
      toast.error('Selecciona fecha de inicio y fin'); return;
    }
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = new Date(startDate);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(endDate);
    end.setHours(eh, em, 0, 0);

    if (end <= start) { toast.error('La fecha fin debe ser posterior al inicio'); return; }

    scheduleAuctionMutation.mutate({
      id: scheduleAuction.id,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    });
  };

  const moveOrder = (auction: Auction, direction: 'up' | 'down') => {
    const list = [...(auctions || [])].sort((a, b) => a.display_order - b.display_order);
    const idx = list.findIndex(a => a.id === auction.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;

    updateOrder.mutate({ id: auction.id, display_order: list[swapIdx].display_order });
    updateOrder.mutate({ id: list[swapIdx].id, display_order: auction.display_order });
  };

  const previewUrl = `/subastas/preview`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subastas</h1>
          <p className="text-sm text-muted-foreground">
            Revisa, programa y gestiona los lotes.
            {pendingCount > 0 && <Badge variant="secondary" className="ml-2">{pendingCount} pendientes</Badge>}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" /> Vista previa
          </a>
        </Button>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Cola de revisión</TabsTrigger>
          <TabsTrigger value="schedule">Programación</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        {/* QUEUE TAB */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending_review">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
                <SelectItem value="changes_requested">Cambios</SelectItem>
                <SelectItem value="scheduled">Programado</SelectItem>
                <SelectItem value="live">En vivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><Gavel className="h-8 w-8 mx-auto mb-3 opacity-50" />No se encontraron subastas.</CardContent></Card>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Programación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(auction => (
                    <TableRow key={auction.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveOrder(auction, 'up')} className="text-muted-foreground hover:text-foreground p-0.5">
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {auction.images?.[0] ? (
                            <img src={auction.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{auction.title}</p>
                            <p className="text-xs text-muted-foreground">Orden: {auction.display_order}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{auction.starting_price.toFixed(2)} €</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[auction.status] || 'outline'}>
                          {STATUS_LABELS[auction.status] || auction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {auction.starts_at ? (
                          <div>
                            <p>{format(new Date(auction.starts_at), 'dd MMM HH:mm', { locale: es })}</p>
                            {auction.ends_at && <p className="text-xs">→ {format(new Date(auction.ends_at), 'dd MMM HH:mm', { locale: es })}</p>}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedAuction(auction); setReviewNotes(auction.admin_notes || ''); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(auction.status === 'approved' || auction.status === 'scheduled') && (
                          <Button size="sm" variant="outline" onClick={() => openScheduleDialog(auction)}>
                            <Clock className="h-4 w-4" />
                          </Button>
                        )}
                        {(auction.status === 'live' || auction.status === 'ended') && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleSettle(auction)}
                            disabled={settleAuction.isPending}
                          >
                            <Banknote className="h-4 w-4 mr-1" />
                            {settleAuction.isPending ? '...' : 'Liquidar'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Approved lots ready to schedule */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" /> Aprobados ({approvedLots.length})
                </h3>
                {approvedLots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay lotes aprobados pendientes.</p>
                ) : (
                  <div className="space-y-2">
                    {approvedLots.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                          {a.images?.[0] && <img src={a.images[0]} alt="" className="w-8 h-8 rounded object-cover" />}
                          <span className="text-sm font-medium">{a.title}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openScheduleDialog(a)}>
                          <CalendarIcon className="h-4 w-4 mr-1" /> Programar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scheduled lots */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Programados ({scheduledLots.length})
                </h3>
                {scheduledLots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay lotes programados.</p>
                ) : (
                  <div className="space-y-2">
                    {scheduledLots.sort((a, b) => a.display_order - b.display_order).map((a, idx) => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}</span>
                          {a.images?.[0] && <img src={a.images[0]} alt="" className="w-8 h-8 rounded object-cover" />}
                          <div>
                            <span className="text-sm font-medium">{a.title}</span>
                            {a.starts_at && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(a.starts_at), "dd MMM HH:mm", { locale: es })}
                                {a.ends_at && ` → ${format(new Date(a.ends_at), "dd MMM HH:mm", { locale: es })}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveOrder(a, 'up')}>
                            <GripVertical className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openScheduleDialog(a)}>
                            <Clock className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ALL TAB - same as queue but no filter */}
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Programación</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Creado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auctions || []).map(a => (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => { setSelectedAuction(a); setReviewNotes(a.admin_notes || ''); }}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {a.images?.[0] && <img src={a.images[0]} alt="" className="w-8 h-8 rounded object-cover" />}
                          <span className="text-sm">{a.title}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[a.status] || 'outline'}>{STATUS_LABELS[a.status]}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.starts_at ? format(new Date(a.starts_at), 'dd MMM HH:mm', { locale: es }) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{a.starting_price.toFixed(2)} €</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(a.created_at), 'dd MMM yy', { locale: es })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ========== DETAIL/REVIEW DIALOG ========== */}
      <Dialog open={!!selectedAuction} onOpenChange={open => { if (!open) setSelectedAuction(null); }}>
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

              {selectedAuction.images && selectedAuction.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedAuction.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Precio salida</span><p className="font-medium">{selectedAuction.starting_price.toFixed(2)} €</p></div>
                {selectedAuction.reserve_price && <div><span className="text-muted-foreground">Precio reserva</span><p className="font-medium">{selectedAuction.reserve_price.toFixed(2)} €</p></div>}
                {selectedAuction.buy_now_price && <div><span className="text-muted-foreground">Compra inmediata</span><p className="font-medium">{selectedAuction.buy_now_price.toFixed(2)} €</p></div>}
                <div><span className="text-muted-foreground">Incremento puja</span><p className="font-medium">{selectedAuction.bid_increment.toFixed(2)} €</p></div>
                {selectedAuction.condition && <div><span className="text-muted-foreground">Estado</span><p className="font-medium capitalize">{selectedAuction.condition}</p></div>}
                {selectedAuction.dimensions && Object.keys(selectedAuction.dimensions).length > 0 && (
                  <div><span className="text-muted-foreground">Dimensiones</span><p className="font-medium">{[selectedAuction.dimensions.height, selectedAuction.dimensions.width, selectedAuction.dimensions.pot_size].filter(Boolean).join(' · ')}</p></div>
                )}
                {selectedAuction.starts_at && (
                  <div><span className="text-muted-foreground">Inicio</span><p className="font-medium">{format(new Date(selectedAuction.starts_at), "dd MMM yyyy HH:mm", { locale: es })}</p></div>
                )}
                {selectedAuction.ends_at && (
                  <div><span className="text-muted-foreground">Fin</span><p className="font-medium">{format(new Date(selectedAuction.ends_at), "dd MMM yyyy HH:mm", { locale: es })}</p></div>
                )}
              </div>

              {selectedAuction.description && (
                <div><Label className="text-muted-foreground text-xs">Descripción</Label><p className="text-sm mt-1 whitespace-pre-wrap">{selectedAuction.description}</p></div>
              )}
              {selectedAuction.provenance && (
                <div><Label className="text-muted-foreground text-xs">Procedencia</Label><p className="text-sm mt-1 whitespace-pre-wrap">{selectedAuction.provenance}</p></div>
              )}
              {selectedAuction.change_request_message && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <Label className="text-xs text-muted-foreground">Cambios solicitados</Label>
                  <p className="text-sm mt-1">{selectedAuction.change_request_message}</p>
                </div>
              )}
              {selectedAuction.admin_notes && selectedAuction.reviewed_at && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <Label className="text-xs text-muted-foreground">Notas admin · {format(new Date(selectedAuction.reviewed_at), 'dd MMM yyyy HH:mm', { locale: es })}</Label>
                  <p className="text-sm mt-1">{selectedAuction.admin_notes}</p>
                </div>
              )}

              {REVIEW_STATUSES.includes(selectedAuction.status) && (
                <>
                  <hr className="border-border" />
                  <div className="space-y-3">
                    <Label>Notas de revisión</Label>
                    <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Notas, motivo de rechazo o cambios..." rows={3} />
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => handleReview('request_changes')} disabled={updateStatus.isPending}>
                      <MessageSquare className="h-4 w-4 mr-1" /> Solicitar cambios
                    </Button>
                    <Button variant="destructive" onClick={() => handleReview('reject')} disabled={updateStatus.isPending}>
                      <XCircle className="h-4 w-4 mr-1" /> Rechazar
                    </Button>
                    <Button onClick={() => handleReview('approve')} disabled={updateStatus.isPending}>
                      {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Aprobar
                    </Button>
                  </DialogFooter>
                </>
              )}

              {selectedAuction.status === 'approved' && (
                <DialogFooter>
                  <Button onClick={() => { setSelectedAuction(null); openScheduleDialog(selectedAuction); }}>
                    <CalendarIcon className="h-4 w-4 mr-1" /> Programar subasta
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== SCHEDULE DIALOG ========== */}
      <Dialog open={scheduleDialogOpen} onOpenChange={open => { if (!open) { setScheduleDialogOpen(false); setScheduleAuction(null); } }}>
        <DialogContent className="max-w-lg">
          {scheduleAuction && (
            <>
              <DialogHeader>
                <DialogTitle>Programar subasta</DialogTitle>
                <DialogDescription>{scheduleAuction.title}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha inicio</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'dd MMM yyyy', { locale: es }) : 'Seleccionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={d => d < new Date()} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Hora inicio</Label>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'dd MMM yyyy', { locale: es }) : 'Seleccionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={d => startDate ? d < startDate : d < new Date()} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Hora fin</Label>
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Orden del lote</Label>
                  <Input type="number" min={0} defaultValue={scheduleAuction.display_order}
                    onChange={e => updateOrder.mutate({ id: scheduleAuction.id, display_order: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Los lotes se muestran de menor a mayor.</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSchedule} disabled={scheduleAuctionMutation.isPending}>
                  {scheduleAuctionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Programar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAuctions;
