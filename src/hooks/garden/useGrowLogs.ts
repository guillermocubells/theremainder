import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GrowLog {
  id: string;
  title: string;
  species: string | null;
  taxon_id: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  entry_count: number;
  last_entry: {
    id: string;
    type: string;
    notes: string | null;
    occurred_at: string;
    media_count: number;
  } | null;
  last_photo_url: string | null;
}

export interface GrowLogsFilters {
  species?: string;
  tag?: string;
  search?: string;
}

export function useGrowLogs(filters?: GrowLogsFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["grow-logs", user?.id, filters],
    enabled: !!user,
    queryFn: async (): Promise<GrowLog[]> => {
      // Fetch logs
      let q = supabase
        .from("grow_logs")
        .select("id, title, species, taxon_id, visibility, created_at, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (filters?.species) {
        q = q.ilike("species", `%${filters.species}%`);
      }
      if (filters?.search) {
        q = q.ilike("title", `%${filters.search}%`);
      }

      const { data: logs, error } = await q;
      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      const logIds = logs.map((l) => l.id);

      // Fetch entry counts per log
      const { data: entryCounts } = await supabase
        .from("grow_entries")
        .select("log_id, id")
        .in("log_id", logIds);

      const countMap = new Map<string, number>();
      entryCounts?.forEach((e) => {
        countMap.set(e.log_id, (countMap.get(e.log_id) ?? 0) + 1);
      });

      // Fetch latest entry per log (most recent occurred_at)
      // We'll get all entries and pick the latest per log in JS (simple approach)
      const { data: allEntries } = await supabase
        .from("grow_entries")
        .select("id, log_id, type, notes, occurred_at, media_count")
        .in("log_id", logIds)
        .order("occurred_at", { ascending: false });

      const lastEntryMap = new Map<string, GrowLog["last_entry"]>();
      allEntries?.forEach((e) => {
        if (!lastEntryMap.has(e.log_id)) {
          lastEntryMap.set(e.log_id, {
            id: e.id,
            type: e.type,
            notes: e.notes,
            occurred_at: e.occurred_at,
            media_count: e.media_count ?? 0,
          });
        }
      });

      // Fetch latest media per log for preview photo
      const lastEntryIds = [...lastEntryMap.values()]
        .filter((e) => e && e.media_count > 0)
        .map((e) => e!.id);

      let photoMap = new Map<string, string>();
      if (lastEntryIds.length > 0) {
        const { data: media } = await supabase
          .from("grow_entry_media")
          .select("entry_id, storage_path")
          .in("entry_id", lastEntryIds)
          .order("sort_order", { ascending: true })
          .limit(lastEntryIds.length);

        const seenEntries = new Set<string>();
        media?.forEach((m) => {
          if (!seenEntries.has(m.entry_id)) {
            seenEntries.add(m.entry_id);
            const { data: urlData } = supabase.storage
              .from("grow-media")
              .getPublicUrl(m.storage_path);
            photoMap.set(m.entry_id, urlData.publicUrl);
          }
        });
      }

      // Filter by tag if needed
      let filteredLogIds: Set<string> | null = null;
      if (filters?.tag) {
        const { data: tagEntries } = await supabase
          .from("grow_entries")
          .select("log_id")
          .in("log_id", logIds)
          .contains("tags", [filters.tag]);

        filteredLogIds = new Set(tagEntries?.map((e) => e.log_id));
      }

      return logs
        .filter((l) => !filteredLogIds || filteredLogIds.has(l.id))
        .map((l) => {
          const lastEntry = lastEntryMap.get(l.id) ?? null;
          return {
            ...l,
            entry_count: countMap.get(l.id) ?? 0,
            last_entry: lastEntry,
            last_photo_url: lastEntry ? (photoMap.get(lastEntry.id) ?? null) : null,
          };
        });
    },
  });
}

export function useCreateGrowLog() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; species?: string }) => {
      const { data: log, error } = await supabase
        .from("grow_logs")
        .insert({
          title: data.title,
          species: data.species ?? null,
          user_id: user!.id,
          visibility: "private",
        })
        .select("id")
        .single();
      if (error) throw error;
      return log;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grow-logs"] });
    },
  });
}
