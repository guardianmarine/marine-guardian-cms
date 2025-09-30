import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Users, 
  AlertCircle,
  Download,
  Loader2,
  Code
} from 'lucide-react';
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
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface InsightMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  rows?: any[];
  chart_suggestion?: 'bar' | 'line';
  explanation?: string;
  timestamp: Date;
}

export default function Insights() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<InsightMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    { label: 'Top combos (90d)', prompt: 'What are the top selling combinations in the last 90 days?' },
    { label: 'Slow movers (90+ d)', prompt: 'Show units on lot for more than 90 days' },
    { label: 'Leads lost reasons', prompt: 'What are the main reasons leads were lost?' },
    { label: 'Repeat buyers', prompt: 'Show repeat buyers and what they buy' },
    { label: 'Rep performance (MTD)', prompt: 'Sales rep performance this month' },
  ];

  const handleSubmit = async (question: string) => {
    if (!question.trim() || !user) return;

    const userMessage: InsightMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('insights-query', {
        body: { 
          question,
          role: user.role,
        }
      });

      if (error) throw error;

      const assistantMessage: InsightMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.explanation || 'Here are your results:',
        sql: data.sql,
        rows: data.rows,
        chart_suggestion: data.chart_suggestion,
        explanation: data.explanation,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Insights error:', error);
      toast.error('Failed to get insights. Please try again.');
      
      const errorMessage: InsightMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I encountered an error processing your question. Please try rephrasing or use one of the quick prompts.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (rows: any[]) => {
    if (!rows || rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insights-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChart = (message: InsightMessage) => {
    if (!message.rows || message.rows.length === 0) return null;

    const chartConfig = {
      value: { label: 'Value', color: 'hsl(var(--chart-1))' }
    };

    if (message.chart_suggestion === 'bar') {
      return (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={message.rows.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={Object.keys(message.rows[0])[0]} 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey={Object.keys(message.rows[0])[1]} 
                fill="var(--color-value)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      );
    }

    if (message.chart_suggestion === 'line') {
      return (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={message.rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={Object.keys(message.rows[0])[0]} 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey={Object.keys(message.rows[0])[1]} 
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

  const renderTable = (rows: any[]) => {
    if (!rows || rows.length === 0) return null;

    const headers = Object.keys(rows[0]);

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
              {rows.map((row, idx) => (
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

  return (
    <PermissionGuard allowedRoles={['admin', 'finance', 'sales']}>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-2">
            Ask questions about your data in natural language
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-240px)] flex flex-col">
              <CardHeader>
                <CardTitle>Conversation</CardTitle>
                <CardDescription>
                  Ask questions and get data-driven answers
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                {/* Messages */}
                <ScrollArea className="flex-1 pr-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Sparkles className="h-12 w-12 mb-4 opacity-50" />
                      <p>Start by asking a question or using a quick prompt</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map(message => (
                        <div key={message.id} className="space-y-3">
                          <div className={`flex items-start gap-3 ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}>
                            <div className={`rounded-lg px-4 py-2 max-w-[80%] ${
                              message.role === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>
                          </div>

                          {message.role === 'assistant' && message.rows && (
                            <div className="space-y-4 ml-12">
                              {/* Chart */}
                              {message.chart_suggestion && renderChart(message)}

                              {/* Table */}
                              {renderTable(message.rows)}

                              {/* SQL */}
                              {message.sql && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2">
                                    <Code className="h-3 w-3" />
                                    View SQL
                                  </summary>
                                  <pre className="mt-2 p-3 bg-muted rounded-lg overflow-x-auto">
                                    <code>{message.sql}</code>
                                  </pre>
                                </details>
                              )}

                              {/* Export */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportToCSV(message.rows!)}
                                className="gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Export CSV
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(input);
                      }
                    }}
                    placeholder="Ask a question about your data..."
                    disabled={loading}
                  />
                  <Button 
                    onClick={() => handleSubmit(input)}
                    disabled={loading || !input.trim()}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Prompts Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Prompts</CardTitle>
                <CardDescription>Common analytics queries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickPrompts.map((prompt, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => handleSubmit(prompt.prompt)}
                    disabled={loading}
                  >
                    <div>
                      <div className="font-medium">{prompt.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {prompt.prompt}
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  AI Insights uses natural language processing to answer your questions using read-only database views.
                </p>
                <Separator />
                <div>
                  <Badge variant="secondary" className="mb-2">Your Access</Badge>
                  <p className="text-xs">
                    {user?.role === 'finance' || user?.role === 'admin' 
                      ? 'You have access to profitability and cost data.'
                      : 'You have access to sales and inventory data.'}
                  </p>
                </div>
                <Separator />
                <p className="text-xs">
                  All queries are logged for audit purposes. The exact SQL used is shown for reproducibility.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
