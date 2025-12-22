import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { AuthProvider } from "@/contexts/AuthContext";
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
import HomeHeroCMS from "./pages/backoffice/cms/HomeHeroCMS";
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
import ContactDetail from "./pages/backoffice/crm/ContactDetail";
import Leads from "./pages/backoffice/crm/Leads";
import LeadDetail from "./pages/backoffice/crm/LeadDetail";
import Opportunities from "./pages/backoffice/crm/Opportunities";
import OpportunityDetail from "./pages/backoffice/crm/OpportunityDetail";
import OpportunityKanban from "./pages/backoffice/crm/OpportunityKanban";
import MyTasks from "./pages/backoffice/crm/MyTasks";
import MyTasksV2 from "./pages/backoffice/crm/MyTasksV2";
import Deals from "./pages/backoffice/deals/Deals";
import NewDeal from "./pages/backoffice/deals/NewDeal";
import DealDetail from "./pages/backoffice/deals/DealDetail";
import TaxRegimes from "./pages/backoffice/deals/TaxRegimes";
import DealsV2 from "./pages/backoffice/deals/DealsV2";
import TaxPresetsManager from "./pages/backoffice/deals/TaxPresetsManager";
import DealDetailEditor from "./pages/backoffice/deals/DealDetailEditor";
import LeadsProbe from "./pages/backoffice/admin/LeadsProbe";
import FinanceDashboard from "./pages/backoffice/finance/FinanceDashboard";
import FinanceOverview from "./pages/backoffice/finance/FinanceOverview";
import Commissions from "./pages/backoffice/finance/Commissions";
import CommissionsReport from "./pages/backoffice/finance/CommissionsReport";
import PACFund from "./pages/backoffice/finance/PACFund";
import Insights from "./pages/backoffice/Insights";
import UsersRoles from "./pages/admin/settings/UsersRoles";
import UserManagement from "./pages/admin/settings/UserManagement";
import PermissionsMatrix from "./pages/admin/settings/PermissionsMatrix";
import Profile from "./pages/backoffice/Profile";
import SupabaseDebug from "./pages/backoffice/SupabaseDebug";
import NotFound from "./pages/NotFound";
import "@/i18n/config";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
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
                  <RoleGuard module="media" allowedRoles={['admin', 'inventory']}>
                    <MediaLibrary />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/cms/home-hero"
              element={
                <ProtectedRoute>
                  <RoleGuard module="cms" allowedRoles={['admin', 'inventory']}>
                    <HomeHeroCMS />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/content"
              element={
                <ProtectedRoute>
                  <RoleGuard module="cms" allowedRoles={['admin', 'inventory']}>
                    <HomeEditor />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/inventory"
              element={
                <ProtectedRoute>
                  <RoleGuard module="inventory">
                    <InventoryAdmin />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/inventory/new"
              element={
                <ProtectedRoute>
                  <RoleGuard module="inventory" action="create" allowedRoles={['admin', 'inventory']}>
                    <UnitForm />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/inventory/:id"
              element={
                <ProtectedRoute>
                  <RoleGuard module="inventory" action="edit" allowedRoles={['admin', 'inventory']}>
                    <UnitForm />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/buyer-requests"
              element={
                <ProtectedRoute>
                  <RoleGuard module="crm_inbound">
                    <BuyerRequests />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/purchasing/suppliers"
              element={
                <ProtectedRoute>
                  <RoleGuard module="purchasing" allowedRoles={['admin', 'inventory']}>
                    <Suppliers />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/purchasing/intakes"
              element={
                <ProtectedRoute>
                  <RoleGuard module="purchasing" allowedRoles={['admin', 'inventory']}>
                    <PurchaseIntakes />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backoffice/purchasing/batches"
              element={
                <ProtectedRoute>
                  <RoleGuard module="purchasing" allowedRoles={['admin', 'inventory']}>
                    <AcquisitionBatches />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            
            {/* CRM Routes */}
            <Route path="/crm/inbound-requests" element={<ProtectedRoute><RoleGuard module="crm_inbound" allowedRoles={['admin','sales']}><InboundRequests /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/inbound-requests" element={<ProtectedRoute><RoleGuard module="crm_inbound" allowedRoles={['admin','sales']}><InboundRequests /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/accounts" element={<ProtectedRoute><RoleGuard module="crm_accounts" allowedRoles={['admin','sales','finance','inventory','viewer']}><Accounts /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/accounts/new" element={<ProtectedRoute><RoleGuard module="crm_accounts" action="create" allowedRoles={['admin','sales']}><AccountForm /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/accounts/:id/edit" element={<ProtectedRoute><RoleGuard module="crm_accounts" action="edit" allowedRoles={['admin','sales']}><AccountForm /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/accounts/:id" element={<ProtectedRoute><RoleGuard module="crm_accounts" allowedRoles={['admin','sales','finance','inventory','viewer']}><AccountDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/contacts" element={<ProtectedRoute><RoleGuard module="crm_contacts" allowedRoles={['admin','sales','finance','inventory','viewer']}><Contacts /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/contacts/:id" element={<ProtectedRoute><RoleGuard module="crm_contacts" allowedRoles={['admin','sales','finance','inventory','viewer']}><ContactDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/leads" element={<ProtectedRoute><RoleGuard module="crm_leads" allowedRoles={['admin','sales']}><Leads /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/leads/:id" element={<ProtectedRoute><RoleGuard module="crm_leads" allowedRoles={['admin','sales']}><LeadDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/opportunities" element={<ProtectedRoute><RoleGuard module="crm_opportunities" allowedRoles={['admin','sales']}><Opportunities /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/opportunities/kanban" element={<ProtectedRoute><RoleGuard module="crm_opportunities" allowedRoles={['admin','sales']}><OpportunityKanban /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/opportunities/:id" element={<ProtectedRoute><RoleGuard module="crm_opportunities" allowedRoles={['admin','sales']}><OpportunityDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/tasks" element={<ProtectedRoute><RoleGuard module="crm_tasks" allowedRoles={['admin','sales']}><MyTasks /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/my-tasks-v2" element={<ProtectedRoute><RoleGuard module="crm_tasks" allowedRoles={['admin','sales']}><MyTasksV2 /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/crm/inbound-requests" element={<ProtectedRoute><RoleGuard module="crm_inbound" allowedRoles={['admin','sales']}><InboundRequests /></RoleGuard></ProtectedRoute>} />

            {/* Deals & Finance Routes */}
            <Route path="/backoffice/deals" element={<ProtectedRoute><RoleGuard module="deals" allowedRoles={['admin','sales','finance']}><Deals /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/deals/new" element={<ProtectedRoute><RoleGuard module="deals" action="create" allowedRoles={['admin','sales']}><NewDeal /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/deals/:id" element={<ProtectedRoute><RoleGuard module="deals" allowedRoles={['admin','sales','finance']}><DealDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/deals/tax-regimes" element={<ProtectedRoute><RoleGuard module="tax_presets" allowedRoles={['admin','finance']}><TaxRegimes /></RoleGuard></ProtectedRoute>} />
            
            {/* Deals V2 (Supabase) */}
            <Route path="/backoffice/deals-v2" element={<ProtectedRoute><RoleGuard module="deals" allowedRoles={['admin','sales','finance']}><DealsV2 /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/deals-v2/new" element={<ProtectedRoute><RoleGuard module="deals" action="create" allowedRoles={['admin','sales']}><DealDetailEditor /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/deals-v2/:id" element={<ProtectedRoute><RoleGuard module="deals" allowedRoles={['admin','sales','finance']}><DealDetailEditor /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/deals-v2/tax-presets" element={<ProtectedRoute><RoleGuard module="tax_presets" allowedRoles={['admin','finance']}><TaxPresetsManager /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/finance/dashboard" element={<ProtectedRoute><RoleGuard module="finance_dashboard" allowedRoles={['admin','finance']}><FinanceDashboard /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/finance/overview" element={<ProtectedRoute><RoleGuard module="finance_overview" allowedRoles={['admin','finance']}><FinanceOverview /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/finance/commissions" element={<ProtectedRoute><RoleGuard module="commissions" allowedRoles={['admin','finance','sales']}><Commissions /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/finance/commissions-report" element={<ProtectedRoute><RoleGuard module="commissions" allowedRoles={['admin','finance','sales']}><CommissionsReport /></RoleGuard></ProtectedRoute>} />
            <Route path="/backoffice/finance/pac-fund" element={<ProtectedRoute><RoleGuard module="pac_fund" allowedRoles={['admin']}><PACFund /></RoleGuard></ProtectedRoute>} />
            
            {/* Insights Route */}
            <Route path="/backoffice/insights" element={<ProtectedRoute><RoleGuard module="insights" allowedRoles={['admin','finance','sales']}><Insights /></RoleGuard></ProtectedRoute>} />

            {/* Admin Settings Routes */}
            <Route path="/admin/settings/users" element={<ProtectedRoute><RoleGuard module="admin_users" allowedRoles={['admin']}><UserManagement /></RoleGuard></ProtectedRoute>} />
            <Route path="/admin/settings/permissions" element={<ProtectedRoute><RoleGuard module="admin_users" allowedRoles={['admin']}><PermissionsMatrix /></RoleGuard></ProtectedRoute>} />
            <Route path="/admin/settings/users-legacy" element={<ProtectedRoute><RoleGuard module="admin_users" allowedRoles={['admin']}><UsersRoles /></RoleGuard></ProtectedRoute>} />
            <Route path="/admin/debug/supabase" element={<ProtectedRoute><RoleGuard module="admin_users" allowedRoles={['admin']}><SupabaseDebug /></RoleGuard></ProtectedRoute>} />
            <Route path="/admin/debug/leads-probe" element={<ProtectedRoute><RoleGuard module="admin_users" allowedRoles={['admin']}><LeadsProbe /></RoleGuard></ProtectedRoute>} />

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
