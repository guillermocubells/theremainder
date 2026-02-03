import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import WhatsAppButton from "@/components/WhatsAppButton";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import NotFound from "./pages/NotFound";
import PlantDetail from "./components/PlantDetail";
import Contact from "./pages/Contact";

// Admin pages
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPlants from "./pages/admin/AdminPlants";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminShipping from "./pages/admin/AdminShipping";
import AdminSettings from "./pages/admin/AdminSettings";

// Collection module pages
import { 
  CollectionDashboard, 
  PlantDetailPage, 
  LocationsPage, 
  PublicPlantPage 
} from "./pages/collection";

// Wishlist module pages
import { WishlistDashboard } from "./pages/wishlist";

// Unified Garden module
import { MyGarden, SharedSearchListPage } from "./pages/garden";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/account" element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              } />
              <Route path="/plant/:plantId" element={<PlantDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* Mi Jardín - Unified Garden module */}
              <Route path="/garden" element={
                <ProtectedRoute>
                  <MyGarden />
                </ProtectedRoute>
              } />
              
              {/* Legacy routes - redirect to unified garden */}
              <Route path="/collection" element={
                <ProtectedRoute>
                  <MyGarden />
                </ProtectedRoute>
              } />
              <Route path="/collection/plant/:id" element={
                <ProtectedRoute>
                  <PlantDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/collection/locations" element={
                <ProtectedRoute>
                  <LocationsPage />
                </ProtectedRoute>
              } />
              
              {/* Wishlist route - redirect to unified garden */}
              <Route path="/account/wishlist" element={
                <ProtectedRoute>
                  <MyGarden />
                </ProtectedRoute>
              } />
              
              {/* Public plant page (no auth required) */}
              <Route path="/p/:slug" element={<PublicPlantPage />} />
              
              {/* Public shared search list (no auth required) */}
              <Route path="/garden/shared/:slug" element={<SharedSearchListPage />} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="plants" element={<AdminPlants />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="shipping" element={<AdminShipping />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* WhatsApp floating button - change phoneNumber to your actual number */}
            <WhatsAppButton phoneNumber="34912345678" />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
