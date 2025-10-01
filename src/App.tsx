import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthNavigationInjector } from "@/components/AuthNavigationInjector";
import { AppThemeProvider } from "@/theme/useAppTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import UnitDetail from "./pages/UnitDetail";
import SellTrade from "./pages/SellTrade";
import RequestUnit from "./pages/RequestUnit";
import RequestAUnit from "./pages/RequestAUnit";
import Login from "./pages/Login";
import Forgot from "./pages/Forgot";
import Reset from "./pages/auth/Reset";
import SetPassword from "./pages/auth/SetPassword";
import Callback from "./pages/auth/Callback";
import NoAccess from "./pages/NoAccess";
import Dashboard from "./pages/backoffice/Dashboard";
import MediaLibrary from "./pages/backoffice/MediaLibrary";
import HomeEditor from "./pages/backoffice/HomeEditor";
import InventoryAdmin from "./pages/backoffice/InventoryAdmin";
import UnitForm from "./pages/backoffice/UnitForm";
import BuyerRequests from "./pages/backoffice/BuyerRequests";
import InboundRequests from "./pages/backoffice/crm/InboundRequests";
import Suppliers from "./pages/backoffice/purchasing/Suppliers";
import PurchaseIntakes from "./pages/backoffice/purchasing/PurchaseIntakes";
import AcquisitionBatches from "./pages/backoffice/purchasing/AcquisitionBatches";
import Accounts from "./pages/backoffice/crm/Accounts";
import AccountForm from "./pages/backoffice/crm/AccountForm";
import AccountDetail from "./pages/backoffice/crm/AccountDetail";
import Contacts from "./pages/backoffice/crm/Contacts";
import Leads from "./pages/backoffice/crm/Leads";
import LeadDetail from "./pages/backoffice/crm/LeadDetail";
import Opportunities from "./pages/backoffice/crm/Opportunities";
import OpportunityDetail from "./pages/backoffice/crm/OpportunityDetail";
import OpportunityKanban from "./pages/backoffice/crm/OpportunityKanban";
import MyTasks from "./pages/backoffice/crm/MyTasks";
import Deals from "./pages/backoffice/deals/Deals";
import DealDetail from "./pages/backoffice/deals/DealDetail";
import TaxRegimes from "./pages/backoffice/deals/TaxRegimes";
import FinanceDashboard from "./pages/backoffice/finance/FinanceDashboard";
import FinanceOverview from "./pages/backoffice/finance/FinanceOverview";
import Commissions from "./pages/backoffice/finance/Commissions";
import CommissionsReport from "./pages/backoffice/finance/CommissionsReport";
import Insights from "./pages/backoffice/Insights";
import UsersRoles from "./pages/admin/settings/UsersRoles";
import Profile from "./pages/backoffice/Profile";
import NotFound from "./pages/NotFound";
import "@/i18n/config";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <AuthNavigationInjector />
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
              path="/unit/:idOrSlug"
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
            <Route
              path="/request-a-unit"
              element={
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1">
                    <RequestAUnit />
                  </main>
                  <Footer />
                </div>
              }
            />

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/auth/reset" element={<Reset />} />
            <Route path="/auth/set-password" element={<SetPassword />} />
            <Route path="/auth/callback" element={<Callback />} />
            <Route path="/no-access" element={<NoAccess />} />
            
            {/* Legacy route - redirect to /login */}
            <Route path="/backoffice/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
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
                  <RoleGuard allowedRoles={['admin', 'inventory']}>
                    <MediaLibrary />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/content"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['admin', 'inventory']}>
                    <HomeEditor />
                  </RoleGuard>
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
                  <RoleGuard allowedRoles={['admin', 'inventory']}>
                    <UnitForm />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/inventory/:id"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['admin', 'inventory']}>
                    <UnitForm />
                  </RoleGuard>
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
                  <RoleGuard allowedRoles={['admin', 'inventory']}>
                    <Suppliers />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/purchasing/intakes"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['admin', 'inventory']}>
                    <PurchaseIntakes />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/purchasing/batches"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['admin', 'inventory']}>
                    <AcquisitionBatches />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            
            {/* CRM Routes */}
            <Route path="/crm/inbound-requests" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><InboundRequests /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/inbound-requests" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><InboundRequests /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/accounts" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales','finance','inventory','viewer']}><Accounts /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/accounts/new" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><AccountForm /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/accounts/:id/edit" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><AccountForm /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/accounts/:id" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales','finance','inventory','viewer']}><AccountDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/contacts" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales','finance','inventory','viewer']}><Contacts /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/leads" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><Leads /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/leads/:id" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><LeadDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/opportunities" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><Opportunities /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/opportunities/kanban" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><OpportunityKanban /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/opportunities/:id" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><OpportunityDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/tasks" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><MyTasks /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/inbound-requests" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><InboundRequests /></RoleGuard></ProtectedRoute>} />

            {/* Deals & Finance Routes */}
            <Route path="/backoffice/deals" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales','finance']}><Deals /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/deals/new" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales']}><DealDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/deals/:id" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','sales','finance']}><DealDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/deals/tax-regimes" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','finance']}><TaxRegimes /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/finance/dashboard" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','finance']}><FinanceDashboard /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/finance/overview" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','finance']}><FinanceOverview /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/finance/commissions" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','finance','sales']}><Commissions /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/finance/commissions-report" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','finance','sales']}><CommissionsReport /></RoleGuard></ProtectedRoute>} />
            
            {/* Insights Route */}
            <Route path="/backoffice/insights" element={<ProtectedRoute><RoleGuard allowedRoles={['admin','finance','sales']}><Insights /></RoleGuard></ProtectedRoute>} />

            {/* Admin Settings Routes */}
            <Route path="/admin/settings/users" element={<ProtectedRoute><RoleGuard allowedRoles={['admin']}><UsersRoles /></RoleGuard></ProtectedRoute>} />

            {/* Profile Route */}
            <Route path="/backoffice/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </AppThemeProvider>
  </QueryClientProvider>
);

export default App;
