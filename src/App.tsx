import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import UnitDetail from "./pages/UnitDetail";
import SellTrade from "./pages/SellTrade";
import RequestUnit from "./pages/RequestUnit";
import Login from "./pages/backoffice/Login";
import Dashboard from "./pages/backoffice/Dashboard";
import MediaLibrary from "./pages/backoffice/MediaLibrary";
import HomeEditor from "./pages/backoffice/HomeEditor";
import InventoryAdmin from "./pages/backoffice/InventoryAdmin";
import UnitForm from "./pages/backoffice/UnitForm";
import BuyerRequests from "./pages/backoffice/BuyerRequests";
import Suppliers from "./pages/backoffice/purchasing/Suppliers";
import PurchaseIntakes from "./pages/backoffice/purchasing/PurchaseIntakes";
import AcquisitionBatches from "./pages/backoffice/purchasing/AcquisitionBatches";
import NotFound from "./pages/NotFound";
import "@/i18n/config";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1">
                    <Home />
                  </main>
                  <Footer />
                </div>
              }
            />
            <Route
              path="/inventory"
              element={
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1">
                    <Inventory />
                  </main>
                  <Footer />
                </div>
              }
            />
            <Route
              path="/inventory/:category/:slug"
              element={
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1">
                    <UnitDetail />
                  </main>
                  <Footer />
                </div>
              }
            />
            <Route
              path="/inventory/:id"
              element={
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1">
                    <UnitDetail />
                  </main>
                  <Footer />
                </div>
              }
            />
            <Route
              path="/sell-trade"
              element={<SellTrade />}
            />
            <Route
              path="/request-unit"
              element={
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1">
                    <RequestUnit />
                  </main>
                  <Footer />
                </div>
              }
            />

            {/* Backoffice Routes */}
            <Route path="/backoffice/login" element={<Login />} />
            <Route
              path="/backoffice"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/media"
              element={
                <ProtectedRoute>
                  <MediaLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/content"
              element={
                <ProtectedRoute>
                  <HomeEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/inventory"
              element={
                <ProtectedRoute>
                  <InventoryAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/inventory/new"
              element={
                <ProtectedRoute>
                  <UnitForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/inventory/:id"
              element={
                <ProtectedRoute>
                  <UnitForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/buyer-requests"
              element={
                <ProtectedRoute>
                  <BuyerRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/purchasing/suppliers"
              element={
                <ProtectedRoute>
                  <Suppliers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/purchasing/intakes"
              element={
                <ProtectedRoute>
                  <PurchaseIntakes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/purchasing/batches"
              element={
                <ProtectedRoute>
                  <AcquisitionBatches />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
