import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Sparkles, Download, Code, AlertCircle, TrendingUp } from 'lucide-react';
import { QueryTemplate } from '@/lib/insights-templates';

interface InsightsQuickstartProps {
  templates: QueryTemplate[];
  onQuery: (templateId: string, params: Record<string, any>) => void;
  loading: boolean;
  results?: {
    sql?: string;
    rows?: any[];
    chart_suggestion?: 'bar' | 'line';
    explanation?: string;
  };
}

export function InsightsQuickstart({ templates, onQuery, loading, results }: InsightsQuickstartProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [limit, setLimit] = useState('10');
  const [showSQL, setShowSQL] = useState(false);

  const quickPrompts = [
    { label: 'Top combos (90d)', templateId: 'top_selling_combos' },
    { label: 'Slow movers (90+ d)', templateId: 'slow_movers' },
    { label: 'Leads lost reasons', templateId: 'lost_reasons' },
    { label: 'Repeat buyers', templateId: 'repeat_buyers' },
    { label: 'Rep performance (MTD)', templateId: 'rep_performance' },
  ];

  const handleQuickQuery = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const params: Record<string, any> = {};
    
    // Set default params based on quick prompt
    if (templateId === 'top_selling_combos' || templateId === 'slow_movers') {
      params.days = templateId === 'slow_movers' ? 90 : 90;
    }
    
    if (templateId === 'rep_performance') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      params.start_date = firstDay.toISOString().split('T')[0];
      params.end_date = now.toISOString().split('T')[0];
    }

    onQuery(templateId, params);
  };

  const handleCustomQuery = () => {
    if (!selectedTemplate) return;

    const params: Record<string, any> = {};
    
    if (dateRange.start) params.start_date = dateRange.start;
    if (dateRange.end) params.end_date = dateRange.end;
    if (limit) params.limit = parseInt(limit, 10);

    onQuery(selectedTemplate, params);
  };

  const exportToCSV = () => {
    if (!results?.rows || results.rows.length === 0) return;

    const headers = Object.keys(results.rows[0]);
    const csv = [
      headers.join(','),
      ...results.rows.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insights-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    if (!results?.rows || results.rows.length === 0 || !results.chart_suggestion) return null;

    const chartConfig = {
      value: { label: 'Value', color: 'hsl(var(--chart-1))' }
    };

    if (results.chart_suggestion === 'bar') {
      return (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={results.rows.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={Object.keys(results.rows[0])[0]} 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey={Object.keys(results.rows[0])[1]} 
                fill="var(--color-value)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      );
    }

    if (results.chart_suggestion === 'line') {
      return (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={results.rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={Object.keys(results.rows[0])[0]} 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey={Object.keys(results.rows[0])[1]} 
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-value)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      );
    }

    return null;
  };

  const renderTable = () => {
    if (!results?.rows || results.rows.length === 0) return null;

    const headers = Object.keys(results.rows[0]);

    return (
      <div className="border rounded-lg">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map(header => (
                  <TableHead key={header} className="font-semibold">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.rows.map((row, idx) => (
                <TableRow key={idx}>
                  {headers.map(header => (
                    <TableCell key={header}>
                      {row[header]?.toString() || '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  };

  // Empty state when no templates available
  if (templates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            The insights templates endpoint returned no items. Please ensure the database views are set up correctly or contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Query Builder
          </CardTitle>
          <CardDescription>Select a template and customize parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="limit">Result Limit</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="1000"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="10"
              />
            </div>
            <Button 
              onClick={handleCustomQuery} 
              disabled={!selectedTemplate || loading}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Run Query
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Chips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Queries</CardTitle>
          <CardDescription>Common analytics queries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt.templateId}
                variant="outline"
                size="sm"
                onClick={() => handleQuickQuery(prompt.templateId)}
                disabled={loading || !templates.some(t => t.id === prompt.templateId)}
              >
                {prompt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Area */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Results</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSQL(!showSQL)}
                  className="gap-2"
                >
                  <Code className="h-4 w-4" />
                  {showSQL ? 'Hide SQL' : 'Show SQL'}
                </Button>
                {results.rows && results.rows.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardTitle>
            {results.explanation && (
              <CardDescription>{results.explanation}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SQL Display */}
            {showSQL && results.sql && (
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  <code>{results.sql}</code>
                </pre>
              </div>
            )}

            {/* Chart */}
            {renderChart()}

            {/* Table */}
            {results.rows && results.rows.length > 0 ? (
              renderTable()
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for this query</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!results && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Select a template and run a query, or use one of the quick queries above to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
