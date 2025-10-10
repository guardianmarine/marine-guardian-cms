import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface BuyerRequestRow {
  id: string;
  created_at: string;
  preferred_contact: string | null;
  unit_id: string | null;
  page_url: string | null;
}

interface LeadRow {
  id: string;
  created_at: string;
  preferred_contact: string | null;
  unit_id: string | null;
}

interface UnitRLSTest {
  unit_id: string;
  can_read: boolean;
  stock_number: string | null;
  title: string | null;
}

interface ColumnInfo {
  column_name: string;
}

export default function LeadsProbe() {
  const [buyerRequests, setBuyerRequests] = useState<BuyerRequestRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [rlsTests, setRlsTests] = useState<UnitRLSTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Q1: Fetch buyer_requests
      const { data: brData, error: brError } = await supabase
        .from('buyer_requests')
        .select('id, created_at, preferred_contact, unit_id, page_url')
        .order('created_at', { ascending: false })
        .limit(10);

      if (brError) throw new Error(`Buyer Requests: ${brError.message}`);
      setBuyerRequests(brData || []);

      // Q2: Fetch leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, created_at, preferred_contact, unit_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (leadsError) throw new Error(`Leads: ${leadsError.message}`);
      setLeads(leadsData || []);

      // Q3: Infer column names with 'pref' from the data
      const prefCols = brData && brData.length > 0 
        ? Object.keys(brData[0]).filter(k => k.toLowerCase().includes('pref'))
        : [];
      setColumns(prefCols);

      // Q4: RLS Test - check if we can read units referenced by leads
      const uniqueUnitIds = Array.from(new Set(
        leadsData
          ?.filter(l => l.unit_id)
          .map(l => l.unit_id!)
      )) || [];

      const rlsTestResults: UnitRLSTest[] = [];
      for (const unitId of uniqueUnitIds.slice(0, 5)) { // Test first 5 unique units
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select('id, stock_number, title')
          .eq('id', unitId)
          .single();

        rlsTestResults.push({
          unit_id: unitId,
          can_read: !unitError,
          stock_number: unitData?.stock_number || null,
          title: unitData?.title || null,
        });
      }
      setRlsTests(rlsTestResults);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Leads Probe - Data Pipeline Debug</h1>
          <p className="text-muted-foreground mt-2">
            Inspecting buyer_requests → leads conversion to identify data loss
          </p>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Column Names Discovery */}
        <Card>
          <CardHeader>
            <CardTitle>🔍 Column Names in buyer_requests (containing "pref")</CardTitle>
            <CardDescription>
              Shows actual column names to verify field mapping
            </CardDescription>
          </CardHeader>
          <CardContent>
            {columns.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {columns.map(col => (
                  <Badge key={col} variant="secondary">{col}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No columns found with "pref" in name, or preferred_contact not visible in select
              </p>
            )}
          </CardContent>
        </Card>

        {/* Buyer Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>📥 Buyer Requests (Last 10)</CardTitle>
            <CardDescription>
              Source data before conversion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Preferred Contact</TableHead>
                    <TableHead>Unit ID</TableHead>
                    <TableHead>Page URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buyerRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No buyer requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    buyerRequests.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-xs">
                          {new Date(row.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {row.preferred_contact ? (
                            <Badge variant="default">{row.preferred_contact}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">NULL</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.unit_id ? row.unit_id.slice(0, 8) + '...' : '—'}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-xs">
                          {row.page_url || '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Leads (Last 10)</CardTitle>
            <CardDescription>
              Converted data - check if preferred_contact and unit_id are preserved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Preferred Contact</TableHead>
                    <TableHead>Unit ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No leads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-xs">
                          {new Date(row.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {row.preferred_contact ? (
                            <Badge variant="default">{row.preferred_contact}</Badge>
                          ) : (
                            <span className="text-destructive text-xs font-semibold">NULL ❌</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.unit_id ? (
                            row.unit_id.slice(0, 8) + '...'
                          ) : (
                            <span className="text-destructive text-xs font-semibold">NULL ❌</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* RLS Test for Units */}
        <Card>
          <CardHeader>
            <CardTitle>🔒 Units RLS Test</CardTitle>
            <CardDescription>
              Verifies if authenticated users can read units referenced by leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rlsTests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No leads with unit_id found to test
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit ID</TableHead>
                      <TableHead>Can Read?</TableHead>
                      <TableHead>Stock Number</TableHead>
                      <TableHead>Title</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rlsTests.map(test => (
                      <TableRow key={test.unit_id}>
                        <TableCell className="font-mono text-xs">
                          {test.unit_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {test.can_read ? (
                            <Badge variant="default">✅ Yes</Badge>
                          ) : (
                            <Badge variant="destructive">❌ RLS Block</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {test.stock_number || '—'}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-xs">
                          {test.title || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {rlsTests.some(t => !t.can_read) && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-md">
                <p className="text-sm font-semibold text-destructive">
                  ⚠️ RLS is blocking units access!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  The Leads table won't be able to join with units. Add a SELECT policy for authenticated users.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Summary */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Preferred Contact:</h3>
              <p className="text-sm">
                {buyerRequests.some(br => br.preferred_contact) 
                  ? `✅ buyer_requests has ${buyerRequests.filter(br => br.preferred_contact).length} rows with preferred_contact`
                  : '⚠️ No buyer_requests have preferred_contact set'}
              </p>
              <p className="text-sm">
                {leads.some(l => l.preferred_contact)
                  ? `✅ leads has ${leads.filter(l => l.preferred_contact).length} rows with preferred_contact`
                  : '❌ No leads have preferred_contact - RPC mapping issue!'}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Unit ID:</h3>
              <p className="text-sm">
                {buyerRequests.some(br => br.unit_id)
                  ? `✅ buyer_requests has ${buyerRequests.filter(br => br.unit_id).length} rows with unit_id`
                  : '⚠️ No buyer_requests have unit_id set'}
              </p>
              <p className="text-sm">
                {leads.some(l => l.unit_id)
                  ? `✅ leads has ${leads.filter(l => l.unit_id).length} rows with unit_id`
                  : '❌ No leads have unit_id - RPC mapping issue or missing from source!'}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Units RLS:</h3>
              <p className="text-sm">
                {rlsTests.length === 0
                  ? '⚠️ No units to test (no leads with unit_id)'
                  : rlsTests.every(t => t.can_read)
                  ? `✅ All ${rlsTests.length} tested units are readable`
                  : `❌ ${rlsTests.filter(t => !t.can_read).length}/${rlsTests.length} units blocked by RLS - Leads won't show unit info!`}
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-2">Next Steps:</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>If buyer_requests has data but leads doesn't → Fix RPC mapping</li>
                <li>If buyer_requests is empty → Fix the Inbound form to capture the fields</li>
                <li>If column names differ → Update RPC to use correct aliases</li>
                <li>If RLS blocks units → Add SELECT policy for authenticated users on units table</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
