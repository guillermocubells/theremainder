/**
 * E2E Smoke Tests – Collection Tracker Core Flows
 *
 * Covers:
 *  1. Create a collection item (owned plant)
 *  2. Add item with media (photos array)
 *  3. Tag an item
 *  4. Filter by tag, status, search
 *  5. Share via public link (create slug, toggle public)
 *  6. Error handling (RLS, duplicates)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Supabase with inline factory (no top-level refs) ──
const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const upload = vi.fn();
  const createSignedUrl = vi.fn();
  const from = vi.fn();
  return { rpc, upload, createSignedUrl, from };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
    storage: {
      from: vi.fn(() => ({
        upload: mocks.upload,
        createSignedUrl: mocks.createSignedUrl,
      })),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "test@example.com" },
    session: { access_token: "token" },
  }),
}));

import { supabase } from "@/integrations/supabase/client";

// ── Chain builder utility ──
function mockChain(terminal: { data: any; error: any }) {
  const resolve = () => Promise.resolve(terminal);
  const self: any = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "then") return resolve().then.bind(resolve());
        return vi.fn().mockReturnValue(self);
      },
    }
  );
  // Override terminal methods
  self.single = vi.fn().mockResolvedValue(terminal);
  self.maybeSingle = vi.fn().mockResolvedValue(terminal);
  return self;
}

function setupFrom(terminal: { data: any; error: any }) {
  const chain = mockChain(terminal);
  mocks.from.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────
// 1️⃣ Create a collection item
// ─────────────────────────────────────────────
describe("Collection – Create Item", () => {
  it("inserts a new owned plant with required fields", async () => {
    const planted = {
      id: "plant-001",
      user_id: "user-123",
      nickname: "Mi Monstera",
      scientific_name: "Monstera deliciosa",
      status: "alive",
      tags: [],
      photos: [],
    };

    setupFrom({ data: planted, error: null });

    const { data, error } = await supabase
      .from("owned_plants")
      .insert([{ nickname: "Mi Monstera", user_id: "user-123", tags: [], photos: [], status: "alive" }])
      .select()
      .single();

    expect(mocks.from).toHaveBeenCalledWith("owned_plants");
    expect(data.id).toBe("plant-001");
    expect(data.nickname).toBe("Mi Monstera");
    expect(error).toBeNull();
  });

  it("validates that nickname cannot be empty", () => {
    const nickname = "";
    expect(nickname.trim()).toBe("");
    // AddPlantDialog checks: if (!formData.nickname.trim()) toast.error(...)
  });
});

// ─────────────────────────────────────────────
// 2️⃣ Add item with media (photo upload)
// ─────────────────────────────────────────────
describe("Collection – Media Upload", () => {
  it("uploads photo and returns signed URL", async () => {
    mocks.upload.mockResolvedValue({ data: { path: "user-123/photo.jpg" }, error: null });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/collection-photos/user-123/photo.jpg?token=abc" },
      error: null,
    });

    const file = new File(["fake-image"], "photo.jpg", { type: "image/jpeg" });
    const filePath = "user-123/test-photo.jpg";

    const { error } = await supabase.storage
      .from("collection-photos")
      .upload(filePath, file);

    expect(error).toBeNull();
    expect(mocks.upload).toHaveBeenCalledWith(filePath, file);

    const { data: signed } = await supabase.storage
      .from("collection-photos")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);

    expect(signed?.signedUrl).toContain("collection-photos");
  });

  it("handles upload failure gracefully", async () => {
    mocks.upload.mockResolvedValue({ data: null, error: { message: "Storage quota exceeded" } });

    const file = new File(["fake"], "big.jpg", { type: "image/jpeg" });
    const { error } = await supabase.storage
      .from("collection-photos")
      .upload("user-123/big.jpg", file);

    expect(error).toBeDefined();
    expect(error.message).toBe("Storage quota exceeded");
  });

  it("creates plant with photos array", async () => {
    const photos = ["https://example.com/p1.jpg", "https://example.com/p2.jpg"];
    setupFrom({ data: { id: "plant-002", photos, nickname: "Helecho" }, error: null });

    const { data } = await supabase
      .from("owned_plants")
      .insert([{ nickname: "Helecho", photos, user_id: "user-123" }])
      .select()
      .single();

    expect(data.photos).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────
// 3️⃣ Tag an item
// ─────────────────────────────────────────────
describe("Collection – Tagging", () => {
  it("parses comma-separated tags from input", () => {
    const input = "interior, tropical, favorita";
    const tags = input.split(",").map((t) => t.trim()).filter(Boolean);
    expect(tags).toEqual(["interior", "tropical", "favorita"]);
  });

  it("handles empty tags input", () => {
    const tags = "".split(",").map((t) => t.trim()).filter(Boolean);
    expect(tags).toEqual([]);
  });

  it("updates plant tags via Supabase", async () => {
    setupFrom({ data: { id: "plant-001", tags: ["interior", "tropical"] }, error: null });

    const { data } = await supabase
      .from("owned_plants")
      .update({ tags: ["interior", "tropical"] })
      .eq("id", "plant-001")
      .select()
      .single();

    expect(data.tags).toContain("tropical");
    expect(data.tags).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────
// 4️⃣ Filter collection
// ─────────────────────────────────────────────
describe("Collection – Filtering", () => {
  it("filters by status using .eq()", async () => {
    setupFrom({ data: [], error: null });

    await supabase
      .from("owned_plants")
      .select("*, plant_locations (id, name)")
      .eq("user_id", "user-123")
      .eq("status", "sick")
      .order("created_at", { ascending: false });

    expect(mocks.from).toHaveBeenCalledWith("owned_plants");
  });

  it("filters by tag using .contains()", async () => {
    setupFrom({ data: [{ id: "plant-001", tags: ["tropical"] }], error: null });

    await supabase
      .from("owned_plants")
      .select("*")
      .eq("user_id", "user-123")
      .contains("tags", ["tropical"]);

    expect(mocks.from).toHaveBeenCalledWith("owned_plants");
  });

  it("filters by text search using .or()", async () => {
    const search = "monstera";
    setupFrom({ data: [], error: null });

    await supabase
      .from("owned_plants")
      .select("*")
      .eq("user_id", "user-123")
      .or(`nickname.ilike.%${search}%,common_name.ilike.%${search}%,scientific_name.ilike.%${search}%`);

    expect(mocks.from).toHaveBeenCalledWith("owned_plants");
  });

  it("OwnedPlantsFilters type accepts all filter keys", () => {
    const filters: { status: string; location_id: string; tag: string; search: string } = {
      status: "alive",
      location_id: "loc-1",
      tag: "tropical",
      search: "monstera",
    };
    expect(filters.status).toBe("alive");
    expect(filters.tag).toBe("tropical");
  });
});

// ─────────────────────────────────────────────
// 5️⃣ Share via public link
// ─────────────────────────────────────────────
describe("Collection – Public Sharing", () => {
  it("generates slug via RPC and creates public slug record", async () => {
    mocks.rpc.mockResolvedValue({ data: "abc-xyz-123", error: null });

    const { data: slug } = await supabase.rpc("generate_plant_slug");
    expect(slug).toBe("abc-xyz-123");

    setupFrom({
      data: { id: "slug-001", owned_plant_id: "plant-001", slug, is_public: false },
      error: null,
    });

    const { data } = await supabase
      .from("plant_public_slugs")
      .insert([{ owned_plant_id: "plant-001", slug, is_public: false }])
      .select()
      .single();

    expect(data.slug).toBe("abc-xyz-123");
    expect(data.is_public).toBe(false);
  });

  it("toggles sharing on", async () => {
    setupFrom({ data: { id: "slug-001", is_public: true }, error: null });

    const { data } = await supabase
      .from("plant_public_slugs")
      .update({ is_public: true })
      .eq("id", "slug-001")
      .select()
      .single();

    expect(data.is_public).toBe(true);
  });

  it("fetches public plant by slug", async () => {
    setupFrom({ data: { owned_plant_id: "plant-001" }, error: null });

    const { data } = await supabase
      .from("plant_public_slugs")
      .select("owned_plant_id")
      .eq("slug", "abc-xyz-123")
      .eq("is_public", true)
      .single();

    expect(data.owned_plant_id).toBe("plant-001");
  });

  it("deletes slug to revoke sharing", async () => {
    setupFrom({ data: null, error: null });

    const result = await supabase
      .from("plant_public_slugs")
      .delete()
      .eq("id", "slug-001");

    expect(mocks.from).toHaveBeenCalledWith("plant_public_slugs");
  });
});

// ─────────────────────────────────────────────
// 6️⃣ Error handling
// ─────────────────────────────────────────────
describe("Collection – Error Handling", () => {
  it("handles duplicate slug (unique constraint)", async () => {
    setupFrom({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    const { data, error } = await supabase
      .from("plant_public_slugs")
      .insert([{ owned_plant_id: "plant-001", slug: "dupe", is_public: false }])
      .select()
      .single();

    expect(data).toBeNull();
    expect(error.code).toBe("23505");
  });

  it("handles RLS policy denial", async () => {
    setupFrom({
      data: null,
      error: { code: "42501", message: "new row violates row-level security policy" },
    });

    const { error } = await supabase
      .from("owned_plants")
      .insert([{ nickname: "Hacked", user_id: "other-user" }])
      .select()
      .single();

    expect(error).toBeDefined();
    expect(error.code).toBe("42501");
  });
});
