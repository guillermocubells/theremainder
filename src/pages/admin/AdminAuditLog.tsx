import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, Shield, RefreshCw, Search, FileText, Eye,
  Gavel, Package, CreditCard, MessageSquare, Clock,
} from "lucide-react";

interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  checksum: string;
}

const actionLabels: Record<string, string> = {
  bid_placed: "Puja realizada",
  auction_approved: "Subasta aprobada",
  auction_closed: "Subasta cerrada",
  auction_status_changed: "Estado subasta cambiado",
  auction_schedule_changed: "Horario subasta cambiado",
  auction_updated: "Subasta actualizada",
  settlement_created: "Liquidación creada",
  settlement_status_changed: "Estado liquidación cambiado",
  order_status_changed: "Estado pedido cambiado",
  dispute_status_changed: "Estado incidencia cambiado",
};

const entityIcons: Record<string, typeof Gavel> = {
  bid: Gavel,
  auction: Gavel,
  auction_settlement: CreditCard,
  order: Package,
  dispute: MessageSquare,
};

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive",
  user: "bg-primary/10 text-primary",
  system: "bg-muted text-muted-foreground",
};

const AdminAuditLog = () => {
  const { isAdmin, isLoading: adminLoading } = useAdminRole();
  const [entityFilter, setEntityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-audit-logs", entityFilter, searchTerm, page],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (entityFilter !== "all") query = query.eq("entity_type", entityFilter);
      if (searchTerm) query = query.or(`action.ilike.%${searchTerm}%,entity_id.eq.${searchTerm}`);

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: isAdmin,
  });

  // Fetch actor emails
  const actorIds = [...new Set(data?.map((l) => l.actor_id).filter(Boolean) || [])];
  const { data: actorEmails } = useQuery({
    queryKey: ["audit-actor-emails", actorIds],
    queryFn: async () => {
      if (!actorIds.length) return {};
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", actorIds as string[]);
      const map: Record<string, string> = {};
      data?.forEach((p) => { if (p.user_id && p.email) map[p.user_id] = p.email; });
      return map;
    },
    enabled: actorIds.length > 0,
  });

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
            <Shield className="h-6 w-6" />
            Registro de Auditoría
          </h1>
          <p className="text-muted-foreground">
            Historial inmutable de acciones sensibles con cadena de hashes
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por acción o ID de entidad..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
          />
        </div>
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            <SelectItem value="bid">Pujas</SelectItem>
            <SelectItem value="auction">Subastas</SelectItem>
            <SelectItem value="auction_settlement">Liquidaciones</SelectItem>
            <SelectItem value="order">Pedidos</SelectItem>
            <SelectItem value="dispute">Incidencias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((log) => {
                  const Icon = entityIcons[log.entity_type] || FileText;
                  return (
                    <TableRow key={log.id} className="group">
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {actionLabels[log.action] || log.action}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.entity_id?.slice(0, 8) || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.actor_id
                          ? actorEmails?.[log.actor_id] || log.actor_id.slice(0, 8)
                          : "sistema"}
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[log.actor_role] || roleColors.system} variant="secondary">
                          {log.actor_role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedLog(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Shield className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold">Sin registros</h3>
              <p className="text-sm text-muted-foreground">No se encontraron eventos de auditoría.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} · {data.length} registros
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={data.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Detalle del evento
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Acción</p>
                  <p className="font-medium">{actionLabels[selectedLog.action] || selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha</p>
                  <p className="font-mono">{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss.SSS", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Actor</p>
                  <p>{selectedLog.actor_id ? actorEmails?.[selectedLog.actor_id] || selectedLog.actor_id : "sistema"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Rol</p>
                  <Badge className={roleColors[selectedLog.actor_role] || roleColors.system} variant="secondary">
                    {selectedLog.actor_role}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Entidad</p>
                  <p className="font-mono">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">ID entidad</p>
                  <p className="font-mono text-xs break-all">{selectedLog.entity_id || "—"}</p>
                </div>
              </div>

              {selectedLog.old_data && Object.keys(selectedLog.old_data).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Datos anteriores</p>
                  <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_data && Object.keys(selectedLog.new_data).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Datos nuevos</p>
                  <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Metadatos</p>
                  <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Checksum (SHA-256)</p>
                <code className="text-[10px] font-mono text-muted-foreground break-all bg-muted px-2 py-1 rounded block">
                  {selectedLog.checksum}
                </code>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAuditLog;
