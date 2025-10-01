import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPublishedUnitsQuery } from '@/services/inventoryService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DiagResult {
  count: number | null;
  error: string | null;
  rows: any[];
}

export default function PublicInventoryDiag() {
  const [rawPolicyTest, setRawPolicyTest] = useState<DiagResult>({ count: null, error: null, rows: [] });
  const [serviceHelperTest, setServiceHelperTest] = useState<DiagResult>({ count: null, error: null, rows: [] });
  const [simpleCount, setSimpleCount] = useState<DiagResult>({ count: null, error: null, rows: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      setLoading(true);

      // 1) Raw policy test
      try {
        const q1 = await supabase
          .from('units')
          .select('id, make, model, year, status, published_at, is_published')
          .or('is_published.eq.true,and(published_at.not.is.null,status.in.(available,reserved))')
          .limit(10);

        setRawPolicyTest({
          count: q1.data?.length || 0,
          error: q1.error?.message || null,
          rows: q1.data || [],
        });
      } catch (err: any) {
        setRawPolicyTest({
          count: null,
          error: err.message || 'Unknown error',
          rows: [],
        });
      }

      // 2) Service helper test
      try {
        const q2 = await getPublishedUnitsQuery(supabase).limit(10);

        setServiceHelperTest({
          count: q2.data?.length || 0,
          error: q2.error?.message || null,
          rows: q2.data?.map((u: any) => ({
            id: u.id,
            make: u.make,
            model: u.model,
            year: u.year,
            status: u.status,
            published_at: u.published_at,
            is_published: u.is_published,
          })) || [],
        });
      } catch (err: any) {
        setServiceHelperTest({
          count: null,
          error: err.message || 'Unknown error',
          rows: [],
        });
      }

      // 3) Simple count
      try {
        const q3 = await supabase
          .from('units')
          .select('id', { count: 'exact', head: true })
          .or('is_published.eq.true,and(published_at.not.is.null,status.in.(available,reserved))');

        setSimpleCount({
          count: q3.count || 0,
          error: q3.error?.message || null,
          rows: [],
        });
      } catch (err: any) {
        setSimpleCount({
          count: null,
          error: err.message || 'Unknown error',
          rows: [],
        });
      }

      setLoading(false);
    };

    runDiagnostics();
  }, []);

  const allCountsZero =
    rawPolicyTest.count === 0 && serviceHelperTest.count === 0 && simpleCount.count === 0;

  return (
    <div className="container px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Public Inventory Diagnostics</h1>
        <p className="text-muted-foreground">
          Testing public queries via RLS as anon user. This page helps debug why /inventory might be empty.
        </p>
      </div>

      {loading && <p className="text-center py-12">Running diagnostics...</p>}

      {!loading && allCountsZero && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No published units visible to anon</AlertTitle>
          <AlertDescription>
            Either no units are published, or RLS policies are blocking access. Run the verification SQL
            to check table contents and policies.
          </AlertDescription>
        </Alert>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* Raw Policy Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {rawPolicyTest.error ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                1. Raw Policy Test
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Direct query with OR filter: is_published=true OR (published_at not null AND status in available/reserved)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Count:</span>
                  <span className="ml-2 font-bold">{rawPolicyTest.count ?? 'N/A'}</span>
                </div>
                {rawPolicyTest.error && (
                  <div className="text-destructive text-sm">
                    <strong>Error:</strong> {rawPolicyTest.error}
                  </div>
                )}
              </div>

              {rawPolicyTest.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Make</th>
                        <th className="text-left p-2">Model</th>
                        <th className="text-left p-2">Year</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Published At</th>
                        <th className="text-left p-2">Is Published</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawPolicyTest.rows.map((row) => (
                        <tr key={row.id} className="border-b">
                          <td className="p-2 font-mono text-xs">{row.id.substring(0, 8)}...</td>
                          <td className="p-2">{row.make}</td>
                          <td className="p-2">{row.model}</td>
                          <td className="p-2">{row.year}</td>
                          <td className="p-2">
                            <span className="px-2 py-1 bg-muted rounded text-xs">{row.status}</span>
                          </td>
                          <td className="p-2 text-xs">
                            {row.published_at ? new Date(row.published_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-2">{row.is_published ? '✓' : '✗'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Helper Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {serviceHelperTest.error ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                2. Service Helper Test (getPublishedUnitsQuery)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Using the inventoryService helper function with all columns
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Count:</span>
                  <span className="ml-2 font-bold">{serviceHelperTest.count ?? 'N/A'}</span>
                </div>
                {serviceHelperTest.error && (
                  <div className="text-destructive text-sm">
                    <strong>Error:</strong> {serviceHelperTest.error}
                  </div>
                )}
              </div>

              {serviceHelperTest.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Make</th>
                        <th className="text-left p-2">Model</th>
                        <th className="text-left p-2">Year</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Published At</th>
                        <th className="text-left p-2">Is Published</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceHelperTest.rows.map((row) => (
                        <tr key={row.id} className="border-b">
                          <td className="p-2 font-mono text-xs">{row.id.substring(0, 8)}...</td>
                          <td className="p-2">{row.make}</td>
                          <td className="p-2">{row.model}</td>
                          <td className="p-2">{row.year}</td>
                          <td className="p-2">
                            <span className="px-2 py-1 bg-muted rounded text-xs">{row.status}</span>
                          </td>
                          <td className="p-2 text-xs">
                            {row.published_at ? new Date(row.published_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-2">{row.is_published ? '✓' : '✗'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Simple Count */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {simpleCount.error ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                3. Simple Count (head request)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Count query using head=true (no data returned, just count)
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Count:</span>
                  <span className="ml-2 font-bold">{simpleCount.count ?? 'N/A'}</span>
                </div>
                {simpleCount.error && (
                  <div className="text-destructive text-sm">
                    <strong>Error:</strong> {simpleCount.error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button asChild>
              <Link to="/inventory">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Inventory Page
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Diagnostics
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
