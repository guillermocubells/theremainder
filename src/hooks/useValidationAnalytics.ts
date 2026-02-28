/**
 * Instrumentation hook for tracking validation interactions.
 * Fire-and-forget inserts into validation_analytics table.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ValidationEventType = 'vote' | 'comment' | 'report' | 'verification_outcome';

export type ValidationAction =
  | 'upvote' | 'downvote' | 'toggle_off'
  | 'create' | 'edit' | 'delete'
  | 'submit'
  | 'approve' | 'reject' | 'warn' | 'remove' | 'dismiss';

interface TrackEventParams {
  event_type: ValidationEventType;
  action: ValidationAction;
  entity_type?: 'review' | 'comment' | 'verification';
  entity_id?: string;
  metadata?: Record<string, unknown>;
}

export function useTrackValidation() {
  const { user } = useAuth();

  const track = useCallback(
    (params: TrackEventParams) => {
      if (!user) return;

      // Fire-and-forget — no await
      supabase
        .from('validation_analytics' as any)
        .insert({
          event_type: params.event_type,
          action: params.action,
          entity_type: params.entity_type ?? null,
          entity_id: params.entity_id ?? null,
          user_id: user.id,
          metadata: params.metadata ?? {},
        })
        .then(({ error }) => {
          if (error) console.warn('[validation-analytics] insert failed:', error.message);
        });
    },
    [user],
  );

  return { track };
}

// ── Dashboard data hook ──

import { useQuery } from '@tanstack/react-query';

export interface ValidationSummary {
  total_votes: number;
  total_comments: number;
  total_reports: number;
  total_verifications: number;
  daily: Array<{
    date: string;
    votes: number;
    comments: number;
    reports: number;
    verifications: number;
  }>;
  action_breakdown: Array<{ action: string; count: number }>;
}

export function useValidationAnalytics(days = 30) {
  return useQuery<ValidationSummary>({
    queryKey: ['validation-analytics', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('validation_analytics' as any)
        .select('event_type, action, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<{
        event_type: string;
        action: string;
        created_at: string;
      }>;

      // Aggregate by day
      const dayMap = new Map<string, { votes: number; comments: number; reports: number; verifications: number }>();
      const actionMap = new Map<string, number>();

      let total_votes = 0;
      let total_comments = 0;
      let total_reports = 0;
      let total_verifications = 0;

      for (const row of rows) {
        const day = row.created_at.slice(0, 10);
        if (!dayMap.has(day)) {
          dayMap.set(day, { votes: 0, comments: 0, reports: 0, verifications: 0 });
        }
        const d = dayMap.get(day)!;

        switch (row.event_type) {
          case 'vote':
            d.votes++;
            total_votes++;
            break;
          case 'comment':
            d.comments++;
            total_comments++;
            break;
          case 'report':
            d.reports++;
            total_reports++;
            break;
          case 'verification_outcome':
            d.verifications++;
            total_verifications++;
            break;
        }

        actionMap.set(row.action, (actionMap.get(row.action) ?? 0) + 1);
      }

      const daily = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({ date, ...counts }));

      const action_breakdown = Array.from(actionMap.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count);

      return { total_votes, total_comments, total_reports, total_verifications, daily, action_breakdown };
    },
    staleTime: 60_000,
  });
}
