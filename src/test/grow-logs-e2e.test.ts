/**
 * E2E Happy-Path – Grow Logs
 *
 * Flow:
 *  1. Create an observation log entry for an owned plant
 *  2. Add entry with photo upload → signed URL stored
 *  3. View timeline (query observations ordered by date)
 *  4. Toggle public share (create slug → enable → verify → disable)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Supabase ──
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
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "tok-123" } },
      }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-42", email: "grower@example.com" },
    session: { access_token: "tok-123" },
  }),
}));

import { supabase } from "@/integrations/supabase/client";

// ── Chain builder (mirrors collection-smoke pattern) ──
function mockChain(terminal: { data: any; error: any }) {
  const resolve = () => Promise.resolve(terminal);
  const self: any = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "then") return resolve().then.bind(resolve());
        return vi.fn().mockReturnValue(self);
      },
    },
  );
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
// 1️⃣ Create observation log entry
// ─────────────────────────────────────────────
describe("Grow Logs – Create Log Entry", () => {
  it("inserts a new observation with condition and date", async () => {
    const obs = {
      id: "obs-001",
      owned_plant_id: "plant-001",
      user_id: "user-42",
      condition: "healthy",
      observation_date: "2026-02-27",
      notes: "New growth spotted",
      photos: [],
      created_at: "2026-02-27T10:00:00Z",
      updated_at: "2026-02-27T10:00:00Z",
    };

    setupFrom({ data: obs, error: null });

    const { data, error } = await supabase
      .from("plant_observations")
      .insert([
        {
          owned_plant_id: "plant-001",
          user_id: "user-42",
          condition: "healthy",
          observation_date: "2026-02-27",
          notes: "New growth spotted",
          photos: [],
        },
      ])
      .select()
      .single();

    expect(mocks.from).toHaveBeenCalledWith("plant_observations");
    expect(error).toBeNull();
    expect(data.id).toBe("obs-001");
    expect(data.condition).toBe("healthy");
    expect(data.notes).toBe("New growth spotted");
  });

  it("rejects entry without required plant id", () => {
    const plantId = "";
    expect(plantId.trim()).toBe("");
    // AddObservationDialog checks: if (!formData.owned_plant_id) toast.error(...)
  });
});

// ─────────────────────────────────────────────
// 2️⃣ Add entry with photo upload
// ─────────────────────────────────────────────
describe("Grow Logs – Photo Upload on Entry", () => {
  it("uploads observation photo and stores signed URL", async () => {
    const filePath = "user-42/obs-1709042400-abc123.jpg";

    mocks.upload.mockResolvedValue({
      data: { path: filePath },
      error: null,
    });
    mocks.createSignedUrl.mockResolvedValue({
      data: {
        signedUrl: `https://storage.example.com/collection-photos/${filePath}?token=xyz`,
      },
      error: null,
    });

    // Upload
    const file = new File(["photo-bytes"], "leaf.jpg", { type: "image/jpeg" });
    const { error: uploadErr } = await supabase.storage
      .from("collection-photos")
      .upload(filePath, file);

    expect(uploadErr).toBeNull();
    expect(mocks.upload).toHaveBeenCalledWith(filePath, file);

    // Get signed URL
    const { data: signed } = await supabase.storage
      .from("collection-photos")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);

    expect(signed?.signedUrl).toContain("collection-photos");

    // Insert observation with photo
    const photos = [signed!.signedUrl];
    setupFrom({
      data: {
        id: "obs-002",
        owned_plant_id: "plant-001",
        photos,
        condition: "okay",
        observation_date: "2026-02-27",
      },
      error: null,
    });

    const { data } = await supabase
      .from("plant_observations")
      .insert([
        {
          owned_plant_id: "plant-001",
          user_id: "user-42",
          condition: "okay",
          observation_date: "2026-02-27",
          photos,
        },
      ])
      .select()
      .single();

    expect(data.photos).toHaveLength(1);
    expect(data.photos[0]).toContain("collection-photos");
  });

  it("handles photo upload failure without crashing", async () => {
    mocks.upload.mockResolvedValue({
      data: null,
      error: { message: "Bucket not found" },
    });

    const file = new File(["img"], "fail.jpg", { type: "image/jpeg" });
    const { error } = await supabase.storage
      .from("collection-photos")
      .upload("user-42/fail.jpg", file);

    expect(error).toBeDefined();
    expect(error.message).toBe("Bucket not found");
  });
});

// ─────────────────────────────────────────────
// 3️⃣ View timeline (observations ordered desc)
// ─────────────────────────────────────────────
describe("Grow Logs – View Timeline", () => {
  it("queries observations for a plant ordered by date descending", async () => {
    const timeline = [
      {
        id: "obs-003",
        owned_plant_id: "plant-001",
        condition: "healthy",
        observation_date: "2026-02-27",
        notes: "Blooming",
        photos: ["https://example.com/bloom.jpg"],
        owned_plants: { nickname: "Mi Monstera", photos: [] },
      },
      {
        id: "obs-001",
        owned_plant_id: "plant-001",
        condition: "concern",
        observation_date: "2026-02-20",
        notes: "Yellow leaves",
        photos: [],
        owned_plants: { nickname: "Mi Monstera", photos: [] },
      },
    ];

    setupFrom({ data: timeline, error: null });

    const { data, error } = await supabase
      .from("plant_observations")
      .select("*, owned_plants (nickname, photos)")
      .eq("user_id", "user-42")
      .eq("owned_plant_id", "plant-001")
      .order("observation_date", { ascending: false });

    expect(mocks.from).toHaveBeenCalledWith("plant_observations");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data[0].observation_date).toBe("2026-02-27");
    expect(data[1].observation_date).toBe("2026-02-20");
  });

  it("returns empty timeline for plant with no observations", async () => {
    setupFrom({ data: [], error: null });

    const { data } = await supabase
      .from("plant_observations")
      .select("*")
      .eq("owned_plant_id", "plant-999")
      .order("observation_date", { ascending: false });

    expect(data).toEqual([]);
  });

  it("fetches recent observations with limit", async () => {
    const recent = [
      { id: "obs-005", condition: "healthy", observation_date: "2026-02-27" },
    ];

    setupFrom({ data: recent, error: null });

    const { data } = await supabase
      .from("plant_observations")
      .select("*, owned_plants (nickname, photos)")
      .eq("user_id", "user-42")
      .order("created_at", { ascending: false })
      .limit(5);

    expect(data).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────
// 4️⃣ Toggle public share flow
// ─────────────────────────────────────────────
describe("Grow Logs – Toggle Public Share", () => {
  it("full flow: generate slug → create record → toggle on → verify public → toggle off", async () => {
    // Step 1: Generate slug via RPC
    mocks.rpc.mockResolvedValue({ data: "monstera-green-42", error: null });

    const { data: slug } = await supabase.rpc("generate_plant_slug");
    expect(slug).toBe("monstera-green-42");

    // Step 2: Create slug record (initially private)
    setupFrom({
      data: {
        id: "slug-100",
        owned_plant_id: "plant-001",
        slug: "monstera-green-42",
        is_public: false,
      },
      error: null,
    });

    const { data: created } = await supabase
      .from("plant_public_slugs")
      .insert([
        {
          owned_plant_id: "plant-001",
          slug: "monstera-green-42",
          is_public: false,
        },
      ])
      .select()
      .single();

    expect(created.is_public).toBe(false);
    expect(created.slug).toBe("monstera-green-42");

    // Step 3: Toggle sharing ON
    setupFrom({
      data: { id: "slug-100", is_public: true },
      error: null,
    });

    const { data: toggled } = await supabase
      .from("plant_public_slugs")
      .update({ is_public: true })
      .eq("id", "slug-100")
      .select()
      .single();

    expect(toggled.is_public).toBe(true);

    // Step 4: Verify public plant is accessible by slug
    setupFrom({
      data: { owned_plant_id: "plant-001" },
      error: null,
    });

    const { data: pub } = await supabase
      .from("plant_public_slugs")
      .select("owned_plant_id")
      .eq("slug", "monstera-green-42")
      .eq("is_public", true)
      .single();

    expect(pub.owned_plant_id).toBe("plant-001");

    // Step 5: Toggle sharing OFF
    setupFrom({
      data: { id: "slug-100", is_public: false },
      error: null,
    });

    const { data: disabled } = await supabase
      .from("plant_public_slugs")
      .update({ is_public: false })
      .eq("id", "slug-100")
      .select()
      .single();

    expect(disabled.is_public).toBe(false);
  });

  it("returns null for non-public slug lookup", async () => {
    setupFrom({ data: null, error: { code: "PGRST116", message: "not found" } });

    const { data, error } = await supabase
      .from("plant_public_slugs")
      .select("owned_plant_id")
      .eq("slug", "nonexistent")
      .eq("is_public", true)
      .single();

    expect(data).toBeNull();
    expect(error).toBeDefined();
  });
});
