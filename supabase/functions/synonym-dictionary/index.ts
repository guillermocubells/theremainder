import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Validation schemas ──────────────────────────────────────────────

const entryTypeSchema = z.enum(["synonym", "one_way", "phrase_mapping"]);
const languageSchema = z.enum(["es", "en", "universal"]);

const createSchema = z.object({
  entry_type: entryTypeSchema,
  source_term: z.string().trim().min(1).max(200),
  target_terms: z.array(z.string().trim().min(1).max(200)).min(1).max(50),
  group_label: z.string().trim().max(100).nullable().optional(),
  language: languageSchema.optional().default("universal"),
  is_active: z.boolean().optional().default(true),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  source_term: z.string().trim().min(1).max(200).optional(),
  target_terms: z.array(z.string().trim().min(1).max(200)).min(1).max(50).optional(),
  group_label: z.string().trim().max(100).nullable().optional(),
  language: languageSchema.optional(),
  is_active: z.boolean().optional(),
  entry_type: entryTypeSchema.optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

const listSchema = z.object({
  entry_type: entryTypeSchema.optional(),
  group_label: z.string().optional(),
  language: languageSchema.optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(200).optional(),
  page: z.number().int().min(1).optional().default(1),
  per_page: z.number().int().min(1).max(100).optional().default(50),
});

// ── Helpers ─────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  if (token === serviceRoleKey) {
    return { supabase: createClient(supabaseUrl, serviceRoleKey), userId: null };
  }

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Admin role required");

  return { supabase, userId: user.id };
}

// ── Handlers ────────────────────────────────────────────────────────

async function handleList(supabase: ReturnType<typeof createClient>, params: z.infer<typeof listSchema>) {
  let query = supabase
    .from("synonym_dictionary")
    .select("*", { count: "exact" });

  if (params.entry_type) query = query.eq("entry_type", params.entry_type);
  if (params.group_label) query = query.eq("group_label", params.group_label);
  if (params.language) query = query.eq("language", params.language);
  if (params.is_active !== undefined) query = query.eq("is_active", params.is_active);
  if (params.search) query = query.ilike("source_term", `%${params.search}%`);

  const offset = (params.page - 1) * params.per_page;
  query = query.order("group_label", { ascending: true })
    .order("source_term", { ascending: true })
    .range(offset, offset + params.per_page - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  // Get current version
  const { data: versionData } = await supabase
    .from("synonym_versions")
    .select("version, applied_at, entry_count, checksum")
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return {
    entries: data,
    total: count,
    page: params.page,
    per_page: params.per_page,
    current_version: versionData,
  };
}

async function handleCreate(
  supabase: ReturnType<typeof createClient>,
  body: z.infer<typeof createSchema>,
  userId: string | null
) {
  const { data, error } = await supabase
    .from("synonym_dictionary")
    .insert({
      ...body,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw Object.assign(new Error("Duplicate entry: source_term already exists for this type and language"), { status: 409 });
    }
    throw error;
  }

  const { data: newVersion } = await supabase.rpc("bump_synonym_version");

  return { entry: data, version: newVersion };
}

async function handleUpdate(
  supabase: ReturnType<typeof createClient>,
  body: z.infer<typeof updateSchema>,
  userId: string | null
) {
  const { id, ...updates } = body;

  const { data, error } = await supabase
    .from("synonym_dictionary")
    .update({ ...updates, updated_by: userId, version: undefined })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw Object.assign(new Error("Duplicate entry: source_term already exists for this type and language"), { status: 409 });
    }
    throw error;
  }

  if (!data) throw Object.assign(new Error("Entry not found"), { status: 404 });

  const { data: newVersion } = await supabase.rpc("bump_synonym_version");

  return { entry: data, version: newVersion };
}

async function handleDelete(
  supabase: ReturnType<typeof createClient>,
  body: z.infer<typeof deleteSchema>
) {
  const { error, count } = await supabase
    .from("synonym_dictionary")
    .delete()
    .eq("id", body.id);

  if (error) throw error;
  if (count === 0) throw Object.assign(new Error("Entry not found"), { status: 404 });

  const { data: newVersion } = await supabase.rpc("bump_synonym_version");

  return { deleted: true, version: newVersion };
}

async function handleExport(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("synonym_dictionary")
    .select("entry_type, source_term, target_terms, group_label, language")
    .eq("is_active", true)
    .order("group_label")
    .order("source_term");

  if (error) throw error;

  // Transform into SYNONYM_GROUPS-compatible format
  const groups: Record<string, string[]> = {};
  const oneWay: Array<{ from: string; to: string[] }> = [];
  const phrases: Array<{ phrase: string; canonical: string }> = [];

  for (const entry of data ?? []) {
    switch (entry.entry_type) {
      case "synonym":
        groups[entry.source_term] = entry.target_terms;
        break;
      case "one_way":
        oneWay.push({ from: entry.source_term, to: entry.target_terms });
        break;
      case "phrase_mapping":
        phrases.push({ phrase: entry.source_term, canonical: entry.target_terms[0] ?? "" });
        break;
    }
  }

  const { data: versionData } = await supabase
    .from("synonym_versions")
    .select("version, checksum")
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return {
    version: versionData?.version ?? 1,
    checksum: versionData?.checksum ?? "",
    synonym_groups: groups,
    one_way_synonyms: oneWay,
    phrase_mappings: phrases,
  };
}

// ── Main ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";

    // Export is public read (uses RLS is_active filter)
    if (action === "export" && req.method === "GET") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const result = await handleExport(supabase);
      return jsonResponse(result);
    }

    // Version check (public, for cache invalidation)
    if (action === "version" && req.method === "GET") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data } = await supabase
        .from("synonym_versions")
        .select("version, applied_at, entry_count, checksum")
        .order("version", { ascending: false })
        .limit(1)
        .single();
      return jsonResponse(data);
    }

    // All other actions require admin
    const { supabase, userId } = await verifyAdmin(req);

    switch (action) {
      case "list": {
        const params = listSchema.parse(
          req.method === "GET"
            ? Object.fromEntries(url.searchParams.entries())
            : await req.json().catch(() => ({}))
        );
        return jsonResponse(await handleList(supabase, params));
      }

      case "create": {
        if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
        const body = createSchema.parse(await req.json());
        return jsonResponse(await handleCreate(supabase, body, userId), 201);
      }

      case "update": {
        if (req.method !== "PUT" && req.method !== "PATCH") return jsonResponse({ error: "Method not allowed" }, 405);
        const body = updateSchema.parse(await req.json());
        return jsonResponse(await handleUpdate(supabase, body, userId));
      }

      case "delete": {
        if (req.method !== "DELETE") return jsonResponse({ error: "Method not allowed" }, 405);
        const body = deleteSchema.parse(await req.json());
        return jsonResponse(await handleDelete(supabase, body));
      }

      case "export":
        return jsonResponse(await handleExport(supabase));

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse({ error: "Validation error", details: err.errors }, 400);
    }

    const status = (err as { status?: number }).status ?? 
      (err instanceof Error && err.message === "Unauthorized" ? 401 :
       err instanceof Error && err.message === "Admin role required" ? 403 : 500);

    console.error("[synonym-dictionary]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      status
    );
  }
});
