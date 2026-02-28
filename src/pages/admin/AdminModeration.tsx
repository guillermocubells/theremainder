import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useContentReports,
  useVerificationRequests,
  useResolveReport,
  useReviewVerification,
  useBulkResolveReports,
  type ContentReport,
  type VerificationRequest,
  type ModerationTab,
} from "@/hooks/useModerationQueue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  ExternalLink,
  Loader2,
  AlertTriangle,
  BadgeCheck,
  Filter,
} from "lucide-react";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  open: "outline",
  resolved: "secondary",
  dismissed: "secondary",
  approved: "default",
  rejected: "destructive",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminModeration() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  const tab = (params.get("tab") as ModerationTab) || "reports";
  const statusFilter = params.get("status") || "pending";

  const setTab = (v: string) => setParams({ tab: v, status: "pending" });
  const setStatus = (v: string) => setParams({ tab, status: v });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          {t("admin.moderation", "Moderación")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cola de reportes y verificaciones pendientes
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reports" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Reportes
          </TabsTrigger>
          <TabsTrigger value="verifications" className="gap-1.5">
            <BadgeCheck className="h-4 w-4" />
            Verificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          <ReportsQueue statusFilter={statusFilter} onStatusChange={setStatus} />
        </TabsContent>
        <TabsContent value="verifications" className="mt-4">
          <VerificationsQueue statusFilter={statusFilter} onStatusChange={setStatus} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Reports Queue ─── */

function ReportsQueue({
  statusFilter,
  onStatusChange,
}: {
  statusFilter: string;
  onStatusChange: (v: string) => void;
}) {
  const { data: reports = [], isLoading } = useContentReports(statusFilter);
  const resolveReport = useResolveReport();
  const bulkResolve = useBulkResolveReports();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<ContentReport | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkNotes, setBulkNotes] = useState("");

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === reports.length) setSelected(new Set());
    else setSelected(new Set(reports.map((r) => r.id)));
  };

  const handleResolve = (action: string) => {
    if (!detail) return;
    resolveReport.mutate(
      { reportId: detail.id, action, notes: actionNotes },
      { onSuccess: () => { setDetail(null); setActionNotes(""); } }
    );
  };

  const handleBulk = () => {
    if (!bulkAction || selected.size === 0) return;
    bulkResolve.mutate(
      { reportIds: Array.from(selected), action: bulkAction, notes: bulkNotes },
      { onSuccess: () => { setSelected(new Set()); setBulkAction(null); setBulkNotes(""); } }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base">Reportes de contenido</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="resolved">Resueltos</SelectItem>
                <SelectItem value="dismissed">Descartados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground">
              {selected.size} seleccionados
            </span>
            <Select value={bulkAction ?? ""} onValueChange={setBulkAction}>
              <SelectTrigger className="w-[130px] h-7 text-xs">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warn">Avisar</SelectItem>
                <SelectItem value="remove">Eliminar</SelectItem>
                <SelectItem value="dismiss">Descartar</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Notas..."
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              className="h-7 text-xs flex-1 max-w-[200px]"
            />
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              disabled={!bulkAction || bulkResolve.isPending}
              onClick={handleBulk}
            >
              {bulkResolve.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No hay reportes {statusFilter !== "all" ? `con estado "${statusFilter}"` : ""}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={selected.size === reports.length && reports.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Motivo</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id} className="text-xs">
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggleSelect(r.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {r.entity_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"} className="text-[10px]">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => { setDetail(r); setActionNotes(""); }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Detalle del reporte</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-xs">Tipo</span>
                  <p>{detail.entity_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">ID Entidad</span>
                  <p className="font-mono text-xs truncate">{detail.entity_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Motivo</span>
                  <p>{detail.reason}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Estado</span>
                  <Badge variant={STATUS_VARIANTS[detail.status] ?? "outline"} className="text-[10px]">
                    {detail.status}
                  </Badge>
                </div>
              </div>
              {detail.details && (
                <div>
                  <span className="text-muted-foreground text-xs">Detalles</span>
                  <p className="bg-muted p-2 rounded text-xs">{detail.details}</p>
                </div>
              )}
              {detail.status === "pending" && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Notas de moderación..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="text-xs min-h-[60px]"
                  />
                </div>
              )}
            </div>
          )}
          {detail?.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleResolve("dismiss")}
                disabled={resolveReport.isPending}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Descartar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleResolve("warn")}
                disabled={resolveReport.isPending}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Avisar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleResolve("remove")}
                disabled={resolveReport.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ─── Verifications Queue ─── */

function VerificationsQueue({
  statusFilter,
  onStatusChange,
}: {
  statusFilter: string;
  onStatusChange: (v: string) => void;
}) {
  const { data: requests = [], isLoading } = useVerificationRequests(statusFilter);
  const reviewVerification = useReviewVerification();
  const [detail, setDetail] = useState<VerificationRequest | null>(null);
  const [notes, setNotes] = useState("");

  const handleDecision = (decision: "approved" | "rejected") => {
    if (!detail) return;
    reviewVerification.mutate(
      { requestId: detail.id, decision, notes },
      { onSuccess: () => { setDetail(null); setNotes(""); } }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base">Solicitudes de verificación</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No hay solicitudes {statusFilter !== "all" ? `con estado "${statusFilter}"` : ""}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Target</TableHead>
                  <TableHead className="text-xs">Evidencia</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id} className="text-xs">
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {r.target_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] truncate max-w-[120px]">
                      {r.target_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      {r.evidence_urls?.length ? (
                        <span className="text-primary">{r.evidence_urls.length} archivo(s)</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"} className="text-[10px]">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => { setDetail(r); setNotes(""); }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Solicitud de verificación</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-xs">Tipo</span>
                  <p>{detail.target_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">ID Target</span>
                  <p className="font-mono text-xs truncate">{detail.target_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Estado</span>
                  <Badge variant={STATUS_VARIANTS[detail.status] ?? "outline"} className="text-[10px]">
                    {detail.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Solicitante</span>
                  <p className="font-mono text-xs truncate">{detail.user_id.slice(0, 8)}…</p>
                </div>
              </div>

              {detail.notes && (
                <div>
                  <span className="text-muted-foreground text-xs">Notas del solicitante</span>
                  <p className="bg-muted p-2 rounded text-xs">{detail.notes}</p>
                </div>
              )}

              {detail.evidence_urls && detail.evidence_urls.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs">Evidencia</span>
                  <div className="space-y-1 mt-1">
                    {detail.evidence_urls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Archivo {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {detail.status === "pending" && (
                <Textarea
                  placeholder="Notas del revisor..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
              )}
            </div>
          )}
          {detail?.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDecision("rejected")}
                disabled={reviewVerification.isPending}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
              </Button>
              <Button
                size="sm"
                onClick={() => handleDecision("approved")}
                disabled={reviewVerification.isPending}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprobar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
