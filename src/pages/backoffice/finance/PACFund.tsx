import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePacLedger, PacLedgerEntry } from '@/hooks/usePacLedger';
import { format } from 'date-fns';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Plus, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PACFund() {
  const { t } = useTranslation();
  const { entries, loading, balance, addDebit, fetchEntries } = usePacLedger({ autoFetch: true, showErrors: true });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [debitAmount, setDebitAmount] = useState('');
  const [debitNote, setDebitNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddDebit = async () => {
    const amount = parseFloat(debitAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (!debitNote.trim()) return;

    setSubmitting(true);
    const success = await addDebit(amount, debitNote.trim());
    setSubmitting(false);

    if (success) {
      setDialogOpen(false);
      setDebitAmount('');
      setDebitNote('');
    }
  };

  const totalCredits = entries
    .filter(e => e.direction === 'credit')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  
  const totalDebits = entries
    .filter(e => e.direction === 'debit')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Wallet className="h-8 w-8" />
              PAC Fund
            </h2>
            <p className="text-muted-foreground">
              Track PAC cost allocations and fund usage
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Debit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Fund Usage</DialogTitle>
                <DialogDescription>
                  Record a debit to the PAC Fund when funds are used for expenses not tied to a specific unit.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={debitAmount}
                    onChange={(e) => setDebitAmount(e.target.value)}
                    placeholder="1000"
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note (required)</Label>
                  <Textarea
                    id="note"
                    value={debitNote}
                    onChange={(e) => setDebitNote(e.target.value)}
                    placeholder="Describe the expense or reason for this debit..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddDebit} 
                  disabled={submitting || !debitAmount || !debitNote.trim()}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Record Debit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Credits (In)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">
                    ${totalCredits.toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Debits (Out)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">
                    ${totalDebits.toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription>Current Balance</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <span className={`text-2xl font-bold ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    ${balance.toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              All PAC Fund movements - credits from unit assignments, debits from fund usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No PAC Fund transactions yet.</p>
                <p className="text-sm">Assign PAC costs to units to see credits here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {entry.direction === 'credit' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <ArrowUpCircle className="h-3 w-3 mr-1" />
                            Credit
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <ArrowDownCircle className="h-3 w-3 mr-1" />
                            Debit
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        <span className={entry.direction === 'credit' ? 'text-green-600' : 'text-red-600'}>
                          {entry.direction === 'credit' ? '+' : '-'}${Number(entry.amount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {entry.unit ? (
                          <Link 
                            to={`/backoffice/inventory/${entry.unit.id}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            {entry.unit.year} {entry.unit.make} {entry.unit.model}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {entry.note || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
