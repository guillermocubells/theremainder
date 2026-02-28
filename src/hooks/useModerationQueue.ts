import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ModerationTab = "reports" | "verifications";

export interface ContentReport {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  details: string | null;
  status: string;
  user_id: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_action: string | null;
  resolution_notes: string | null;
}

export interface VerificationRequest {
  id: string;
  target_type: string;
  target_id: string;
  notes: string | null;
  evidence_urls: string[] | null;
  status: string;
  user_id: string;
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
}

export function useContentReports(statusFilter: string) {
  return useQuery({
    queryKey: ["admin-content-reports", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ContentReport[];
    },
  });
}

export function useVerificationRequests(statusFilter: string) {
  return useQuery({
    queryKey: ["admin-verification-requests", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("verification_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VerificationRequest[];
    },
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportId,
      action,
      notes,
    }: {
      reportId: string;
      action: string;
      notes: string;
    }) => {
      const { error } = await supabase.functions.invoke("api-moderation", {
        body: { report_id: reportId, action, notes },
        method: "PATCH",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content-reports"] });
      toast.success("Reporte resuelto");
    },
    onError: () => toast.error("Error al resolver reporte"),
  });
}

export function useReviewVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      decision,
      notes,
    }: {
      requestId: string;
      decision: "approved" | "rejected";
      notes: string;
    }) => {
      const { error } = await supabase.functions.invoke("api-verification", {
        body: { id: requestId, decision, reviewer_notes: notes },
        method: "PATCH",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-verification-requests"] });
      toast.success("Verificación actualizada");
    },
    onError: () => toast.error("Error al actualizar verificación"),
  });
}

export function useBulkResolveReports() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportIds,
      action,
      notes,
    }: {
      reportIds: string[];
      action: string;
      notes: string;
    }) => {
      const results = await Promise.allSettled(
        reportIds.map((id) =>
          supabase.functions.invoke("api-moderation", {
            body: { report_id: id, action, notes },
            method: "PATCH",
          })
        )
      );
      const failures = results.filter((r) => r.status === "rejected").length;
      if (failures > 0) throw new Error(`${failures} fallos`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content-reports"] });
      toast.success("Reportes resueltos en lote");
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });
}
