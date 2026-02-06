import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/i18n";

// ── Mocks ────────────────────────────────────────────────
// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}));

// Mock useAuth
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

// Cart state mock
let mockCartItems: any[] = [];
const mockClearCart = vi.fn();
const mockSetIsCartOpen = vi.fn();

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    items: mockCartItems,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    getItemQuantity: vi.fn(() => 0),
    getTotalItems: () => mockCartItems.reduce((sum: number, i: any) => sum + i.quantity, 0),
    getTotalPrice: () => mockCartItems.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0),
    clearCart: mockClearCart,
    isCartOpen: false,
    setIsCartOpen: mockSetIsCartOpen,
  }),
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  calculateTax: (price: number) => price - price / 1.21,
}));

// Mock useShippingQuote
const mockQuote = {
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

// Mock useOwnedPlants for CheckoutSuccess
vi.mock("@/hooks/collection/useOwnedPlants", () => ({
  useOwnedPlants: () => ({ data: [], isLoading: false }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Stripe
vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckoutProvider: ({ children }: any) => <div data-testid="stripe-provider">{children}</div>,
  EmbeddedCheckout: () => <div data-testid="stripe-checkout">Stripe Checkout</div>,
}));
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}));

// ── Imports after mocks ──────────────────────────────────
import Checkout from "@/pages/Checkout";
import CheckoutSuccess from "@/pages/CheckoutSuccess";

const SAMPLE_ITEM = {
  plantId: "rhopalostylis-sapida",
  name: "Rhopalostylis sapida",
  quantity: 1,
  maxQuantity: 5,
  price: 85,
  image: "/img/plant.jpg",
  containerSize: "C-10",
};

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderCheckout = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <Checkout />
        </I18nextProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

const renderSuccess = (sessionId = "cs_test_abc123") =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[`/checkout/success?session_id=${sessionId}`]}>
        <I18nextProvider i18n={i18n}>
          <CheckoutSuccess />
        </I18nextProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

// ── Tests ────────────────────────────────────────────────

describe("Checkout — empty cart", () => {
  beforeEach(() => {
    mockCartItems = [];
    mockShippingQuote = null;
    mockIsQuoteLoading = false;
  });

  it("shows empty cart message when no items", () => {
    renderCheckout();
    // Should show shopping bag icon and empty message
    expect(screen.getByRole("link", { name: /seguir comprando|continue/i })).toBeInTheDocument();
  });
});

describe("Checkout — with items", () => {
  beforeEach(() => {
    mockCartItems = [SAMPLE_ITEM];
    mockShippingQuote = mockQuote;
    mockIsQuoteLoading = false;
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
  });

  it("renders checkout title and back link", () => {
    renderCheckout();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/volver|back/i).length).toBeGreaterThan(0);
  });

  it("shows order summary with product details", () => {
    renderCheckout();
    expect(screen.getAllByText(/Rhopalostylis sapida/i).length).toBeGreaterThan(0);
  });

  it("starts on the shipping step", () => {
    renderCheckout();
    // Step 1 should be active — the shipping step heading should exist
    const shippingHeadings = screen.getAllByText(/destino|shipping/i);
    expect(shippingHeadings.length).toBeGreaterThan(0);
  });

  it("shows step continue button", () => {
    renderCheckout();
    const continueButtons = screen.getAllByRole("button", { name: /continuar|continue/i });
    expect(continueButtons.length).toBeGreaterThan(0);
  });
});

describe("Checkout — form validation", () => {
  beforeEach(() => {
    mockCartItems = [SAMPLE_ITEM];
    mockShippingQuote = mockQuote;
    mockIsQuoteLoading = false;
  });

  it("advances from shipping step when quote is supported", async () => {
    const { container } = renderCheckout();
    // Find and click the continue button inside the active (shipping) step
    const buttons = screen.getAllByRole("button", { name: /continuar|continue/i });
    fireEvent.click(buttons[0]);
    // After click, the contact step should become active
    await waitFor(() => {
      const emailInput = container.querySelector('input[id="email"]');
      expect(emailInput).toBeInTheDocument();
    });
  });

  it("shows error on invalid email", async () => {
    const { container } = renderCheckout();
    // Advance to contact step
    fireEvent.click(screen.getAllByRole("button", { name: /continuar|continue/i })[0]);

    await waitFor(() => {
      expect(container.querySelector('input[id="email"]')).toBeInTheDocument();
    });

    // Leave email empty and try to continue
    fireEvent.click(screen.getAllByRole("button", { name: /continuar|continue/i })[0]);

    // Should show error text
    await waitFor(() => {
      const errorElements = container.querySelectorAll('.text-destructive');
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("advances from contact step with valid email", async () => {
    const { container } = renderCheckout();
    // Step 1 → Step 2
    fireEvent.click(screen.getAllByRole("button", { name: /continuar|continue/i })[0]);

    await waitFor(() => {
      expect(container.querySelector('input[id="email"]')).toBeInTheDocument();
    });

    // Fill email
    const emailInput = container.querySelector('input[id="email"]') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    // Continue
    fireEvent.click(screen.getAllByRole("button", { name: /continuar|continue/i })[0]);

    // Should advance to address step
    await waitFor(() => {
      expect(container.querySelector('input[id="fullName"]')).toBeInTheDocument();
    });
  });

  it("validates required address fields", async () => {
    const { container } = renderCheckout();

    // Step 1 → 2
    fireEvent.click(screen.getAllByRole("button", { name: /continuar|continue/i })[0]);
    await waitFor(() => expect(container.querySelector('input[id="email"]')).toBeInTheDocument());

    // Step 2 → 3
    const emailInput = container.querySelector('input[id="email"]') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "a@b.com" } });
    fireEvent.click(screen.getAllByRole("button", { name: /continuar|continue/i })[0]);
    await waitFor(() => expect(container.querySelector('input[id="fullName"]')).toBeInTheDocument());

    // Try to continue without filling address
    fireEvent.click(screen.getAllByRole("button", { name: /continuar|continue/i })[0]);

    // Should show validation errors rendered in the DOM
    await waitFor(() => {
      const errorElements = container.querySelectorAll('.text-destructive');
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });
});

describe("Checkout — full flow", () => {
  beforeEach(() => {
    mockCartItems = [SAMPLE_ITEM];
    mockShippingQuote = mockQuote;
    mockIsQuoteLoading = false;
    vi.clearAllMocks();
  });

  it("completes all steps up to payment", async () => {
    const { container } = renderCheckout();

    // Step 1: Shipping → continue
    fireEvent.click(screen.getAllByRole("button", { name: /continuar|continue/i })[0]);
    await waitFor(() => expect(container.querySelector('input[id="email"]')).toBeInTheDocument());

    // Step 2: Contact
    fireEvent.change(container.querySelector('input[id="email"]')!, { target: { value: "test@test.com" } });
    fireEvent.click(screen.getAllByRole("button", { name: /continuar|continue/i })[0]);
    await waitFor(() => expect(container.querySelector('input[id="fullName"]')).toBeInTheDocument());

    // Step 3: Address — fill all required fields
    fireEvent.change(container.querySelector('input[id="fullName"]')!, { target: { value: "Juan García" } });
    fireEvent.change(container.querySelector('input[id="street"]')!, { target: { value: "Calle Mayor 1" } });
    fireEvent.change(container.querySelector('input[id="postalCode"]')!, { target: { value: "28001" } });
    fireEvent.change(container.querySelector('input[id="city"]')!, { target: { value: "Madrid" } });
    fireEvent.change(container.querySelector('input[id="province"]')!, { target: { value: "Madrid" } });
    fireEvent.click(screen.getAllByRole("button", { name: /continuar|continue/i })[0]);

    // Step 4: Notes — should have a continue to payment button
    await waitFor(() => {
      const paymentBtns = screen.getAllByRole("button", { name: /pago|payment|continuar/i });
      expect(paymentBtns.length).toBeGreaterThan(0);
    });
  });
});

describe("Checkout — shipping quote loading", () => {
  it("disables continue when quote is loading", () => {
    mockCartItems = [SAMPLE_ITEM];
    mockShippingQuote = null;
    mockIsQuoteLoading = true;

    renderCheckout();
    const continueBtn = screen.getAllByRole("button", { name: /continuar|continue|cargando/i })[0];
    expect(continueBtn).toBeDisabled();
  });

  it("disables continue when country not supported", () => {
    mockCartItems = [SAMPLE_ITEM];
    mockShippingQuote = { ...mockQuote, supported: false };
    mockIsQuoteLoading = false;

    renderCheckout();
    const continueBtn = screen.getAllByRole("button", { name: /continuar|continue/i })[0];
    expect(continueBtn).toBeDisabled();
  });
});

describe("Checkout — multiple items", () => {
  it("renders all items in order summary", () => {
    mockCartItems = [
      SAMPLE_ITEM,
      {
        plantId: "brahea-armata",
        name: "Brahea armata",
        quantity: 2,
        maxQuantity: 3,
        price: 150,
        image: "/img/brahea.jpg",
        containerSize: "C-25",
      },
    ];
    mockShippingQuote = mockQuote;

    renderCheckout();
    expect(screen.getAllByText(/Rhopalostylis sapida/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Brahea armata/i).length).toBeGreaterThan(0);
  });
});

describe("CheckoutSuccess", () => {
  beforeEach(() => {
    mockCartItems = [];
    mockClearCart.mockClear();
  });

  it("renders success message and clears cart", () => {
    renderSuccess();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(mockClearCart).toHaveBeenCalled();
  });

  it("shows session ID snippet", () => {
    renderSuccess("cs_test_xyz789");
    expect(screen.getByText(/cs_test_xyz789/i)).toBeInTheDocument();
  });

  it("shows guest prompt when not logged in", () => {
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
    renderSuccess();
    expect(screen.getByText(/crear cuenta|create/i)).toBeInTheDocument();
  });

  it("shows back-to-store link", () => {
    renderSuccess();
    expect(screen.getByRole("link", { name: /volver|back/i })).toBeInTheDocument();
  });
});
