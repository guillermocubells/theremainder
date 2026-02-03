import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Shield,
  User,
  Mail,
  Globe,
  DollarSign,
  RefreshCw,
} from "lucide-react";

type FraudFlagType = 
  | "self_referral"
  | "similar_email"
  | "ip_match"
  | "device_fingerprint"
  | "multiple_first_orders_ip"
  | "suspicious_amount_pattern"
  | "wallet_abuse";

type FraudFlagSeverity = "low" | "medium" | "high" | "critical";
type FraudFlagStatus = "pending" | "reviewed" | "approved" | "revoked";

interface FraudFlag {
  id: string;
  user_id: string;
  referrer_user_id: string | null;
  type: FraudFlagType;
  severity: FraudFlagSeverity;
  status: FraudFlagStatus;
  related_order_id: string | null;
  related_reward_id: string | null;
  metadata: Record<string, unknown>;
  notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

const flagTypeLabels: Record<FraudFlagType, string> = {
  self_referral: "Autorreferido",
  similar_email: "Email similar",
  ip_match: "IP coincidente",
  device_fingerprint: "Dispositivo",
  multiple_first_orders_ip: "Múltiples primeros pedidos IP",
  suspicious_amount_pattern: "Patrón de importe sospechoso",
  wallet_abuse: "Abuso de saldo",
};

const flagTypeIcons: Record<FraudFlagType, typeof Shield> = {
  self_referral: User,
  similar_email: Mail,
  ip_match: Globe,
  device_fingerprint: Shield,
  multiple_first_orders_ip: Globe,
  suspicious_amount_pattern: DollarSign,
  wallet_abuse: DollarSign,
};

const severityColors: Record<FraudFlagSeverity, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const statusColors: Record<FraudFlagStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  reviewed: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  revoked: "bg-red-100 text-red-800",
};

const AdminFraudFlags = () => {
  const { isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedFlag, setSelectedFlag] = useState<FraudFlag | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "revoke" | null>(null);

  // Fetch fraud flags
  const { data: flags, isLoading: flagsLoading, refetch } = useQuery({
    queryKey: ["admin-fraud-flags", statusFilter, severityFilter],
    queryFn: async () => {
      let query = supabase
        .from("fraud_flags")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as FraudFlagStatus);
      }
      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter as FraudFlagSeverity);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as FraudFlag[];
    },
    enabled: isAdmin,
  });

  // Fetch user emails for display
  const userIds = [...new Set([
    ...(flags?.map(f => f.user_id) || []),
    ...(flags?.map(f => f.referrer_user_id).filter(Boolean) || [])
  ])];

  const { data: userEmails } = useQuery({
    queryKey: ["admin-user-emails", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);
      
      const emailMap: Record<string, string> = {};
      data?.forEach(p => {
        if (p.user_id && p.email) emailMap[p.user_id] = p.email;
      });
      return emailMap;
    },
    enabled: userIds.length > 0,
  });

  // Update flag status mutation
  const updateFlagMutation = useMutation({
    mutationFn: async ({ flagId, status, notes }: { flagId: string; status: FraudFlagStatus; notes: string }) => {
      const { error } = await supabase
        .from("fraud_flags")
        .update({
          status,
          notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", flagId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fraud-flags"] });
      toast.success("Flag actualizado correctamente");
      setActionDialogOpen(false);
      setSelectedFlag(null);
      setActionNotes("");
      setPendingAction(null);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleAction = (flag: FraudFlag, action: "approve" | "revoke") => {
    setSelectedFlag(flag);
    setPendingAction(action);
    setActionDialogOpen(true);
  };

  const confirmAction = () => {
    if (!selectedFlag || !pendingAction) return;
    
    updateFlagMutation.mutate({
      flagId: selectedFlag.id,
      status: pendingAction === "approve" ? "approved" : "revoked",
      notes: actionNotes,
    });
  };

  // Stats
  const stats = {
    total: flags?.length || 0,
    pending: flags?.filter(f => f.status === "pending").length || 0,
    critical: flags?.filter(f => f.severity === "critical").length || 0,
    revoked: flags?.filter(f => f.status === "revoked").length || 0,
  };

  if (isAdminLoading) {
    return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Acceso denegado</h2>
        <p className="text-muted-foreground">No tienes permisos para ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Sistema Antifraude
          </h1>
          <p className="text-muted-foreground">
            Gestión de alertas y flags de fraude en el programa de referidos
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revocados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.revoked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="reviewed">Revisados</SelectItem>
            <SelectItem value="approved">Aprobados</SelectItem>
            <SelectItem value="revoked">Revocados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Flags Table */}
      <Card>
        <CardContent className="p-0">
          {flagsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : flags && flags.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Referidor</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => {
                  const IconComponent = flagTypeIcons[flag.type];
                  return (
                    <TableRow key={flag.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{flagTypeLabels[flag.type]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {userEmails?.[flag.user_id] || flag.user_id.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {flag.referrer_user_id 
                            ? (userEmails?.[flag.referrer_user_id] || flag.referrer_user_id.slice(0, 8))
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={severityColors[flag.severity]}>
                          {flag.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[flag.status]}>
                          {flag.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(flag.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {flag.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleAction(flag, "approve")}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleAction(flag, "revoke")}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedFlag(flag)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Sin alertas de fraude</h3>
              <p className="text-muted-foreground">
                No se han detectado patrones sospechosos con los filtros actuales.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "approve" ? "Aprobar flag" : "Revocar crédito"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === "approve"
                ? "Marcar este flag como revisado y permitir el crédito."
                : "Revocar el crédito asociado a este flag de fraude."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedFlag && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{flagTypeLabels[selectedFlag.type]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Severidad:</span>
                  <Badge className={severityColors[selectedFlag.severity]}>
                    {selectedFlag.severity}
                  </Badge>
                </div>
                {selectedFlag.metadata && Object.keys(selectedFlag.metadata).length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground block mb-1">Detalles:</span>
                    <pre className="text-xs bg-background p-2 rounded overflow-auto">
                      {JSON.stringify(selectedFlag.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">Notas (opcional)</label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Añade notas sobre tu decisión..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={pendingAction === "revoke" ? "destructive" : "default"}
              onClick={confirmAction}
              disabled={updateFlagMutation.isPending}
            >
              {updateFlagMutation.isPending ? "Procesando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Details Dialog */}
      <Dialog open={!!selectedFlag && !actionDialogOpen} onOpenChange={() => setSelectedFlag(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles del Flag</DialogTitle>
          </DialogHeader>
          
          {selectedFlag && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Tipo</label>
                  <p className="font-medium">{flagTypeLabels[selectedFlag.type]}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Severidad</label>
                  <p><Badge className={severityColors[selectedFlag.severity]}>{selectedFlag.severity}</Badge></p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Estado</label>
                  <p><Badge className={statusColors[selectedFlag.status]}>{selectedFlag.status}</Badge></p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Fecha</label>
                  <p className="text-sm">{format(new Date(selectedFlag.created_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Usuario afectado</label>
                <p className="font-mono text-sm">{userEmails?.[selectedFlag.user_id] || selectedFlag.user_id}</p>
              </div>
              
              {selectedFlag.referrer_user_id && (
                <div>
                  <label className="text-sm text-muted-foreground">Referidor</label>
                  <p className="font-mono text-sm">{userEmails?.[selectedFlag.referrer_user_id] || selectedFlag.referrer_user_id}</p>
                </div>
              )}
              
              {selectedFlag.metadata && Object.keys(selectedFlag.metadata).length > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground">Metadata</label>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto mt-1">
                    {JSON.stringify(selectedFlag.metadata, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedFlag.notes && (
                <div>
                  <label className="text-sm text-muted-foreground">Notas</label>
                  <p className="text-sm bg-muted p-3 rounded-lg mt-1">{selectedFlag.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFraudFlags;
