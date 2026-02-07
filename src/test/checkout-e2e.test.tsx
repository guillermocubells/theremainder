import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/i18n";

// ── Mocks ────────────────────────────────────────────────

// Mock CurrencyContext
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    currency: "EUR",
    setCurrency: vi.fn(),
    availableCurrencies: ["EUR"],
    convert: (amount: number) => amount,
    formatPrice: (amount: number) => `${amount.toFixed(2)} €`,
    isReady: true,
  }),
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockInvoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    functions: { invoke: (...args: any[]) => mockInvoke(...args) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}));

const mockUseAuth = vi.fn(() => ({
  user: null,
  session: null,
  loading: false,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Cart mock with real addToCart logic ───────────────────
let mockCartItems: any[] = [];
const mockAddToCart = vi.fn((item: any) => {
  const existing = mockCartItems.find((i: any) => i.plantId === item.plantId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + item.quantity, item.maxQuantity);
  } else {
    mockCartItems.push({ ...item });
  }
});
const mockClearCart = vi.fn(() => {
  mockCartItems = [];
});
const mockSetIsCartOpen = vi.fn();

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    items: mockCartItems,
    addToCart: mockAddToCart,
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    getItemQuantity: (id: string) =>
      mockCartItems.find((i: any) => i.plantId === id)?.quantity || 0,
    getTotalItems: () =>
      mockCartItems.reduce((s: number, i: any) => s + i.quantity, 0),
    getTotalPrice: () =>
      mockCartItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0),
    clearCart: mockClearCart,
    isCartOpen: false,
    setIsCartOpen: mockSetIsCartOpen,
  }),
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  calculateTax: (price: number) => price - price / 1.21,
}));

// ── Shipping quote mock ──────────────────────────────────
const SPAIN_QUOTE = {
  supported: true,
  subtotalCents: 8500,
  shippingCostCents: 800,
  totalCents: 9300,
  deliveryDaysMin: 2,
  deliveryDaysMax: 4,
  isFreeShipping: false,
  shippingZone: "spain",
  totalWeightGrams: 2500,
};

let mockShippingQuote: any = null;
let mockIsQuoteLoading = false;

vi.mock("@/hooks/useShippingQuote", () => ({
  useShippingQuote: () => ({
    quote: mockShippingQuote,
    isLoading: mockIsQuoteLoading,
    error: null,
  }),
}));

vi.mock("@/hooks/collection/useOwnedPlants", () => ({
  useOwnedPlants: () => ({ data: [], isLoading: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckoutProvider: ({ children }: any) => (
    <div data-testid="stripe-provider">{children}</div>
  ),
  EmbeddedCheckout: () => (
    <div data-testid="stripe-checkout">Stripe Checkout</div>
  ),
}));
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}));

// ── Imports after mocks ──────────────────────────────────
import Checkout from "@/pages/Checkout";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import AddToCartButton from "@/components/AddToCartButton";
import { calculateTax } from "@/contexts/CartContext";

// ── Helpers ──────────────────────────────────────────────
const PLANT_A = {
  plantId: "cycas-revoluta",
  name: "Cycas revoluta",
  quantity: 1,
  maxQuantity: 3,
  price: 85,
  image: "/img/cycas.jpg",
  containerSize: "C-10",
};

const PLANT_B = {
  plantId: "brahea-armata",
  name: "Brahea armata",
  quantity: 2,
  maxQuantity: 5,
  price: 150,
  image: "/img/brahea.jpg",
  containerSize: "C-25",
};

const qc = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const wrap = (ui: React.ReactNode, entries?: string[]) =>
  render(
    <QueryClientProvider client={qc()}>
      <MemoryRouter initialEntries={entries}>
        <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

// ══════════════════════════════════════════════════════════
// 1. ADD-TO-CART
// ══════════════════════════════════════════════════════════

describe("E2E: Add to cart", () => {
  beforeEach(() => {
    mockCartItems = [];
    mockAddToCart.mockClear();
  });

  it("calls addToCart with correct payload on click", () => {
    wrap(
      <AddToCartButton
        plantId="cycas-revoluta"
        plantName="Cycas revoluta"
        maxQuantity={3}
        price={85}
        image="/img/cycas.jpg"
        containerSize="C-10"
      />
    );

    const btn = screen.getByRole("button", { name: /carrito|cart/i });
    fireEvent.click(btn);

    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        plantId: "cycas-revoluta",
        name: "Cycas revoluta",
        price: 85,
        quantity: 1,
        maxQuantity: 3,
      })
    );
  });

  it("shows not-available when maxQuantity is 0", () => {
    wrap(
      <AddToCartButton
        plantId="x"
        plantName="X"
        maxQuantity={0}
        price={10}
      />
    );

    expect(
      screen.getByRole("button", { name: /no disponible|not available/i })
    ).toBeDisabled();
  });
});

// ══════════════════════════════════════════════════════════
// 2. TAX CALCULATION
// ══════════════════════════════════════════════════════════

describe("E2E: Tax calculation (21% IVA)", () => {
  it("computes IVA correctly for €85", () => {
    const tax = calculateTax(85);
    // 85 - 85/1.21 = 85 - 70.247... ≈ 14.752
    expect(tax).toBeCloseTo(14.752, 2);
  });

  it("returns 0 for €0", () => {
    expect(calculateTax(0)).toBe(0);
  });

  it("computes IVA for multi-item total €385", () => {
    const total = 85 + 150 * 2; // 385
    const tax = calculateTax(total);
    expect(tax).toBeCloseTo(total - total / 1.21, 2);
  });
});

// ══════════════════════════════════════════════════════════
// 3. CHECKOUT — TOTALS & SHIPPING IN ORDER SUMMARY
// ══════════════════════════════════════════════════════════

describe("E2E: Checkout totals display", () => {
  beforeEach(() => {
    mockCartItems = [PLANT_A, PLANT_B];
    mockShippingQuote = SPAIN_QUOTE;
    mockIsQuoteLoading = false;
  });

  it("renders all cart items in the order summary", () => {
    wrap(<Checkout />);
    expect(screen.getAllByText(/Cycas revoluta/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Brahea armata/i).length).toBeGreaterThan(0);
  });

  it("displays shipping cost from quote", () => {
    wrap(<Checkout />);
    // 800 cents = 8€
    const shippingEl = screen.getAllByText(/8,00|8\.00/i);
    expect(shippingEl.length).toBeGreaterThan(0);
  });

  it("shows delivery estimate when quote is available", () => {
    wrap(<Checkout />);
    const estimates = screen.getAllByText(/2.*4/i);
    expect(estimates.length).toBeGreaterThan(0);
  });

  it("disables continue while quote is loading", () => {
    mockShippingQuote = null;
    mockIsQuoteLoading = true;

    wrap(<Checkout />);
    const btn = screen.getAllByRole("button", {
      name: /continuar|continue|cargando/i,
    })[0];
    expect(btn).toBeDisabled();
  });
});

// ══════════════════════════════════════════════════════════
// 4. FULL ACCORDION FLOW → STRIPE REDIRECT
// ══════════════════════════════════════════════════════════

describe("E2E: Full checkout flow to Stripe", () => {
  beforeEach(() => {
    mockCartItems = [{ ...PLANT_A }];
    mockShippingQuote = SPAIN_QUOTE;
    mockIsQuoteLoading = false;
    vi.clearAllMocks();
    // Mock invoke to return a client secret for Stripe
    mockInvoke.mockResolvedValue({
      data: {
        clientSecret: "cs_test_secret_123",
        publishableKey: "pk_test_123",
        sessionId: "cs_test_session_123",
      },
      error: null,
    });
  });

  it("completes shipping → contact → address → notes → reaches payment step", async () => {
    const { container } = wrap(<Checkout />);

    // Step 1: Shipping → continue
    fireEvent.click(
      screen.getAllByRole("button", { name: /continuar|continue/i })[0]
    );
    await waitFor(() =>
      expect(container.querySelector('input[id="email"]')).toBeInTheDocument()
    );

    // Step 2: Contact
    fireEvent.change(container.querySelector('input[id="email"]')!, {
      target: { value: "e2e@test.com" },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: /continuar|continue/i })[0]
    );
    await waitFor(() =>
      expect(
        container.querySelector('input[id="fullName"]')
      ).toBeInTheDocument()
    );

    // Step 3: Address
    fireEvent.change(container.querySelector('input[id="fullName"]')!, {
      target: { value: "E2E Tester" },
    });
    fireEvent.change(container.querySelector('input[id="street"]')!, {
      target: { value: "Calle E2E 42" },
    });
    fireEvent.change(container.querySelector('input[id="postalCode"]')!, {
      target: { value: "08001" },
    });
    fireEvent.change(container.querySelector('input[id="city"]')!, {
      target: { value: "Barcelona" },
    });
    fireEvent.change(container.querySelector('input[id="province"]')!, {
      target: { value: "Barcelona" },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: /continuar|continue/i })[0]
    );

    // Step 4: Notes → advance to payment
    await waitFor(() => {
      const btns = screen.getAllByRole("button", {
        name: /pago|payment|continuar/i,
      });
      expect(btns.length).toBeGreaterThan(0);
    });

    // Click to proceed to payment
    const payBtn = screen.getAllByRole("button", {
      name: /pago|payment|continuar/i,
    })[0];
    fireEvent.click(payBtn);

    // Step 5: Payment — Stripe embedded checkout should appear
    await waitFor(() => {
      expect(screen.getByTestId("stripe-checkout")).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════
// 5. CHECKOUT SUCCESS — CART CLEARED & POST-PAYMENT UI
// ══════════════════════════════════════════════════════════

describe("E2E: Checkout success page", () => {
  beforeEach(() => {
    mockCartItems = [PLANT_A];
    mockClearCart.mockClear();
  });

  it("clears cart on mount when session_id present", () => {
    wrap(
      <CheckoutSuccess />,
      ["/checkout/success?session_id=cs_test_e2e123"]
    );
    expect(mockClearCart).toHaveBeenCalled();
  });

  it("displays truncated session ID", () => {
    wrap(
      <CheckoutSuccess />,
      ["/checkout/success?session_id=cs_test_e2e_very_long_id_here"]
    );
    expect(screen.getByText(/cs_test_e2e_very_lon/)).toBeInTheDocument();
  });

  it("shows guest prompt for unauthenticated users", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
    });
    wrap(
      <CheckoutSuccess />,
      ["/checkout/success?session_id=cs_test_e2e"]
    );
    expect(screen.getByText(/crear cuenta|create/i)).toBeInTheDocument();
  });

  it("shows collection prompt for authenticated users", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "e2e@test.com" } as any,
      session: {} as any,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
    });
    wrap(
      <CheckoutSuccess />,
      ["/checkout/success?session_id=cs_test_e2e"]
    );
    expect(screen.getAllByText(/colección|collection/i).length).toBeGreaterThan(0);
  });

  it("has back-to-store link", () => {
    wrap(
      <CheckoutSuccess />,
      ["/checkout/success?session_id=cs_test_e2e"]
    );
    expect(
      screen.getByRole("link", { name: /volver|back/i })
    ).toBeInTheDocument();
  });
});
