import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useLocationPreference } from "./useLocationPreference";

// ── Types ────────────────────────────────────────────────────────────

export interface CareNote {
  id: string;
  title: string | null;
  body: string;
  category: string;
  locale: string;
  season: string | null;
  region_verified: boolean;
  country_code: string | null;
  climate_zone_code: string | null;
  hardiness_zone: string | null;
  source_type: string | null;
  source_title: string | null;
  source_url: string | null;
  upvote_count: number;
  downvote_count: number;
  created_at: string;
  /** Computed: how well this note matches the user's region */
  regionRelevance: "exact" | "country" | "fallback";
}

// ── Sorting / prioritization ─────────────────────────────────────────

function scoreNote(
  note: CareNote,
  userLocale: string,
  userCountry: string | null,
  userClimateZone: string | null
): number {
  let score = 0;

  // Locale match (exact match preferred, then any same-language)
  if (note.locale === userLocale) score += 100;
  else if (note.locale.slice(0, 2) === userLocale.slice(0, 2)) score += 60;

  // Region match
  if (note.climate_zone_code && userClimateZone && note.climate_zone_code === userClimateZone) {
    score += 50;
  }
  if (note.country_code && userCountry && note.country_code === userCountry) {
    score += 30;
  }

  // Region-verified flag
  if (note.region_verified) score += 20;

  // Community signal (net votes)
  score += Math.min(note.upvote_count - note.downvote_count, 20);

  return score;
}

function assignRelevance(
  note: CareNote,
  userCountry: string | null,
  userClimateZone: string | null
): CareNote["regionRelevance"] {
  if (
    note.climate_zone_code &&
    userClimateZone &&
    note.climate_zone_code === userClimateZone
  ) {
    return "exact";
  }
  if (note.country_code && userCountry && note.country_code === userCountry) {
    return "country";
  }
  return "fallback";
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useCareNotes(plantId: string | undefined) {
  const { i18n } = useTranslation();
  const { location } = useLocationPreference();

  const locale = i18n.language; // "es" | "en"
  const userCountry = location?.country || null;
  const userClimateZone = location?.climate?.zone || null;

  return useQuery<CareNote[]>({
    queryKey: ["care-notes", plantId, locale, userCountry, userClimateZone],
    enabled: !!plantId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!plantId) return [];

      // 1. Get care profile id for this plant
      const { data: profile } = await supabase
        .from("species_care_profiles")
        .select("id")
        .eq("plant_id", plantId)
        .eq("moderation_status", "approved")
        .maybeSingle();

      if (!profile) return [];

      // 2. Fetch approved notes — get user locale + fallback locale
      const fallbackLocale = locale.startsWith("es") ? "en" : "es";

      const { data: notes, error } = await supabase
        .from("care_notes")
        .select("*")
        .eq("care_profile_id", profile.id)
        .eq("moderation_status", "approved")
        .in("locale", [locale, fallbackLocale])
        .order("upvote_count", { ascending: false })
        .limit(50);

      if (error || !notes) return [];

      // 3. Score and sort
      const scored = notes.map((n) => {
        const relevance = assignRelevance(
          n as unknown as CareNote,
          userCountry,
          userClimateZone
        );
        return {
          ...n,
          regionRelevance: relevance,
          _score: scoreNote(
            { ...n, regionRelevance: relevance } as CareNote,
            locale,
            userCountry,
            userClimateZone
          ),
        };
      });

      scored.sort((a, b) => b._score - a._score);

      return scored.map(({ _score, ...rest }) => rest) as CareNote[];
    },
  });
}
