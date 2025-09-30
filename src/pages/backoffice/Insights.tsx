import { useEffect, useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface InsightData {
  title: string;
  description: string;
  table: Array<Record<string, any>>;
  chart?: Array<Record<string, any>>;
}

export default function Insights() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<Record<string, InsightData>>({});

  const canViewProfitability = user?.role === 'finance' || user?.role === 'admin';

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data we need in parallel (no SQL, just client queries)
      const [
        { data: deals, error: dealsError },
        { data: opportunities, error: oppsError },
        { data: units, error: unitsError },
        { data: accounts, error: accountsError },
      ] = await Promise.all([
        supabase.from('deals').select('*'),
        supabase.from('opportunities').select('*'),
        supabase.from('units').select('*'),
        supabase.from('accounts').select('*'),
      ]);

      if (dealsError || oppsError || unitsError || accountsError) {
        throw new Error('Failed to load data');
      }

      // Client-side aggregations
      const insightsData: Record<string, InsightData> = {};

      // 1. Top Performers (Sales)
      if (deals && deals.length > 0) {
        const salesByRep = deals.reduce((acc: any, deal: any) => {
          const rep = deal.sales_rep || 'Unassigned';
          if (!acc[rep]) {
            acc[rep] = { rep, count: 0, total: 0 };
          }
          acc[rep].count += 1;
          acc[rep].total += deal.total_due || 0;
          return acc;
        }, {});

        const topReps = Object.values(salesByRep)
          .sort((a: any, b: any) => b.total - a.total)
          .slice(0, 10);

        insightsData.topPerformers = {
          title: 'Top Sales Performers',
          description: 'Sales representatives ranked by total deal value',
          table: topReps.map((r: any) => ({
            'Sales Rep': r.rep,
            'Deals': r.count,
            'Total Value': `$${r.total.toLocaleString()}`,
          })),
          chart: topReps.slice(0, 5).map((r: any) => ({
            name: r.rep,
            value: r.total,
          })),
        };
      }

      // 2. Opportunity Pipeline
      if (opportunities && opportunities.length > 0) {
        const oppsByStage = opportunities.reduce((acc: any, opp: any) => {
          const stage = opp.stage || 'Unknown';
          if (!acc[stage]) {
            acc[stage] = { stage, count: 0, value: 0 };
          }
          acc[stage].count += 1;
          acc[stage].value += opp.estimated_value || 0;
          return acc;
        }, {});

        const pipeline = Object.values(oppsByStage);

        insightsData.pipeline = {
          title: 'Opportunity Pipeline by Stage',
          description: 'Current opportunities grouped by sales stage',
          table: pipeline.map((p: any) => ({
            'Stage': p.stage,
            'Count': p.count,
            'Est. Value': `$${p.value.toLocaleString()}`,
          })),
          chart: pipeline.map((p: any) => ({
            name: p.stage,
            value: p.value,
          })),
        };
      }

      // 3. Inventory Turnover
      if (units && units.length > 0) {
        const now = new Date();
        const daysOnLot = units.map((unit: any) => {
          const received = new Date(unit.received_at || unit.created_at);
          const days = Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
          return {
            unit: `${unit.year} ${unit.make} ${unit.model}`,
            days,
            status: unit.status,
          };
        });

        const slowMovers = daysOnLot
          .filter((u: any) => u.status === 'published' && u.days > 90)
          .sort((a: any, b: any) => b.days - a.days)
          .slice(0, 10);

        insightsData.slowMovers = {
          title: 'Slow-Moving Inventory (90+ Days)',
          description: 'Units on the lot for over 90 days that need attention',
          table: slowMovers.map((u: any) => ({
            'Unit': u.unit,
            'Days on Lot': u.days,
            'Status': u.status,
          })),
        };

        // Average days by category
        const categoryTurnover = units.reduce((acc: any, unit: any) => {
          const cat = unit.category || 'Unknown';
          const received = new Date(unit.received_at || unit.created_at);
          const days = Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
          
          if (!acc[cat]) {
            acc[cat] = { category: cat, totalDays: 0, count: 0 };
          }
          acc[cat].totalDays += days;
          acc[cat].count += 1;
          return acc;
        }, {});

        const avgTurnover = Object.values(categoryTurnover).map((c: any) => ({
          name: c.category,
          value: Math.round(c.totalDays / c.count),
        }));

        insightsData.turnover = {
          title: 'Average Days on Lot by Category',
          description: 'How quickly different unit types are selling',
          table: avgTurnover.map((t: any) => ({
            'Category': t.name,
            'Avg Days': t.value,
          })),
          chart: avgTurnover,
        };
      }

      // 4. Repeat Customers
      if (accounts && accounts.length > 0 && deals && deals.length > 0) {
        const dealsByAccount = deals.reduce((acc: any, deal: any) => {
          const accId = deal.account_id;
          if (!accId) return acc;
          if (!acc[accId]) {
            acc[accId] = { count: 0, total: 0 };
          }
          acc[accId].count += 1;
          acc[accId].total += deal.total_due || 0;
          return acc;
        }, {});

        const repeatCustomers = Object.entries(dealsByAccount)
          .filter(([_, data]: any) => data.count > 1)
          .map(([accId, data]: any) => {
            const account = accounts.find((a: any) => a.id === accId);
            return {
              'Customer': account?.name || 'Unknown',
              'Purchases': data.count,
              'Total Spent': `$${data.total.toLocaleString()}`,
            };
          })
          .sort((a, b) => b.Purchases - a.Purchases)
          .slice(0, 10);

        insightsData.repeatCustomers = {
          title: 'Top Repeat Customers',
          description: 'Customers with multiple purchases',
          table: repeatCustomers,
        };
      }

      setInsights(insightsData);
    } catch (err) {
      console.error('Error loading insights:', err);
      setError('Failed to load insights. Please check your database connection and permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackofficeLayout>
      <PermissionGuard allowedRoles={['sales', 'finance', 'admin']}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Business Insights</h2>
              <p className="text-muted-foreground">
                Analytics and reports powered by client-side aggregation
              </p>
            </div>
            <Button onClick={loadInsights} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Refresh Data'
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="sales" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              {canViewProfitability && (
                <TabsTrigger value="profitability" disabled>
                  Profitability
                  <Badge variant="outline" className="ml-2">Coming Soon</Badge>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Sales Tab */}
            <TabsContent value="sales" className="space-y-4">
              {insights.topPerformers && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {insights.topPerformers.title}
                    </CardTitle>
                    <CardDescription>{insights.topPerformers.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Chart */}
                    {insights.topPerformers.chart && (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={insights.topPerformers.chart}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                            <Bar dataKey="value" fill="hsl(var(--primary))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            {Object.keys(insights.topPerformers.table[0] || {}).map((key) => (
                              <th key={key} className="px-4 py-2 text-left text-sm font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {insights.topPerformers.table.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {Object.values(row).map((val, i) => (
                                <td key={i} className="px-4 py-2 text-sm">
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {insights.pipeline && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {insights.pipeline.title}
                    </CardTitle>
                    <CardDescription>{insights.pipeline.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Chart */}
                    {insights.pipeline.chart && (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={insights.pipeline.chart}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                            <Bar dataKey="value" fill="hsl(var(--chart-2))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            {Object.keys(insights.pipeline.table[0] || {}).map((key) => (
                              <th key={key} className="px-4 py-2 text-left text-sm font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {insights.pipeline.table.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {Object.values(row).map((val, i) => (
                                <td key={i} className="px-4 py-2 text-sm">
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4">
              {insights.slowMovers && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {insights.slowMovers.title}
                    </CardTitle>
                    <CardDescription>{insights.slowMovers.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            {Object.keys(insights.slowMovers.table[0] || {}).map((key) => (
                              <th key={key} className="px-4 py-2 text-left text-sm font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {insights.slowMovers.table.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {Object.values(row).map((val, i) => (
                                <td key={i} className="px-4 py-2 text-sm">
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {insights.turnover && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {insights.turnover.title}
                    </CardTitle>
                    <CardDescription>{insights.turnover.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Chart */}
                    {insights.turnover.chart && (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={insights.turnover.chart}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${value} days`} />
                            <Bar dataKey="value" fill="hsl(var(--chart-3))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            {Object.keys(insights.turnover.table[0] || {}).map((key) => (
                              <th key={key} className="px-4 py-2 text-left text-sm font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {insights.turnover.table.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {Object.values(row).map((val, i) => (
                                <td key={i} className="px-4 py-2 text-sm">
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-4">
              {insights.repeatCustomers && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {insights.repeatCustomers.title}
                    </CardTitle>
                    <CardDescription>{insights.repeatCustomers.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            {Object.keys(insights.repeatCustomers.table[0] || {}).map((key) => (
                              <th key={key} className="px-4 py-2 text-left text-sm font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {insights.repeatCustomers.table.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {Object.values(row).map((val, i) => (
                                <td key={i} className="px-4 py-2 text-sm">
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Profitability Tab (Placeholder) */}
            {canViewProfitability && (
              <TabsContent value="profitability">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Profitability Analysis
                    </CardTitle>
                    <CardDescription>
                      Coming soon: Margin analysis, cost tracking, and profit reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This feature is under development and will be available soon.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </PermissionGuard>
    </BackofficeLayout>
  );
}
