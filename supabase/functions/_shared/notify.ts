/**
 * Shared notification helper for Edge Functions.
 *
 * Emits a domain event to `reputation_events` (realtime for UI)
 * and optionally enqueues a notification email via `enqueue_job`.
 *
 * Usage:
 *   import { emitNotification } from "../_shared/notify.ts";
 *
 *   await emitNotification(supabase, {
 *     userId: "...",
 *     eventType: "new_comment_reply",
 *     payload: { review_id, comment_id, ... },
 *     email: { subject: "...", template: "comment_reply" },
 *   });
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface NotificationOptions {
  /** Target user who should receive the notification */
  userId: string;
  /** Domain event type key */
  eventType: string;
  /** Arbitrary payload for UI/realtime */
  payload: Record<string, unknown>;
  /** If provided, also enqueues a notification email */
  email?: {
    subject: string;
    template: string;
    priority?: number;
  };
}

/**
 * Emit a domain notification event.
 * Requires a service-role Supabase client.
 */
export async function emitNotification(
  supabase: SupabaseClient,
  opts: NotificationOptions,
): Promise<void> {
  const { userId, eventType, payload, email } = opts;

  // 1. Insert into reputation_events for realtime UI pickup
  const { error: evtErr } = await supabase.from("reputation_events").insert({
    user_id: userId,
    event_type: eventType,
    payload,
  });

  if (evtErr) {
    console.error(`[notify] Failed to emit event ${eventType}:`, evtErr.message);
  }

  // 2. Optionally enqueue email notification
  if (email) {
    const { error: jobErr } = await supabase.rpc("enqueue_job", {
      p_job_type: "send_email",
      p_payload: {
        template: email.template,
        to_user_id: userId,
        subject: email.subject,
        metadata: { event_type: eventType, ...payload },
      },
      p_priority: email.priority ?? 5,
    });

    if (jobErr) {
      console.error(`[notify] Failed to enqueue email for ${eventType}:`, jobErr.message);
    }
  }
}

/**
 * Emit multiple notifications in parallel.
 */
export async function emitNotifications(
  supabase: SupabaseClient,
  notifications: NotificationOptions[],
): Promise<void> {
  await Promise.allSettled(
    notifications.map((n) => emitNotification(supabase, n)),
  );
}
