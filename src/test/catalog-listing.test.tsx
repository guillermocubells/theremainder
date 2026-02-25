import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { Plant } from "@/data/plants";

// ---------- mocks ----------
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: "es", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

// Prevent PlantSearchEngine's useAISearch from triggering effect loops
vi.mock("@/hooks/useAISearch", () => ({
  useAISearch: (_query: string, plants: Plant[]) => ({
    filteredPlants: plants,
    detectedPostalCode: null,
    climateInfo: null,
    sortedByViability: [],
  }),
  isCareQuery: () => false,
}));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    currency: "EUR",
    setCurrency: vi.fn(),
    formatPrice: (price: number) => `€${price.toFixed(2)}`,
    convertPrice: (price: number) => price,
    rates: {},
    loading: false,
  }),
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makePlant(overrides: Partial<Plant> & { id: string; name: string }): Plant {
  return {
    variety: "",
    quantity: 5,
    commonName: overrides.name,
    description: "",
    link: "",
    location: "",
    light: "Soleada",
    growthRate: "Medio",
    notes: "",
    price: 10,
    ...overrides,
  };
}

const mockPlants: Plant[] = Array.from({ length: 30 }, (_, i) =>
  makePlant({
    id: `plant-${i + 1}`,
    name: `Planta ${i + 1}`,
    plantGroup: i % 3 === 0 ? "Palmeras" : i % 3 === 1 ? "Helechos arbóreos" : "Cícadas",
    price: 10 + i,
  }),
);

vi.mock("@/hooks/useCatalogPlants", () => ({
  useCatalogPlants: () => ({
    plants: mockPlants,
    loading: false,
    error: null,
  }),
}));

import PlantsGrid from "@/components/PlantsGrid";

function renderGrid() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <MemoryRouter>
            <PlantsGrid />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe("PlantsGrid – Listing & Pagination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the correct total count", async () => {
    renderGrid();
    await waitFor(() => {
      expect(screen.getByText(/30 plantas/)).toBeInTheDocument();
    });
  });

  it("displays pagination info (page 1 of 3)", async () => {
    renderGrid();
    await waitFor(() => {
      expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument();
    });
  });

  it("navigates to next page", async () => {
    renderGrid();
    await waitFor(() => screen.getByLabelText("Go to next page"));
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Go to next page"));
    });
    await waitFor(() => {
      expect(screen.getByText(/Página 2 de 3/)).toBeInTheDocument();
    });
  });

  it("navigates back to previous page", async () => {
    renderGrid();
    await waitFor(() => screen.getByLabelText("Go to next page"));
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Go to next page"));
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Go to previous page"));
    });
    await waitFor(() => {
      expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument();
    });
  });

  it("previous button is disabled on first page", async () => {
    renderGrid();
    await waitFor(() => {
      expect(screen.getByLabelText("Go to previous page").className).toContain("pointer-events-none");
    });
  });

  it("next button is disabled on last page", async () => {
    renderGrid();
    await waitFor(() => screen.getByLabelText("Go to next page"));
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Go to next page")); // 2
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Go to next page")); // 3
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Go to next page").className).toContain("pointer-events-none");
    });
  });

  it("clicking a page number navigates directly", async () => {
    renderGrid();
    await waitFor(() => screen.getByRole("link", { name: "3" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "3" }));
    });
    await waitFor(() => {
      expect(screen.getByText(/Página 3 de 3/)).toBeInTheDocument();
    });
  });

  it("does not show empty state when plants exist", async () => {
    renderGrid();
    await waitFor(() => {
      expect(screen.queryByText("No se encontraron plantas")).not.toBeInTheDocument();
    });
  });
});
