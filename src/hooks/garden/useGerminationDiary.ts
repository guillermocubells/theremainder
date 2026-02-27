import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface GerminationBatch {
  id: string;
  user_id: string;
  species_name: string;
  common_name: string | null;
  seed_count: number;
  method: string;
  substrate: string | null;
  temperature_c: number | null;
  humidity_pct: number | null;
  light_hours: number | null;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
  // computed client-side
  entries?: GerminationEntry[];
  total_sprouts?: number;
  germination_rate?: number;
  days_to_first_sprout?: number | null;
}

export interface GerminationEntry {
  id: string;
  batch_id: string;
  user_id: string;
  observed_at: string;
  sprout_count: number;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export type BatchInput = {
  species_name: string;
  common_name?: string | null;
  seed_count: number;
  method: string;
  substrate?: string | null;
  temperature_c?: number | null;
  humidity_pct?: number | null;
  light_hours?: number | null;
  notes?: string | null;
  started_at?: string;
  photos?: string[];
};

export type EntryInput = {
  batch_id: string;
  observed_at?: string;
  sprout_count: number;
  notes?: string | null;
  photo_url?: string | null;
};

/* ─── Computed helpers ─── */

function enrichBatch(batch: GerminationBatch, entries: GerminationEntry[]): GerminationBatch {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime(),
  );
  const totalSprouts = sorted.reduce((sum, e) => sum + e.sprout_count, 0);
  const rate = batch.seed_count > 0 ? (totalSprouts / batch.seed_count) * 100 : 0;

  const firstSprout = sorted.find((e) => e.sprout_count > 0);
  let daysToFirst: number | null = null;
  if (firstSprout) {
    const start = new Date(batch.started_at).getTime();
    const sproutDate = new Date(firstSprout.observed_at).getTime();
    daysToFirst = Math.max(0, Math.round((sproutDate - start) / (1000 * 60 * 60 * 24)));
  }

  return {
    ...batch,
    entries: sorted,
    total_sprouts: totalSprouts,
    germination_rate: Math.min(100, Math.round(rate * 10) / 10),
    days_to_first_sprout: daysToFirst,
  };
}

/* ─── Hooks ─── */

export const useGerminationBatches = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['germination-batches', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: batches, error: bErr } = await supabase
        .from('germination_batches')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });
      if (bErr) throw bErr;

      const { data: entries, error: eErr } = await supabase
        .from('germination_entries')
        .select('*')
        .eq('user_id', user.id);
      if (eErr) throw eErr;

      const entriesByBatch = (entries as GerminationEntry[]).reduce<Record<string, GerminationEntry[]>>(
        (acc, e) => {
          (acc[e.batch_id] ||= []).push(e);
          return acc;
        },
        {},
      );

      return (batches as GerminationBatch[]).map((b) =>
        enrichBatch(b, entriesByBatch[b.id] || []),
      );
    },
    enabled: !!user,
  });
};

export const useGerminationBatch = (batchId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['germination-batch', batchId],
    queryFn: async () => {
      if (!user || !batchId) return null;
      const { data: batch, error: bErr } = await supabase
        .from('germination_batches')
        .select('*')
        .eq('id', batchId)
        .single();
      if (bErr) throw bErr;

      const { data: entries, error: eErr } = await supabase
        .from('germination_entries')
        .select('*')
        .eq('batch_id', batchId)
        .order('observed_at', { ascending: true });
      if (eErr) throw eErr;

      return enrichBatch(batch as GerminationBatch, entries as GerminationEntry[]);
    },
    enabled: !!user && !!batchId,
  });
};

export const useCreateBatch = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: BatchInput) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('germination_batches')
        .insert([{ ...input, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['germination-batches'] }),
  });
};

export const useUpdateBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GerminationBatch> & { id: string }) => {
      const { data, error } = await supabase
        .from('germination_batches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['germination-batches'] });
      qc.invalidateQueries({ queryKey: ['germination-batch', v.id] });
    },
  });
};

export const useDeleteBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('germination_batches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['germination-batches'] }),
  });
};

export const useCreateEntry = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: EntryInput) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('germination_entries')
        .insert([{ ...input, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['germination-batches'] });
      qc.invalidateQueries({ queryKey: ['germination-batch', v.batch_id] });
    },
  });
};

export const useDeleteEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('germination_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['germination-batches'] });
      qc.invalidateQueries({ queryKey: ['germination-batch'] });
    },
  });
};

/* ─── Stats aggregation for charts ─── */

export interface SpeciesStats {
  species: string;
  batchCount: number;
  avgRate: number;
  avgDaysToSprout: number | null;
  totalSeeds: number;
  totalSprouts: number;
}

export function computeSpeciesStats(batches: GerminationBatch[]): SpeciesStats[] {
  const map = new Map<string, GerminationBatch[]>();
  batches.forEach((b) => {
    const key = b.species_name;
    (map.get(key) || (() => { const a: GerminationBatch[] = []; map.set(key, a); return a; })()).push(b);
  });

  return Array.from(map.entries()).map(([species, group]) => {
    const totalSeeds = group.reduce((s, b) => s + b.seed_count, 0);
    const totalSprouts = group.reduce((s, b) => s + (b.total_sprouts ?? 0), 0);
    const avgRate = totalSeeds > 0 ? Math.round((totalSprouts / totalSeeds) * 1000) / 10 : 0;
    const withDays = group.filter((b) => b.days_to_first_sprout != null);
    const avgDays = withDays.length > 0
      ? Math.round(withDays.reduce((s, b) => s + (b.days_to_first_sprout ?? 0), 0) / withDays.length)
      : null;
    return { species, batchCount: group.length, avgRate, avgDaysToSprout: avgDays, totalSeeds, totalSprouts };
  }).sort((a, b) => b.batchCount - a.batchCount);
}
