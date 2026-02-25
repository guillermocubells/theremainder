import { supabase } from "@/integrations/supabase/client";

export type ConsentEventType =
  | "order_checkout"
  | "cookie_update"
  | "account_signup"
  | "marketing_optin"
  | "marketing_optout";

interface LogConsentParams {
  eventType: ConsentEventType;
  consents: Record<string, boolean | string>;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

export async function logConsent({
  eventType,
  consents,
  orderId,
  metadata,
}: LogConsentParams) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row = {
    user_id: user?.id ?? null,
    event_type: eventType,
    consents: consents as unknown as import("@/integrations/supabase/types").Json,
    order_id: orderId ?? null,
    metadata: (metadata ?? {}) as unknown as import("@/integrations/supabase/types").Json,
    user_agent: navigator.userAgent,
  };

  const { error } = await supabase.from("consent_logs").insert([row]);

  if (error) {
    console.error("[consent_log] Failed to persist consent:", error.message);
  }
}
