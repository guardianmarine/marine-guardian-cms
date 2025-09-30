import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { InsightsQuickstart } from '@/components/analytics/InsightsQuickstart';
import { QueryTemplate } from '@/lib/insights-templates';

export default function Insights() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<QueryTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [results, setResults] = useState<{
    sql?: string;
    rows?: any[];
    chart_suggestion?: 'bar' | 'line';
    explanation?: string;
  } | undefined>();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      // For now, use hardcoded templates from insights-templates.ts
      // In production, this could come from an API endpoint
      const { getTemplates } = await import('@/lib/insights-templates');
      const allTemplates = getTemplates();
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load query templates');
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleQuery = async (templateId: string, params: Record<string, any>) => {
    if (!user) return;

    setLoading(true);
    setResults(undefined);

    try {
      const { data, error } = await supabase.functions.invoke('insights-query', {
        body: { 
          template_id: templateId,
          params,
          role: user.role,
        }
      });

      if (error) throw error;

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from insights API');
      }

      setResults({
        sql: data.sql,
        rows: Array.isArray(data.rows) ? data.rows : [],
        chart_suggestion: data.chart_suggestion,
        explanation: data.explanation || 'Query executed successfully',
      });
    } catch (error) {
      console.error('Insights error:', error);
      toast.error('Failed to execute query. Please check that database views are set up correctly.');
      
      setResults({
        explanation: 'Query failed. Please ensure database views are configured correctly or contact your administrator.',
        rows: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingTemplates) {
    return (
      <PermissionGuard allowedRoles={['admin', 'finance', 'sales']}>
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading insights templates...</p>
            </div>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allowedRoles={['admin', 'finance', 'sales']}>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-2">
            Ask questions about your data using predefined templates
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <InsightsQuickstart
              templates={templates}
              onQuery={handleQuery}
              loading={loading}
              results={results}
            />
          </div>

          {/* Info Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  AI Insights uses predefined query templates to analyze your data using read-only database views.
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {templates.length > 0 ? (
                    templates.map(template => (
                      <div key={template.id} className="text-xs">
                        <div className="font-medium">{template.description}</div>
                        <div className="text-muted-foreground">
                          {template.rolesAllowed.join(', ')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No templates available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
