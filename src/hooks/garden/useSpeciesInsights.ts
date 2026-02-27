import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { OwnedPlant, PlantStatus } from '@/hooks/collection/useOwnedPlants';
import type { Observation, ObservationCondition } from '@/hooks/collection/useObservations';
import type { GerminationBatch } from '@/hooks/garden/useGerminationDiary';

export interface SpeciesInsight {
  speciesName: string;
  commonName: string | null;
  totalPlants: number;
  alivePlants: number;
  survivalPct: number;
  avgConditionScore: number;        // 1-4 scale
  avgConditionLabel: string;
  observationCount: number;
  germinationBatches: number;
  germinationRatePct: number | null; // null = no batches
  lastObservationDate: string | null;
}

const CONDITION_SCORE: Record<string, number> = {
  healthy: 4, okay: 3, concern: 2, critical: 1,
};
const SCORE_LABELS = ['', 'Crítico', 'Preocupante', 'Aceptable', 'Saludable'];

function buildInsights(
  plants: OwnedPlant[],
  observations: Observation[],
  batches: GerminationBatch[],
): SpeciesInsight[] {
  // Group plants by scientific_name (fallback to nickname)
  const speciesMap = new Map<string, {
    plants: OwnedPlant[];
    observations: Observation[];
    batches: GerminationBatch[];
    commonName: string | null;
  }>();

  for (const p of plants) {
    const key = (p.scientific_name || p.nickname).toLowerCase().trim();
    if (!speciesMap.has(key)) {
      speciesMap.set(key, { plants: [], observations: [], batches: [], commonName: p.common_name });
    }
    speciesMap.get(key)!.plants.push(p);
  }

  // Map observations to species via owned_plant_id
  const plantIdToSpecies = new Map<string, string>();
  for (const p of plants) {
    plantIdToSpecies.set(p.id, (p.scientific_name || p.nickname).toLowerCase().trim());
  }

  for (const obs of observations) {
    const key = plantIdToSpecies.get(obs.owned_plant_id);
    if (key && speciesMap.has(key)) {
      speciesMap.get(key)!.observations.push(obs);
    }
  }

  // Map germination batches by species_name
  for (const b of batches) {
    const key = b.species_name.toLowerCase().trim();
    if (speciesMap.has(key)) {
      speciesMap.get(key)!.batches.push(b);
    } else {
      // Species only in germination, not in owned plants
      speciesMap.set(key, {
        plants: [],
        observations: [],
        batches: [b],
        commonName: b.common_name,
      });
    }
  }

  const insights: SpeciesInsight[] = [];

  for (const [key, group] of speciesMap) {
    const total = group.plants.length;
    const alive = group.plants.filter((p) => p.status === 'alive' || p.status === 'dormant').length;
    const survivalPct = total > 0 ? Math.round((alive / total) * 100) : 0;

    // Avg condition from observations
    const scores = group.observations
      .map((o) => CONDITION_SCORE[o.condition] ?? 0)
      .filter((s) => s > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Germination rate
    let germRate: number | null = null;
    if (group.batches.length > 0) {
      const totalSeeds = group.batches.reduce((s, b) => s + b.seed_count, 0);
      const totalSprouts = group.batches.reduce((s, b) => s + (b.total_sprouts ?? 0), 0);
      germRate = totalSeeds > 0 ? Math.round((totalSprouts / totalSeeds) * 100) : 0;
    }

    // Latest observation
    const sortedObs = [...group.observations].sort(
      (a, b) => new Date(b.observation_date).getTime() - new Date(a.observation_date).getTime(),
    );

    // Display name: use original casing from first plant or batch
    const displayName =
      group.plants[0]?.scientific_name || group.plants[0]?.nickname || group.batches[0]?.species_name || key;

    insights.push({
      speciesName: displayName,
      commonName: group.commonName,
      totalPlants: total,
      alivePlants: alive,
      survivalPct,
      avgConditionScore: avgScore,
      avgConditionLabel: SCORE_LABELS[avgScore] || '—',
      observationCount: group.observations.length,
      germinationBatches: group.batches.length,
      germinationRatePct: germRate,
      lastObservationDate: sortedObs[0]?.observation_date ?? null,
    });
  }

  return insights.sort((a, b) => b.totalPlants - a.totalPlants || a.speciesName.localeCompare(b.speciesName));
}

export const useSpeciesInsights = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['species-insights', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const [plantsRes, obsRes, batchesRes] = await Promise.all([
        supabase.from('owned_plants').select('*').eq('user_id', user.id),
        supabase.from('plant_observations').select('*').eq('user_id', user.id),
        supabase.from('germination_batches').select('*').eq('user_id', user.id),
      ]);

      if (plantsRes.error) throw plantsRes.error;
      if (obsRes.error) throw obsRes.error;
      if (batchesRes.error) throw batchesRes.error;

      // Enrich batches with entries for germination rate
      const { data: entries, error: eErr } = await supabase
        .from('germination_entries')
        .select('*')
        .eq('user_id', user.id);
      if (eErr) throw eErr;

      const entriesByBatch = (entries ?? []).reduce<Record<string, { sprout_count: number }[]>>(
        (acc, e: any) => { (acc[e.batch_id] ||= []).push(e); return acc; }, {},
      );

      const enrichedBatches = (batchesRes.data as GerminationBatch[]).map((b) => {
        const batchEntries = entriesByBatch[b.id] || [];
        const totalSprouts = batchEntries.reduce((s, e) => s + e.sprout_count, 0);
        return { ...b, total_sprouts: totalSprouts };
      });

      return buildInsights(
        plantsRes.data as OwnedPlant[],
        obsRes.data as Observation[],
        enrichedBatches,
      );
    },
    enabled: !!user,
    staleTime: 60_000,
  });
};

/** Get insight for a single species by name */
export const useSpeciesInsight = (speciesName?: string | null) => {
  const { data: all, isLoading } = useSpeciesInsights();

  const insight = speciesName
    ? all?.find((i) => i.speciesName.toLowerCase() === speciesName.toLowerCase())
    : undefined;

  return { data: insight ?? null, isLoading };
};
