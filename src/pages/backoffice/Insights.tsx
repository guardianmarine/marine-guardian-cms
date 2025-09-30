import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays } from 'date-fns';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Clock, AlertCircle, Loader2, CalendarIcon, Download, Info, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightData {
  title: string;
  description: string;
  explanation: string;
  table: Array<Record<string, any>>;
  chart?: Array<Record<string, any>>;
}

type QuickChipType = 'topCombos' | 'slowMovers' | 'leadsLost' | 'repeatBuyers' | 'repPerformance';

export default function Insights() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<Record<string, InsightData>>({});
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 90),
    to: new Date(),
  });
  const [limit, setLimit] = useState(25);
  const [activeChip, setActiveChip] = useState<QuickChipType | null>(null);
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const canViewProfitability = user?.role === 'finance' || user?.role === 'admin';

  useEffect(() => {
    loadInsights();
  }, [dateRange, limit]);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch all data we need in parallel (no SQL, just client queries)
      const [
        { data: deals, error: dealsError },
        { data: opportunities, error: oppsError },
        { data: units, error: unitsError },
        { data: accounts, error: accountsError },
        { data: leads, error: leadsError },
      ] = await Promise.all([
        supabase.from('deals').select('*').gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('opportunities').select('*').gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('units').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('leads').select('*').gte('created_at', startDate).lte('created_at', endDate),
      ]);

      if (dealsError || oppsError || unitsError || accountsError || leadsError) {
        console.error('Data fetch errors:', { dealsError, oppsError, unitsError, accountsError, leadsError });
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
          .slice(0, limit);

        insightsData.topPerformers = {
          title: t('insights.topPerformers.title'),
          description: t('insights.topPerformers.description'),
          explanation: t('insights.topPerformers.explanation'),
          table: topReps.map((r: any) => ({
            'Sales Rep': r.rep,
            'Deals': r.count,
            'Total Value': `$${r.total.toLocaleString()}`,
            _sortValue: r.total,
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
          title: t('insights.pipeline.title'),
          description: t('insights.pipeline.description'),
          explanation: t('insights.pipeline.explanation'),
          table: pipeline.map((p: any) => ({
            'Stage': p.stage,
            'Count': p.count,
            'Est. Value': `$${p.value.toLocaleString()}`,
            _sortValue: p.value,
          })),
          chart: pipeline.map((p: any) => ({
            name: p.stage,
            value: p.value,
          })),
        };
      }

      // 3. Slow Moving Inventory
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
          .slice(0, limit);

        insightsData.slowMovers = {
          title: t('insights.slowMovers.title'),
          description: t('insights.slowMovers.description'),
          explanation: t('insights.slowMovers.explanation'),
          table: slowMovers.map((u: any) => ({
            'Unit': u.unit,
            'Days on Lot': u.days,
            'Status': u.status,
            _sortValue: u.days,
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
          title: t('insights.turnover.title'),
          description: t('insights.turnover.description'),
          explanation: t('insights.turnover.explanation'),
          table: avgTurnover.map((t: any) => ({
            'Category': t.name,
            'Avg Days': t.value,
            _sortValue: t.value,
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
              _sortValue: data.total,
            };
          })
          .sort((a, b) => b.Purchases - a.Purchases)
          .slice(0, limit);

        insightsData.repeatCustomers = {
          title: t('insights.repeatCustomers.title'),
          description: t('insights.repeatCustomers.description'),
          explanation: t('insights.repeatCustomers.explanation'),
          table: repeatCustomers,
        };
      }

      // 5. Leads Lost Reasons
      if (leads && leads.length > 0) {
        const lostLeads = leads.filter((l: any) => l.status === 'disqualified' && l.lost_reason);
        const reasonCounts = lostLeads.reduce((acc: any, lead: any) => {
          const reason = lead.lost_reason || 'Unknown';
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {});

        const leadsLostReasons = Object.entries(reasonCounts)
          .map(([reason, count]) => ({
            'Reason': reason,
            'Count': count,
            _sortValue: count,
          }))
          .sort((a, b) => (b.Count as number) - (a.Count as number))
          .slice(0, limit);

        insightsData.leadsLost = {
          title: 'Leads Lost Reasons',
          description: 'Why we\'re losing leads',
          explanation: 'Understand the main reasons leads are lost to improve your sales process and address common objections.',
          table: leadsLostReasons,
          chart: leadsLostReasons.slice(0, 5).map((r: any) => ({
            name: r.Reason,
            value: r.Count,
          })),
        };
      }

      setInsights(insightsData);
    } catch (err) {
      console.error('Error loading insights:', err);
      setError(t('insights.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickChip = (chip: QuickChipType) => {
    setActiveChip(chip);
    
    switch (chip) {
      case 'topCombos':
      case 'repPerformance':
        setDateRange({ from: subDays(new Date(), 90), to: new Date() });
        break;
      case 'slowMovers':
        // Show all slow movers regardless of date
        setDateRange({ from: subDays(new Date(), 365), to: new Date() });
        break;
      case 'leadsLost':
      case 'repeatBuyers':
        setDateRange({ from: subDays(new Date(), 180), to: new Date() });
        break;
    }
  };

  const exportToCSV = (insightKey: string) => {
    const insight = insights[insightKey];
    if (!insight || !insight.table.length) return;

    const headers = Object.keys(insight.table[0]).filter(k => !k.startsWith('_'));
    const rows = insight.table.map(row => 
      headers.map(h => {
        const val = row[h];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      })
    );

    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${insightKey}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSort = (insightKey: string, columnKey: string) => {
    const insight = insights[insightKey];
    if (!insight) return;

    const newDirection = sortConfig?.key === columnKey && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key: columnKey, direction: newDirection });

    const sortedTable = [...insight.table].sort((a, b) => {
      const aVal = a._sortValue !== undefined ? a._sortValue : a[columnKey];
      const bVal = b._sortValue !== undefined ? b._sortValue : b[columnKey];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return newDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return newDirection === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    setInsights(prev => ({
      ...prev,
      [insightKey]: { ...insight, table: sortedTable }
    }));
  };

  const renderInsightCard = (insightKey: string) => {
    const insight = insights[insightKey];
    if (!insight) return null;

    return (
      <Card key={insightKey}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {insightKey === 'topPerformers' && <TrendingUp className="h-5 w-5" />}
                {insightKey === 'pipeline' && <Users className="h-5 w-5" />}
                {insightKey === 'slowMovers' && <Clock className="h-5 w-5" />}
                {insightKey === 'turnover' && <TrendingUp className="h-5 w-5" />}
                {insightKey === 'repeatCustomers' && <Users className="h-5 w-5" />}
                {insightKey === 'leadsLost' && <AlertCircle className="h-5 w-5" />}
                {insight.title}
              </CardTitle>
              <CardDescription>{insight.description}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExplanation(prev => ({ ...prev, [insightKey]: !prev[insightKey] }))}
              >
                <Info className="h-4 w-4 mr-2" />
                {showExplanation[insightKey] ? t('insights.hideExplanation') : t('insights.showExplanation')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(insightKey)}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('insights.exportCSV')}
              </Button>
            </div>
          </div>
          {showExplanation[insightKey] && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>{insight.explanation}</AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chart */}
          {insight.chart && insight.chart.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insight.chart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          {insight.table.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    {Object.keys(insight.table[0]).filter(k => !k.startsWith('_')).map((key) => (
                      <th 
                        key={key} 
                        className="px-4 py-2 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                        onClick={() => handleSort(insightKey, key)}
                      >
                        <div className="flex items-center gap-2">
                          {key}
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {insight.table.map((row, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/50">
                      {Object.entries(row).filter(([k]) => !k.startsWith('_')).map(([key, val], i) => (
                        <td key={i} className="px-4 py-2 text-sm">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('insights.noData')} - {t('insights.noDataDescription')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <BackofficeLayout>
      <PermissionGuard allowedRoles={['sales', 'finance', 'admin']}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">{t('insights.title')}</h2>
              <p className="text-muted-foreground">{t('insights.subtitle')}</p>
            </div>
            <Button onClick={loadInsights} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('insights.loading')}
                </>
              ) : (
                t('insights.refreshData')
              )}
            </Button>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap gap-4 items-center p-4 bg-card border rounded-lg">
            {/* Date Range Picker */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('insights.dateRange')}:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, 'PPP')} - {format(dateRange.to, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                    >
                      {t('insights.last30Days')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                    >
                      {t('insights.last90Days')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDateRange({ from: subDays(new Date(), 180), to: new Date() })}
                    >
                      {t('insights.last180Days')}
                    </Button>
                  </div>
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range: any) => range?.from && range?.to && setDateRange({ from: range.from, to: range.to })}
                    numberOfMonths={2}
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Limit Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('insights.limit')}:</span>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Chips */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeChip === 'topCombos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickChip('topCombos')}
            >
              {t('insights.quickChips.topCombos')}
            </Button>
            <Button
              variant={activeChip === 'slowMovers' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickChip('slowMovers')}
            >
              {t('insights.quickChips.slowMovers')}
            </Button>
            <Button
              variant={activeChip === 'leadsLost' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickChip('leadsLost')}
            >
              {t('insights.quickChips.leadsLost')}
            </Button>
            <Button
              variant={activeChip === 'repeatBuyers' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickChip('repeatBuyers')}
            >
              {t('insights.quickChips.repeatBuyers')}
            </Button>
            <Button
              variant={activeChip === 'repPerformance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickChip('repPerformance')}
            >
              {t('insights.quickChips.repPerformance')}
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
              <TabsTrigger value="sales">{t('insights.tabs.sales')}</TabsTrigger>
              <TabsTrigger value="inventory">{t('insights.tabs.inventory')}</TabsTrigger>
              <TabsTrigger value="customers">{t('insights.tabs.customers')}</TabsTrigger>
              {canViewProfitability && (
                <TabsTrigger value="profitability" disabled>
                  {t('insights.tabs.profitability')}
                  <Badge variant="outline" className="ml-2">{t('insights.tabs.comingSoon')}</Badge>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Sales Tab */}
            <TabsContent value="sales" className="space-y-4">
              {renderInsightCard('topPerformers')}
              {renderInsightCard('pipeline')}
              {renderInsightCard('leadsLost')}
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4">
              {renderInsightCard('slowMovers')}
              {renderInsightCard('turnover')}
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-4">
              {renderInsightCard('repeatCustomers')}
            </TabsContent>

            {/* Profitability Tab (Placeholder) */}
            {canViewProfitability && (
              <TabsContent value="profitability">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {t('insights.tabs.profitability')}
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
