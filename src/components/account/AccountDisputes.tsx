import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertTriangle,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Paperclip,
  Send,
} from "lucide-react";

type DisputeType =
  | "damaged_item"
  | "wrong_item"
  | "missing_item"
  | "quality_issue"
  | "shipping_delay"
  | "billing_error"
  | "other";

type DisputeStatus =
  | "open"
  | "under_review"
  | "awaiting_evidence"
  | "resolved"
  | "rejected"
  | "escalated";

interface Dispute {
  id: string;
  user_id: string;
  order_id: string | null;
  auction_id: string | null;
  type: DisputeType;
  status: DisputeStatus;
  subject: string;
  description: string;
  evidence_urls: string[];
  resolution_summary: string | null;
  created_at: string;
  updated_at: string;
}

interface DisputeEvent {
  id: string;
  dispute_id: string;
  actor_id: string | null;
  actor_role: string;
  event_type: string;
  message: string | null;
  attachments: string[];
  created_at: string;
}

const typeLabels: Record<DisputeType, string> = {
  damaged_item: "Artículo dañado",
  wrong_item: "Artículo incorrecto",
  missing_item: "Artículo faltante",
  quality_issue: "Problema de calidad",
  shipping_delay: "Retraso en envío",
  billing_error: "Error de facturación",
  other: "Otro",
};

const statusLabels: Record<DisputeStatus, string> = {
  open: "Abierta",
  under_review: "En revisión",
  awaiting_evidence: "Esperando evidencia",
  resolved: "Resuelta",
  rejected: "Rechazada",
  escalated: "Escalada",
};

const statusColors: Record<DisputeStatus, string> = {
  open: "bg-warning-muted text-warning-muted-foreground",
  under_review: "bg-info-muted text-info-muted-foreground",
  awaiting_evidence: "bg-caution-muted text-caution-muted-foreground",
  resolved: "bg-success-muted text-success-muted-foreground",
  rejected: "bg-danger-muted text-danger-muted-foreground",
  escalated: "bg-destructive/10 text-destructive",
};

const AccountDisputes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [newMessage, setNewMessage] = useState("");

  // Form state
  const [formType, setFormType] = useState<DisputeType>("damaged_item");
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formOrderId, setFormOrderId] = useState("");

  // Fetch disputes
  const { data: disputes, isLoading } = useQuery({
    queryKey: ["user-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Dispute[];
    },
    enabled: !!user,
  });

  // Fetch user orders for dropdown
  const { data: orders } = useQuery({
    queryKey: ["user-orders-for-dispute"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch timeline for selected dispute
  const { data: events } = useQuery({
    queryKey: ["dispute-events", selectedDispute?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispute_events")
        .select("*")
        .eq("dispute_id", selectedDispute!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DisputeEvent[];
    },
    enabled: !!selectedDispute,
  });

  // Create dispute
  const createMutation = useMutation({
    mutationFn: async () => {
      // Insert dispute
      const { data: dispute, error } = await supabase
        .from("disputes")
        .insert({
          user_id: user!.id,
          type: formType,
          subject: formSubject,
          description: formDescription,
          order_id: formOrderId || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert opening event
      await supabase.from("dispute_events").insert({
        dispute_id: dispute.id,
        actor_id: user!.id,
        actor_role: "user",
        event_type: "created",
        message: formDescription,
      });

      return dispute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-disputes"] });
      toast.success("Incidencia creada correctamente");
      setCreateOpen(false);
      setFormSubject("");
      setFormDescription("");
      setFormOrderId("");
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  // Add message to dispute
  const messageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDispute || !newMessage.trim()) return;
      const { error } = await supabase.from("dispute_events").insert({
        dispute_id: selectedDispute.id,
        actor_id: user!.id,
        actor_role: "user",
        event_type: "message",
        message: newMessage.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispute-events", selectedDispute?.id] });
      setNewMessage("");
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mis Incidencias</h2>
          <p className="text-sm text-muted-foreground">
            Reporta problemas con tus pedidos o subastas
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva incidencia
        </Button>
      </div>

      {/* Disputes list */}
      {disputes && disputes.length > 0 ? (
        <div className="space-y-3">
          {disputes.map((d) => (
            <Card
              key={d.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setSelectedDispute(d)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={statusColors[d.status]}>
                        {statusLabels[d.status]}
                      </Badge>
                      <Badge variant="outline">{typeLabels[d.type]}</Badge>
                    </div>
                    <h3 className="font-medium truncate">{d.subject}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {d.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(d.created_at), "dd MMM yyyy", { locale: es })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold">Sin incidencias</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs mt-1">
              No tienes ninguna incidencia abierta. Si tienes algún problema, puedes crear una nueva.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create dispute dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Incidencia</DialogTitle>
            <DialogDescription>
              Describe el problema para que nuestro equipo pueda ayudarte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de problema</label>
              <Select value={formType} onValueChange={(v) => setFormType(v as DisputeType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {orders && orders.length > 0 && (
              <div>
                <label className="text-sm font-medium">Pedido relacionado (opcional)</label>
                <Select value={formOrderId} onValueChange={setFormOrderId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar pedido" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.order_number} — {format(new Date(o.created_at), "dd/MM/yyyy")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Asunto</label>
              <Input
                className="mt-1"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Resumen breve del problema"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                className="mt-1"
                rows={4}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe el problema con el mayor detalle posible..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!formSubject.trim() || !formDescription.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Enviando..." : "Enviar incidencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute detail / timeline dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {selectedDispute?.subject}
            </DialogTitle>
            <div className="flex items-center gap-2 pt-1">
              {selectedDispute && (
                <>
                  <Badge className={statusColors[selectedDispute.status]}>
                    {statusLabels[selectedDispute.status]}
                  </Badge>
                  <Badge variant="outline">{typeLabels[selectedDispute.type]}</Badge>
                </>
              )}
            </div>
          </DialogHeader>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {events?.map((ev) => (
              <div
                key={ev.id}
                className={`flex gap-3 ${ev.actor_role === "admin" ? "" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    ev.actor_role === "admin"
                      ? "bg-muted"
                      : ev.event_type === "created"
                      ? "bg-muted"
                      : "bg-primary/10"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {ev.actor_role === "admin" ? (
                      <span className="text-xs font-medium text-primary">Soporte</span>
                    ) : ev.event_type === "created" ? (
                      <span className="text-xs font-medium text-muted-foreground">Descripción inicial</span>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">Tú</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ev.created_at), "dd/MM HH:mm")}
                    </span>
                  </div>
                  {ev.message && <p className="whitespace-pre-wrap">{ev.message}</p>}
                  {ev.event_type === "status_change" && (
                    <p className="text-xs italic text-muted-foreground">Estado actualizado</p>
                  )}
                </div>
              </div>
            ))}

            {selectedDispute?.resolution_summary && (
              <div className="bg-success-muted p-3 rounded-lg text-sm">
                <span className="font-medium">Resolución:</span> {selectedDispute.resolution_summary}
              </div>
            )}
          </div>

          {/* Message input - only if dispute is not resolved/rejected */}
          {selectedDispute && !["resolved", "rejected"].includes(selectedDispute.status) && (
            <div className="flex gap-2 pt-2 border-t">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && messageMutation.mutate()}
              />
              <Button
                size="icon"
                onClick={() => messageMutation.mutate()}
                disabled={!newMessage.trim() || messageMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountDisputes;
