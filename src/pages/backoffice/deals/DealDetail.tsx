import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDealsStore } from '@/services/dealsStore';
import { useCRMStore } from '@/services/crmStore';
import { useInventoryStore } from '@/services/inventoryStore';
import { mockUsers } from '@/services/mockData';
import { ArrowLeft, Plus, DollarSign, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Deal, Payment, DealStatus, PaymentMethod } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'new';

  const {
    deals,
    dealUnits,
    dealFees,
    payments,
    addDeal,
    updateDeal,
    addDealUnit,
    removeDealUnit,
    getDealUnits,
    getDealFees,
    getPaymentsByDeal,
    addPayment,
    recalculateDealTotals,
    taxRegimes,
    applyTaxRule,
    getActiveTaxRule,
  } = useDealsStore();

  const { opportunities, accounts } = useCRMStore();
  const { units } = useInventoryStore();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState('');
  const [selectedTaxRegimeId, setSelectedTaxRegimeId] = useState('');
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wire');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    if (!isNew && id) {
      const foundDeal = deals.find((d) => d.id === id);
      if (foundDeal) {
        setDeal(foundDeal);
        setSelectedOpportunityId(foundDeal.opportunity_id);
        if (foundDeal.tax_rule_version_id) {
          const rule = taxRegimes.find((r) => 
            r.id === foundDeal.tax_rule_version_id?.split('-')[0]
          );
          if (rule) setSelectedTaxRegimeId(rule.id);
        }
      }
    }
  }, [id, isNew, deals, taxRegimes]);

  const handleCreateDeal = () => {
    if (!selectedOpportunityId) {
      toast({
        title: 'Error',
        description: 'Please select an opportunity',
        variant: 'destructive',
      });
      return;
    }

    const opportunity = opportunities.find((o) => o.id === selectedOpportunityId);
    if (!opportunity) return;

    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      opportunity_id: selectedOpportunityId,
      account_id: opportunity.account_id,
      sales_rep_id: opportunity.owner_user_id,
      status: 'draft',
      currency: 'USD',
      vehicle_subtotal: 0,
      discounts_total: 0,
      taxes_total: 0,
      fees_total: 0,
      total_due: 0,
      amount_paid: 0,
      balance_due: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addDeal(newDeal);
    toast({
      title: 'Success',
      description: 'Deal created successfully',
    });
    navigate(`/backoffice/deals/${newDeal.id}`);
  };

  const handleApplyTaxRule = () => {
    if (!deal || !selectedTaxRegimeId) return;

    const activeRule = getActiveTaxRule(selectedTaxRegimeId);
    if (!activeRule) {
      toast({
        title: 'Error',
        description: 'No active tax rule found for selected regime',
        variant: 'destructive',
      });
      return;
    }

    applyTaxRule(deal.id, activeRule.id);
    toast({
      title: 'Success',
      description: 'Tax rule applied successfully',
    });
    
    // Refresh deal
    const updatedDeal = deals.find((d) => d.id === deal.id);
    if (updatedDeal) setDeal(updatedDeal);
  };

  const handleRecordPayment = () => {
    if (!deal) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    const payment: Payment = {
      id: `payment-${Date.now()}`,
      deal_id: deal.id,
      method: paymentMethod,
      amount,
      received_at: new Date().toISOString(),
      reference: paymentReference || undefined,
      notes: paymentNotes || undefined,
      recorded_by: 'user-1', // Current user
      created_at: new Date().toISOString(),
    };

    addPayment(payment);
    
    // Refresh deal
    const updatedDeal = deals.find((d) => d.id === deal.id);
    if (updatedDeal) setDeal(updatedDeal);

    setPaymentDialogOpen(false);
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentNotes('');
    
    toast({
      title: 'Success',
      description: 'Payment recorded successfully',
    });
  };

  const handleGenerateInvoice = () => {
    toast({
      title: 'Coming Soon',
      description: 'Invoice PDF generation will be implemented',
    });
  };

  if (isNew) {
    return (
      <BackofficeLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Link to="/backoffice/deals">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Create New Deal</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select Opportunity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Won Opportunity</Label>
                <Select
                  value={selectedOpportunityId}
                  onValueChange={setSelectedOpportunityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an opportunity" />
                  </SelectTrigger>
                  <SelectContent>
                    {opportunities
                      .filter((o) => o.pipeline_stage === 'won')
                      .map((opp) => {
                        const account = accounts.find((a) => a.id === opp.account_id);
                        return (
                          <SelectItem key={opp.id} value={opp.id}>
                            {opp.name} - {account?.name}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateDeal} disabled={!selectedOpportunityId}>
                Create Deal
              </Button>
            </CardContent>
          </Card>
        </div>
      </BackofficeLayout>
    );
  }

  if (!deal) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p>Deal not found</p>
        </div>
      </BackofficeLayout>
    );
  }

  const opportunity = opportunities.find((o) => o.id === deal.opportunity_id);
  const account = accounts.find((a) => a.id === deal.account_id);
  const salesRep = mockUsers.find((u) => u.id === deal.sales_rep_id);
  const dealUnitsList = getDealUnits(deal.id);
  const fees = getDealFees(deal.id);
  const dealPayments = getPaymentsByDeal(deal.id);

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/backoffice/deals">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{account?.name || 'Deal'}</h1>
              <p className="text-muted-foreground">{opportunity?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={deal.status === 'paid' ? 'bg-green-100 text-green-800' : ''}>
              {deal.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Button onClick={handleGenerateInvoice}>
              <Download className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vehicle Subtotal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${deal.vehicle_subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Taxes & Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${(deal.taxes_total + deal.fees_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Due</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${deal.total_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Balance Due</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                ${deal.balance_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tax Regime Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Tax & Fee Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label>Tax Regime</Label>
                <Select
                  value={selectedTaxRegimeId}
                  onValueChange={setSelectedTaxRegimeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax regime" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxRegimes.filter((r) => r.active).map((regime) => (
                      <SelectItem key={regime.id} value={regime.id}>
                        {regime.name} ({regime.jurisdiction})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleApplyTaxRule} disabled={!selectedTaxRegimeId}>
                Apply Rule
              </Button>
            </div>

            {fees.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee/Tax Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">{fee.name}</TableCell>
                      <TableCell className="capitalize">{fee.calc_type}</TableCell>
                      <TableCell>
                        {fee.calc_type === 'percent' ? `${fee.rate_or_amount}%` : 'Fixed'}
                      </TableCell>
                      <TableCell>
                        ${fee.result_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payments</CardTitle>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record New Payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wire">Wire Transfer</SelectItem>
                          <SelectItem value="ach">ACH</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Reference (Optional)</Label>
                      <Input
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Check #, Transaction ID, etc."
                      />
                    </div>
                    <div>
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRecordPayment}>
                      Record Payment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {dealPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payments recorded yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.received_at), 'PPP')}</TableCell>
                      <TableCell className="capitalize">{payment.method}</TableCell>
                      <TableCell>{payment.reference || '-'}</TableCell>
                      <TableCell className="font-semibold">
                        ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
