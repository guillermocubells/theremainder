import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserReputation {
  total_score: number;
  confidence: number | null;
  level: string;
}

export interface UserBadge {
  badge_key: string;
  awarded_at: string;
  label: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  display_order: number;
}

export interface VerificationStatus {
  id: string;
  status: string;
  target_type: string;
  target_id: string;
  evidence_urls: string[] | null;
  reviewed_at: string | null;
}

export function useUserReputation(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-reputation", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_reputation")
        .select("total_score, confidence, level")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as UserReputation | null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useUserBadges(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-badges", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: badges, error: bErr } = await supabase
        .from("user_badges")
        .select("badge_key, awarded_at")
        .eq("user_id", userId)
        .is("revoked_at", null);
      if (bErr) throw bErr;
      if (!badges?.length) return [];

      const keys = badges.map((b) => b.badge_key);
      const { data: thresholds, error: tErr } = await supabase
        .from("badge_thresholds")
        .select("badge_key, label, description, color, icon, display_order")
        .in("badge_key", keys);
      if (tErr) throw tErr;

      const thresholdMap = new Map(
        (thresholds ?? []).map((t) => [t.badge_key, t])
      );

      return badges
        .map((b) => {
          const t = thresholdMap.get(b.badge_key);
          return {
            badge_key: b.badge_key,
            awarded_at: b.awarded_at,
            label: t?.label ?? b.badge_key,
            description: t?.description ?? null,
            color: t?.color ?? null,
            icon: t?.icon ?? null,
            display_order: t?.display_order ?? 99,
          } as UserBadge;
        })
        .sort((a, b) => a.display_order - b.display_order);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useVerificationStatus(
  targetType: string,
  targetId: string | undefined
) {
  return useQuery({
    queryKey: ["verification-status", targetType, targetId],
    queryFn: async () => {
      if (!targetId) return null;
      const { data, error } = await supabase
        .from("verification_requests")
        .select("id, status, target_type, target_id, evidence_urls, reviewed_at")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("status", "approved")
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as VerificationStatus | null;
    },
    enabled: !!targetId,
    staleTime: 120_000,
  });
}
