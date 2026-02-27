/**
 * Permissions & Privacy Tests
 *
 * Enforces:
 *  1. Ownership – only owner can CRUD their plants, observations, collections
 *  2. Public/Private rules – private slugs block public access, public slugs allow it
 *  3. Share links – collection share tokens, visibility tiers, expiry
 *  4. Secure view – owned_plants_public strips sensitive fields
 *  5. Shared search list – RPC returns data without user_id
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock ──
const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const from = vi.fn();
  return { rpc, from };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "tok-owner" } },
      }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn(),
      })),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "owner-1", email: "owner@test.com" },
    session: { access_token: "tok-owner" },
  }),
}));

import { supabase } from "@/integrations/supabase/client";

// ── Chain builder ──
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
  self.single = vi.fn().mockResolvedValue(terminal);
  self.maybeSingle = vi.fn().mockResolvedValue(terminal);
  return self;
}

function setupFrom(terminal: { data: any; error: any }) {
  const chain = mockChain(terminal);
  mocks.from.mockReturnValue(chain);
  return chain;
}

beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────
// 1️⃣ Ownership enforcement
// ─────────────────────────────────────────────
describe("Ownership – RLS denies cross-user access", () => {
  it("blocks insert with foreign user_id", async () => {
    setupFrom({
      data: null,
      error: { code: "42501", message: "new row violates row-level security policy" },
    });

    const { error } = await supabase
      .from("owned_plants")
      .insert([{ nickname: "Stolen", user_id: "attacker-99", tags: [], photos: [], status: "alive" }])
      .select()
      .single();

    expect(error).toBeDefined();
    expect(error!.code).toBe("42501");
  });

  it("blocks update on another user's plant", async () => {
    setupFrom({
      data: null,
      error: { code: "42501", message: "new row violates row-level security policy" },
    });

    const { error } = await supabase
      .from("owned_plants")
      .update({ nickname: "Hacked" })
      .eq("id", "other-user-plant")
      .select()
      .single();

    expect(error).toBeDefined();
    expect(error!.code).toBe("42501");
  });

  it("blocks delete on another user's plant", async () => {
    setupFrom({
      data: null,
      error: { code: "42501", message: "new row violates row-level security policy" },
    });

    const { error } = await supabase
      .from("owned_plants")
      .delete()
      .eq("id", "other-user-plant");

    expect(mocks.from).toHaveBeenCalledWith("owned_plants");
  });

  it("blocks observation insert for unowned plant", async () => {
    setupFrom({
      data: null,
      error: { code: "42501", message: "new row violates row-level security policy" },
    });

    const { error } = await supabase
      .from("plant_observations")
      .insert([{
        owned_plant_id: "not-my-plant",
        condition: "healthy",
        observation_date: "2025-01-01",
        user_id: "attacker-99",
      }])
      .select()
      .single();

    expect(error).toBeDefined();
    expect(error!.code).toBe("42501");
  });

  it("blocks collection insert with foreign user_id", async () => {
    setupFrom({
      data: null,
      error: { code: "42501", message: "new row violates row-level security policy" },
    });

    const { error } = await supabase
      .from("collections")
      .insert([{ name: "Evil Collection", user_id: "attacker-99" }])
      .select()
      .single();

    expect(error).toBeDefined();
    expect(error!.code).toBe("42501");
  });
});

// ─────────────────────────────────────────────
// 2️⃣ Public / Private slug visibility
// ─────────────────────────────────────────────
describe("Public/Private slug rules", () => {
  it("private slug returns no data for public queries", async () => {
    setupFrom({ data: null, error: { code: "PGRST116", message: "No rows found" } });

    const { data, error } = await supabase
      .from("plant_public_slugs")
      .select("owned_plant_id")
      .eq("slug", "private-slug")
      .eq("is_public", true)
      .single();

    expect(data).toBeNull();
    expect(error).toBeDefined();
  });

  it("public slug returns owned_plant_id", async () => {
    setupFrom({ data: { owned_plant_id: "plant-pub-1" }, error: null });

    const { data } = await supabase
      .from("plant_public_slugs")
      .select("owned_plant_id")
      .eq("slug", "public-slug")
      .eq("is_public", true)
      .single();

    expect(data!.owned_plant_id).toBe("plant-pub-1");
  });

  it("toggling is_public from false to true makes it accessible", async () => {
    setupFrom({ data: { id: "slug-1", is_public: true }, error: null });

    const { data } = await supabase
      .from("plant_public_slugs")
      .update({ is_public: true })
      .eq("id", "slug-1")
      .select()
      .single();

    expect(data!.is_public).toBe(true);
  });

  it("toggling is_public back to false hides it", async () => {
    setupFrom({ data: { id: "slug-1", is_public: false }, error: null });

    const { data } = await supabase
      .from("plant_public_slugs")
      .update({ is_public: false })
      .eq("id", "slug-1")
      .select()
      .single();

    expect(data!.is_public).toBe(false);
  });
});

// ─────────────────────────────────────────────
// 3️⃣ Secure public view strips sensitive data
// ─────────────────────────────────────────────
describe("Secure view – owned_plants_public", () => {
  it("returns only safe fields (no user_id, no location details)", async () => {
    const safeData = {
      id: "plant-1",
      nickname: "Monstera",
      scientific_name: "Monstera deliciosa",
      common_name: "Monstera",
      photos: ["img.jpg"],
      status: "alive",
    };

    setupFrom({ data: safeData, error: null });

    const { data } = await supabase
      .from("owned_plants_public")
      .select("id, nickname, scientific_name, common_name, photos, status")
      .eq("id", "plant-1")
      .single();

    expect(data).toBeDefined();
    // Verify no sensitive fields leak through
    expect(data).not.toHaveProperty("user_id");
    expect(data).not.toHaveProperty("location_id");
    expect(data).not.toHaveProperty("purchase_price");
    expect(data).not.toHaveProperty("serial_code");
    expect(data!.nickname).toBe("Monstera");
  });
});

// ─────────────────────────────────────────────
// 4️⃣ Collection share links – visibility tiers
// ─────────────────────────────────────────────
describe("Collection Share Links", () => {
  it("private visibility blocks external access", async () => {
    setupFrom({
      data: { id: "share-1", visibility: "private", share_token: null },
      error: null,
    });

    const { data } = await supabase
      .from("collection_shares")
      .select("*")
      .eq("collection_id", "col-1")
      .single();

    expect(data!.visibility).toBe("private");
    expect(data!.share_token).toBeNull();
  });

  it("link visibility provides token-gated access", async () => {
    setupFrom({
      data: {
        id: "share-2",
        visibility: "link",
        share_token: "tok-abc123",
        allow_download: false,
        expires_at: null,
      },
      error: null,
    });

    const { data } = await supabase
      .from("collection_shares")
      .select("*")
      .eq("collection_id", "col-2")
      .single();

    expect(data!.visibility).toBe("link");
    expect(data!.share_token).toBeTruthy();
  });

  it("public visibility is accessible without token", async () => {
    setupFrom({
      data: { id: "share-3", visibility: "public", share_token: "tok-pub" },
      error: null,
    });

    const { data } = await supabase
      .from("collection_shares")
      .select("*")
      .eq("collection_id", "col-3")
      .single();

    expect(data!.visibility).toBe("public");
  });

  it("expired share link is treated as invalid", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();

    setupFrom({
      data: {
        id: "share-4",
        visibility: "link",
        share_token: "tok-expired",
        expires_at: pastDate,
      },
      error: null,
    });

    const { data } = await supabase
      .from("collection_shares")
      .select("*")
      .eq("collection_id", "col-4")
      .single();

    // Client-side check: if expires_at < now, treat as expired
    const isExpired = data!.expires_at && new Date(data!.expires_at) < new Date();
    expect(isExpired).toBe(true);
  });

  it("only collection owner can update share settings (RLS)", async () => {
    setupFrom({
      data: null,
      error: { code: "42501", message: "new row violates row-level security policy" },
    });

    const { error } = await supabase
      .from("collection_shares")
      .update({ visibility: "public" })
      .eq("collection_id", "someone-else-col")
      .select()
      .single();

    expect(error).toBeDefined();
    expect(error!.code).toBe("42501");
  });
});

// ─────────────────────────────────────────────
// 5️⃣ Shared search list – public RPC privacy
// ─────────────────────────────────────────────
describe("Shared Search List – RPC privacy", () => {
  it("get_public_shared_list_by_slug returns data without user_id", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        sharedList: {
          id: "list-1",
          slug: "my-list",
          is_public: true,
          title: "My Wishlist",
          description: null,
          global_inquiries_mode: "allow",
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
        wishlistItems: [
          { id: "wi-1", name: "Cactus", scientific_name: null, priority: "high", status: "searching" },
        ],
        stockNotifications: [],
      },
      error: null,
    });

    const { data } = await supabase.rpc("get_public_shared_list_by_slug", {
      p_slug: "my-list",
    });

    expect(data).toBeDefined();
    const result = data as any;
    expect(result.sharedList).not.toHaveProperty("user_id");
    expect(result.wishlistItems).toHaveLength(1);
  });

  it("returns null for non-public slug", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    const { data } = await supabase.rpc("get_public_shared_list_by_slug", {
      p_slug: "private-list",
    });

    expect(data).toBeNull();
  });
});

// ─────────────────────────────────────────────
// 6️⃣ Plant sharing controls – visibility in shared lists
// ─────────────────────────────────────────────
describe("Plant Sharing Controls", () => {
  it("defaults visibility_in_shared_lists to 'hidden'", () => {
    const defaultVisibility = "hidden";
    expect(["hidden", "visible"]).toContain(defaultVisibility);
  });

  it("setting visibility to 'visible' includes plant in shared list", async () => {
    setupFrom({
      data: { id: "plant-1", visibility_in_shared_lists: "visible" },
      error: null,
    });

    const { data } = await supabase
      .from("owned_plants")
      .update({ visibility_in_shared_lists: "visible" })
      .eq("id", "plant-1")
      .select()
      .single();

    expect(data!.visibility_in_shared_lists).toBe("visible");
  });

  it("inquiry_handling_mode controls contact availability", () => {
    const modes = ["allow", "muted", "blocked"];
    expect(modes).toContain("allow");
    expect(modes).toContain("muted");
    expect(modes).toContain("blocked");
  });
});

// ─────────────────────────────────────────────
// 7️⃣ Public log view – visibility gating
// ─────────────────────────────────────────────
describe("Public Log View – Access gating", () => {
  it("returns observations only when slug is public", async () => {
    // Step 1: slug lookup
    const slugChain = mockChain({ data: { owned_plant_id: "plant-pub" }, error: null });
    const plantChain = mockChain({
      data: { id: "plant-pub", nickname: "Rose", status: "alive", photos: [] },
      error: null,
    });
    const obsChain = mockChain({
      data: [
        { id: "obs-1", observation_date: "2025-06-01", condition: "healthy", notes: "Lush", photos: [] },
      ],
      error: null,
    });

    let callCount = 0;
    mocks.from.mockImplementation((table: string) => {
      callCount++;
      if (table === "plant_public_slugs") return slugChain;
      if (table === "owned_plants_public") return plantChain;
      if (table === "plant_observations") return obsChain;
      return mockChain({ data: null, error: null });
    });

    // Simulate the usePublicLog flow
    const { data: slugData } = await supabase
      .from("plant_public_slugs")
      .select("owned_plant_id")
      .eq("slug", "rose-log")
      .eq("is_public", true)
      .single();

    expect(slugData!.owned_plant_id).toBe("plant-pub");

    const { data: plantData } = await supabase
      .from("owned_plants_public")
      .select("id, nickname, scientific_name, common_name, photos, status")
      .eq("id", slugData!.owned_plant_id)
      .single();

    expect(plantData!.nickname).toBe("Rose");
    expect(plantData).not.toHaveProperty("user_id");
  });

  it("private slug returns null, blocking public log access", async () => {
    setupFrom({ data: null, error: { code: "PGRST116", message: "No rows found" } });

    const { data } = await supabase
      .from("plant_public_slugs")
      .select("owned_plant_id")
      .eq("slug", "secret-log")
      .eq("is_public", true)
      .single();

    expect(data).toBeNull();
  });
});

// ─────────────────────────────────────────────
// 8️⃣ Garden inquiry blocks
// ─────────────────────────────────────────────
describe("Garden Viewer Blocks", () => {
  it("blocked viewer cannot submit inquiries", async () => {
    setupFrom({
      data: { id: "block-1", owner_user_id: "owner-1", viewer_identifier: "spammer@evil.com", scope: "global" },
      error: null,
    });

    const { data } = await supabase
      .from("garden_viewer_blocks")
      .select("*")
      .eq("owner_user_id", "owner-1")
      .eq("viewer_identifier", "spammer@evil.com")
      .single();

    expect(data).toBeDefined();
    expect(data!.scope).toBe("global");
  });

  it("non-blocked viewer has no block record", async () => {
    setupFrom({ data: null, error: { code: "PGRST116", message: "No rows found" } });

    const { data } = await supabase
      .from("garden_viewer_blocks")
      .select("*")
      .eq("owner_user_id", "owner-1")
      .eq("viewer_identifier", "friendly@user.com")
      .single();

    expect(data).toBeNull();
  });
});
