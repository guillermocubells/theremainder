import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Reply, Eye, EyeOff, Ban, Leaf, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useGardenInquiries,
  useReplyToInquiry,
  useUpdateInquiryStatus,
  useBlockViewer,
} from '@/hooks/collection/useGardenInquiries';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  new: { label: 'Nueva', variant: 'default' },
  replied: { label: 'Respondida', variant: 'secondary' },
  ignored: { label: 'Ignorada', variant: 'outline' },
  blocked: { label: 'Bloqueada', variant: 'destructive' },
};

const offerTypeLabels: Record<string, string> = {
  buy: 'Quiere comprar',
  trade: 'Propone intercambio',
  question: 'Pregunta',
};

const AccountInquiries = () => {
  const [activeTab, setActiveTab] = useState('new');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: inquiries, isLoading } = useGardenInquiries(activeTab === 'all' ? undefined : activeTab);
  const replyMutation = useReplyToInquiry();
  const updateStatus = useUpdateInquiryStatus();
  const blockViewer = useBlockViewer();

  const handleReply = (inquiryId: string) => {
    if (!replyText.trim()) return;
    replyMutation.mutate(
      { inquiryId, reply: replyText.trim() },
      {
        onSuccess: () => {
          setReplyingTo(null);
          setReplyText('');
        },
      }
    );
  };

  const handleIgnore = (inquiryId: string) => {
    updateStatus.mutate({ inquiryId, status: 'ignored' });
  };

  const handleBlock = (inquiryId: string, viewerIdentifier: string) => {
    blockViewer.mutate({ viewerIdentifier, scope: 'global' });
    updateStatus.mutate({ inquiryId, status: 'blocked' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Consultas de visitantes</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="new">Nuevas</TabsTrigger>
          <TabsTrigger value="replied">Respondidas</TabsTrigger>
          <TabsTrigger value="ignored">Ignoradas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {!inquiries || inquiries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No hay consultas {activeTab !== 'all' ? statusLabels[activeTab]?.label.toLowerCase() + 's' : ''}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inquiries.map((inquiry) => (
                <Card key={inquiry.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Leaf className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {inquiry.plant_nickname || 'Planta'}
                        </span>
                        {inquiry.plant_scientific_name && (
                          <span className="text-xs text-muted-foreground italic truncate hidden sm:inline">
                            {inquiry.plant_scientific_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {inquiry.offer_type && (
                          <Badge variant="outline" className="text-xs">
                            {offerTypeLabels[inquiry.offer_type] || inquiry.offer_type}
                          </Badge>
                        )}
                        <Badge variant={statusLabels[inquiry.status]?.variant || 'outline'} className="text-xs">
                          {statusLabels[inquiry.status]?.label || inquiry.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-foreground bg-muted rounded-lg p-3 mb-2">
                      {inquiry.message}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>
                        {inquiry.viewer_email || 'Anónimo'}
                      </span>
                      <span>
                        {format(new Date(inquiry.created_at), "d MMM yyyy HH:mm", { locale: es })}
                      </span>
                    </div>

                    {/* Reply shown */}
                    {inquiry.owner_reply && (
                      <div className="bg-primary/5 border-l-2 border-primary rounded-r-lg p-3 mb-3">
                        <p className="text-xs text-muted-foreground mb-1">Tu respuesta:</p>
                        <p className="text-sm">{inquiry.owner_reply}</p>
                      </div>
                    )}

                    {/* Reply form */}
                    {replyingTo === inquiry.id && (
                      <div className="space-y-2 mb-3">
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Escribe tu respuesta..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReply(inquiry.id)}
                            disabled={replyMutation.isPending || !replyText.trim()}
                          >
                            {replyMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}
                            Enviar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {inquiry.status === 'new' && replyingTo !== inquiry.id && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReplyingTo(inquiry.id)}
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Responder
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleIgnore(inquiry.id)}
                          disabled={updateStatus.isPending}
                        >
                          <EyeOff className="h-3 w-3 mr-1" />
                          Ignorar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleBlock(inquiry.id, inquiry.viewer_identifier)}
                          disabled={blockViewer.isPending}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Bloquear
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountInquiries;
