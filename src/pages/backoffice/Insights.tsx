import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays } from 'date-fns';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, Loader2, CalendarIcon, Download, Info, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { insightTemplates, InsightResult } from '@/modules/insights/templates';
import { exportToCSV, getDefaultDateRange, getDateRangeForDays } from '@/modules/insights/utils';

type TemplateKey = keyof typeof insightTemplates;

export default function Insights() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('top_combos');
  const [result, setResult] = useState<InsightResult | null>(null);
  
  // Use utility for default date range (last 90 days)
  const defaultRange = getDefaultDateRange();
  const [dateRange, setDateRange] = useState({
    from: new Date(defaultRange.dateFrom),
    to: new Date(defaultRange.dateTo),
  });
  const [limit, setLimit] = useState(25);
  const [showExplanation, setShowExplanation] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const locale = (i18n.language === 'es' ? 'es' : 'en') as 'en' | 'es';
  const userRole = user?.role || 'sales';

  // Filter templates by user role
  const availableTemplates = Object.entries(insightTemplates).filter(([_, template]) =>
    template.roles.includes(userRole as any)
  );

  const runTemplate = async (templateKey: TemplateKey) => {
    setLoading(true);
    setResult(null);
    setSortConfig(null);

    try {
      const template = insightTemplates[templateKey];
      if (!template) {
        throw new Error('Template not found');
      }

      const params = {
        dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
        dateTo: format(dateRange.to, 'yyyy-MM-dd'),
        limit,
        locale,
      };

      const data = await template.run(params);
      setResult(data);

      if (data.rows.length === 0) {
        toast({
          title: t('insights.noData'),
          description: t('insights.noDataDescription'),
        });
      }
    } catch (error) {
      console.error('Error running template:', error);
      toast({
        title: t('insights.errorLoading'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      setResult({ rows: [], chart: { type: 'bar', x: '', y: '' }, explanation: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickChip = (templateKey: TemplateKey) => {
    setSelectedTemplate(templateKey);
    
    // Adjust date range based on template using utility
    let range;
    switch (templateKey) {
      case 'top_combos':
      case 'rep_performance':
        range = getDateRangeForDays(90);
        break;
      case 'slow_movers':
        range = getDateRangeForDays(365);
        break;
      case 'lost_reasons':
      case 'repeat_buyers':
        range = getDateRangeForDays(180);
        break;
      default:
        range = getDefaultDateRange();
    }
    
    setDateRange({
      from: new Date(range.dateFrom),
      to: new Date(range.dateTo),
    });
    
    runTemplate(templateKey);
  };

  const handleExportCSV = () => {
    if (!result || !result.rows.length) return;
    exportToCSV(result.rows, selectedTemplate);
  };

  const handleSort = (columnKey: string) => {
    if (!result) return;

    const newDirection = sortConfig?.key === columnKey && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key: columnKey, direction: newDirection });

    const sortedRows = [...result.rows].sort((a, b) => {
      const aVal = a._sortValue !== undefined ? a._sortValue : a[columnKey];
      const bVal = b._sortValue !== undefined ? b._sortValue : b[columnKey];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return newDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return newDirection === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    setResult({ ...result, rows: sortedRows });
  };

  // Map template keys to i18n keys
  const getChipLabel = (key: TemplateKey): string => {
    const mapping: Record<TemplateKey, string> = {
      top_combos: t('insights.quickChips.topCombos'),
      slow_movers: t('insights.quickChips.slowMovers'),
      lost_reasons: t('insights.quickChips.leadsLost'),
      repeat_buyers: t('insights.quickChips.repeatBuyers'),
      rep_performance: t('insights.quickChips.repPerformance'),
    };
    return mapping[key] || key;
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
            <Button onClick={() => runTemplate(selectedTemplate)} disabled={loading}>
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
                <PopoverContent className="w-auto p-0 bg-card z-50" align="start">
                  <div className="p-3 space-y-2 bg-card">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        const range = getDateRangeForDays(30);
                        setDateRange({ from: new Date(range.dateFrom), to: new Date(range.dateTo) });
                      }}
                    >
                      {t('insights.last30Days')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        const range = getDateRangeForDays(90);
                        setDateRange({ from: new Date(range.dateFrom), to: new Date(range.dateTo) });
                      }}
                    >
                      {t('insights.last90Days')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        const range = getDateRangeForDays(180);
                        setDateRange({ from: new Date(range.dateFrom), to: new Date(range.dateTo) });
                      }}
                    >
                      {t('insights.last180Days')}
                    </Button>
                  </div>
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range: any) => range?.from && range?.to && setDateRange({ from: range.from, to: range.to })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Limit Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('insights.limit')}:</span>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="w-[100px] bg-card z-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Template:</span>
              <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as TemplateKey)}>
                <SelectTrigger className="w-[200px] bg-card z-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  {availableTemplates.map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Chips */}
          <div className="flex flex-wrap gap-2">
            {availableTemplates.map(([key]) => {
              const templateKey = key as TemplateKey;
              return (
                <Button
                  key={key}
                  variant={selectedTemplate === templateKey ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickChip(templateKey)}
                >
                  {getChipLabel(templateKey)}
                </Button>
              );
            })}
          </div>

          {/* Results Card */}
          {result && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {insightTemplates[selectedTemplate].label}
                    </CardTitle>
                    {result.explanation && (
                      <CardDescription className="mt-2">{result.explanation}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {result.explanation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExplanation(!showExplanation)}
                      >
                        <Info className="h-4 w-4 mr-2" />
                        {showExplanation ? t('insights.hideExplanation') : t('insights.showExplanation')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      disabled={!result.rows.length}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t('insights.exportCSV')}
                    </Button>
                  </div>
                </div>
                {showExplanation && result.explanation && (
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>{result.explanation}</AlertDescription>
                  </Alert>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Chart */}
                {result.chart && result.rows.length > 0 && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      {result.chart.type === 'bar' ? (
                        <BarChart data={result.rows.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={result.chart.x} />
                          <YAxis />
                          <Tooltip 
                            formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
                          />
                          <Bar dataKey={result.chart.y} fill="hsl(var(--primary))" />
                        </BarChart>
                      ) : (
                        <LineChart data={result.rows.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={result.chart.x} />
                          <YAxis />
                          <Tooltip 
                            formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
                          />
                          <Line type="monotone" dataKey={result.chart.y} stroke="hsl(var(--primary))" />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Table */}
                {result.rows.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            {Object.keys(result.rows[0]).filter(k => !k.startsWith('_')).map((key) => (
                              <th 
                                key={key} 
                                className="px-4 py-2 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                                onClick={() => handleSort(key)}
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
                          {result.rows.map((row, idx) => (
                            <tr key={idx} className="border-t hover:bg-muted/50">
                              {Object.entries(row).filter(([k]) => !k.startsWith('_')).map(([key, val], i) => (
                                <td key={i} className="px-4 py-2 text-sm">
                                  {typeof val === 'number' && key.toLowerCase().includes('revenue') 
                                    ? `$${val.toLocaleString()}`
                                    : String(val ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
          )}

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">{t('insights.loading')}</p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!loading && !result && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Select a template to get started</p>
                <p className="text-sm text-muted-foreground">
                  Choose a quick chip or select a template from the dropdown above
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </PermissionGuard>
    </BackofficeLayout>
  );
}
