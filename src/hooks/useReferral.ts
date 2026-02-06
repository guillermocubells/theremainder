import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STORAGE_KEYS } from "@/config/store";

export interface ReferralInfo {
  code: string;
  link: string;
}

export interface WalletInfo {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type: "credit" | "debit" | "reversal";
  source: "referral_reward" | "order_discount" | "admin_adjustment" | "reward_matured";
  amount: number;
  currency: string;
  description: string | null;
  createdAt: string;
}

export interface ReferralReward {
  id: string;
  referredUserEmail?: string;
  orderNumber?: string;
  status: "pending" | "available" | "used" | "reversed" | "expired";
  productSubtotal: number;
  rewardAmount: number;
  capApplied: boolean;
  maturesAt: string | null;
  createdAt: string;
}

/**
 * Hook to get current user's referral code and link
 */
export const useReferralCode = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referral-code", user?.id],
    queryFn: async (): Promise<ReferralInfo | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", user.id)
        .single();

      if (error || !data) return null;

      const origin = window.location.origin;
      return {
        code: data.code,
        link: `${origin}/?ref=${data.code}`,
      };
    },
    enabled: !!user,
  });
};

/**
 * Hook to get current user's wallet balance
 */
export const useWallet = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async (): Promise<WalletInfo | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("wallets")
        .select("available_balance, pending_balance, currency")
        .eq("user_id", user.id)
        .single();

      if (error || !data) return null;

      return {
        availableBalance: data.available_balance,
        pendingBalance: data.pending_balance,
        currency: data.currency,
      };
    },
    enabled: !!user,
  });
};

/**
 * Hook to get wallet transaction history
 */
export const useWalletTransactions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: async (): Promise<WalletTransaction[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !data) return [];

      return data.map((t) => ({
        id: t.id,
        type: t.type as WalletTransaction["type"],
        source: t.source as WalletTransaction["source"],
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        createdAt: t.created_at,
      }));
    },
    enabled: !!user,
  });
};

/**
 * Hook to get referral rewards (where user is the referrer)
 */
export const useReferralRewards = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referral-rewards", user?.id],
    queryFn: async (): Promise<ReferralReward[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("referral_rewards")
        .select(`
          id,
          status,
          product_subtotal,
          reward_amount,
          cap_applied,
          matures_at,
          created_at,
          order_id
        `)
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !data) return [];

      return data.map((r) => ({
        id: r.id,
        status: r.status as ReferralReward["status"],
        productSubtotal: r.product_subtotal,
        rewardAmount: r.reward_amount,
        capApplied: r.cap_applied,
        maturesAt: r.matures_at,
        createdAt: r.created_at,
      }));
    },
    enabled: !!user,
  });
};

/**
 * Hook to get referral settings
 */
export const useReferralSettings = () => {
  return useQuery({
    queryKey: ["referral-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_settings")
        .select("key, value");

      if (error || !data) {
        return {
          rewardPercentage: 5,
          capEur: 100,
          pendingDays: 7,
          maxWalletPercent: 50,
        };
      }

      const settings: Record<string, number> = {};
      for (const s of data) {
        settings[s.key] = typeof s.value === "number" ? s.value : parseFloat(s.value as string);
      }

      return {
        rewardPercentage: settings.REWARD_PERCENTAGE || 5,
        capEur: settings.CAP_EUR || 100,
        pendingDays: settings.REWARD_PENDING_DAYS || 7,
        maxWalletPercent: settings.MAX_WALLET_PERCENT || 50,
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

// Storage key for pending referral
const PENDING_REFERRAL_KEY = STORAGE_KEYS.pendingReferral;

/**
 * Store pending referral code from URL
 */
export const storePendingReferral = (code: string) => {
  try {
    localStorage.setItem(PENDING_REFERRAL_KEY, code.toUpperCase());
  } catch (e) {
    console.error("Failed to store pending referral:", e);
  }
};

/**
 * Get and clear pending referral code
 */
export const getPendingReferral = (): string | null => {
  try {
    return localStorage.getItem(PENDING_REFERRAL_KEY);
  } catch (e) {
    return null;
  }
};

/**
 * Clear pending referral
 */
export const clearPendingReferral = () => {
  try {
    localStorage.removeItem(PENDING_REFERRAL_KEY);
  } catch (e) {
    console.error("Failed to clear pending referral:", e);
  }
};
