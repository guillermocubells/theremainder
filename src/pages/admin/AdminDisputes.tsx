import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle, XCircle, Eye, Shield, RefreshCw, Send,
  Clock, MessageSquare, Package,
} from "lucide-react";

type DisputeStatus = "open" | "under_review" | "awaiting_evidence" | "resolved" | "rejected" | "escalated";
type DisputeType = "damaged_item" | "wrong_item" | "missing_item" | "quality_issue" | "shipping_delay" | "billing_error" | "other";

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
  admin_notes: string | null;
  resolution_summary: string | null;
  resolved_at: string | null;
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
  created_at: string;
}

const typeLabels: Record<DisputeType, string> = {
  damaged_item: "Artículo dañado", wrong_item: "Artículo incorrecto",
  missing_item: "Artículo faltante", quality_issue: "Calidad",
  shipping_delay: "Retraso envío", billing_error: "Facturación", other: "Otro",
};

const statusLabels: Record<DisputeStatus, string> = {
  open: "Abierta", under_review: "En revisión", awaiting_evidence: "Esperando evidencia",
  resolved: "Resuelta", rejected: "Rechazada", escalated: "Escalada",
};

const statusColors: Record<DisputeStatus, string> = {
  open: "bg-warning-muted text-warning-muted-foreground",
  under_review: "bg-info-muted text-info-muted-foreground",
  awaiting_evidence: "bg-caution-muted text-caution-muted-foreground",
  resolved: "bg-success-muted text-success-muted-foreground",
  rejected: "bg-danger-muted text-danger-muted-foreground",
  escalated: "bg-destructive/10 text-destructive",
};

const AdminDisputes = () => {
  const { isAdmin, isLoading: adminLoading } = useAdminRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [newStatus, setNewStatus] = useState<DisputeStatus | "">("");
  const [adminMessage, setAdminMessage] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");

  // Fetch disputes
  const { data: disputes, isLoading, refetch } = useQuery({
    queryKey: ["admin-disputes", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter as DisputeStatus);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Dispute[];
    },
    enabled: isAdmin,
  });

  // Fetch user emails
  const userIds = [...new Set(disputes?.map((d) => d.user_id) || [])];
  const { data: userEmails } = useQuery({
    queryKey: ["admin-dispute-emails", userIds],
    queryFn: async () => {
      if (!userIds.length) return {};
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);
      const map: Record<string, string> = {};
      data?.forEach((p) => { if (p.user_id && p.email) map[p.user_id] = p.email; });
      return map;
    },
    enabled: userIds.length > 0,
  });

  // Fetch timeline
  const { data: events } = useQuery({
    queryKey: ["admin-dispute-events", selectedDispute?.id],
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

  // Update dispute
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDispute) return;
      const updates: Record<string, unknown> = {};
      if (newStatus) updates.status = newStatus;
      if (newStatus === "resolved" || newStatus === "rejected") {
        updates.resolved_at = new Date().toISOString();
        if (resolutionSummary) updates.resolution_summary = resolutionSummary;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("disputes")
          .update(updates)
          .eq("id", selectedDispute.id);
        if (error) throw error;
      }

      // Add admin message/status change event
      const eventInserts = [];
      if (newStatus) {
        eventInserts.push({
          dispute_id: selectedDispute.id,
          actor_id: user!.id,
          actor_role: "admin",
          event_type: "status_change",
          message: `Estado cambiado a: ${statusLabels[newStatus as DisputeStatus]}`,
          metadata: { from: selectedDispute.status, to: newStatus },
        });
      }
      if (adminMessage.trim()) {
        eventInserts.push({
          dispute_id: selectedDispute.id,
          actor_id: user!.id,
          actor_role: "admin",
          event_type: "message",
          message: adminMessage.trim(),
        });
      }
      if (eventInserts.length > 0) {
        const { error } = await supabase.from("dispute_events").insert(eventInserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dispute-events", selectedDispute?.id] });
      toast.success("Incidencia actualizada");
      setNewStatus("");
      setAdminMessage("");
      setResolutionSummary("");
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  // Stats
  const stats = {
    total: disputes?.length || 0,
    open: disputes?.filter((d) => d.status === "open").length || 0,
    escalated: disputes?.filter((d) => d.status === "escalated").length || 0,
    resolved: disputes?.filter((d) => d.status === "resolved").length || 0,
  };

  if (adminLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Acceso denegado</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Incidencias y Disputas
          </h1>
          <p className="text-muted-foreground">Gestión de incidencias reportadas por usuarios</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground", icon: MessageSquare },
          { label: "Abiertas", value: stats.open, color: "text-warning", icon: Clock },
          { label: "Escaladas", value: stats.escalated, color: "text-destructive", icon: AlertTriangle },
          { label: "Resueltas", value: stats.resolved, color: "text-success", icon: CheckCircle },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold leading-none mt-1 ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {Object.entries(statusLabels).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : disputes && disputes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge variant="outline">{typeLabels[d.type]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{d.subject}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {userEmails?.[d.user_id] || d.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[d.status]}>{statusLabels[d.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(d.created_at), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedDispute(d); setNewStatus(""); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold">Sin incidencias</h3>
              <p className="text-sm text-muted-foreground">No hay incidencias con los filtros actuales.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedDispute?.subject}</DialogTitle>
            <div className="flex items-center gap-2 pt-1">
              {selectedDispute && (
                <>
                  <Badge className={statusColors[selectedDispute.status]}>{statusLabels[selectedDispute.status]}</Badge>
                  <Badge variant="outline">{typeLabels[selectedDispute.type]}</Badge>
                  {selectedDispute.order_id && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Package className="h-3 w-3" /> Pedido vinculado
                    </Badge>
                  )}
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedDispute && userEmails?.[selectedDispute.user_id]} · {selectedDispute && format(new Date(selectedDispute.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
            </p>
          </DialogHeader>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2 border-y">
            {events?.map((ev) => (
              <div key={ev.id} className={`flex gap-3 ${ev.actor_role === "user" ? "justify-end" : ""}`}>
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  ev.actor_role === "user" ? "bg-primary/10" :
                  ev.event_type === "status_change" ? "bg-warning-muted" : "bg-muted"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {ev.actor_role === "admin" ? "Admin" : ev.actor_role === "user" ? "Usuario" : "Sistema"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ev.created_at), "dd/MM HH:mm")}
                    </span>
                  </div>
                  {ev.message && <p className="whitespace-pre-wrap">{ev.message}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Admin actions */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-3">
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as DisputeStatus)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Cambiar estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(newStatus === "resolved" || newStatus === "rejected") && (
              <div>
                <label className="text-sm font-medium">Resumen de resolución</label>
                <Textarea
                  className="mt-1"
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Descripción de la resolución..."
                />
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                placeholder="Mensaje al usuario..."
                className="flex-1"
              />
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={(!newStatus && !adminMessage.trim()) || updateMutation.isPending}
              >
                {updateMutation.isPending ? "..." : <><Send className="h-4 w-4 mr-2" />Enviar</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDisputes;
