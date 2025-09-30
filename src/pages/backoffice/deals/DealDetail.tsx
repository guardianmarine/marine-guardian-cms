import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { TaxFeesPanel } from '@/components/deals/TaxFeesPanel';
import { DealUnitsGrid } from '@/components/deals/DealUnitsGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDealsStore } from '@/services/dealsStore';
import { useCRMStore } from '@/services/crmStore';
import { useInventoryStore } from '@/services/inventoryStore';
import { useAuth } from '@/contexts/AuthContext';
import { mockUsers } from '@/services/mockData';
import { ArrowLeft, Plus, FileText, Download, Pencil, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
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
    updatePayment,
    deletePayment,
    issueDeal,
    markDelivered,
    closeDeal,
  } = useDealsStore();

  const { opportunities, accounts } = useCRMStore();
  const { units } = useInventoryStore();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wire');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // Delete confirmation
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isNew && id) {
      const foundDeal = deals.find((d) => d.id === id);
      if (foundDeal) {
        setDeal(foundDeal);
        setSelectedOpportunityId(foundDeal.opportunity_id);
        setDiscountAmount(foundDeal.discounts_total > 0 ? foundDeal.discounts_total.toString() : '');
      }
    }
  }, [id, isNew, deals]);

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

  const handleOpenPaymentDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentMethod(payment.method);
      setPaymentAmount(payment.amount.toString());
      setPaymentReference(payment.reference || '');
      setPaymentNotes(payment.notes || '');
    } else {
      setEditingPayment(null);
      setPaymentMethod('wire');
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');
    }
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = () => {
    if (!deal || !user) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (editingPayment) {
      // Update existing payment
      updatePayment(editingPayment.id, {
        method: paymentMethod,
        amount,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });
      
      toast({
        title: 'Success',
        description: 'Payment updated successfully',
      });
    } else {
      // Create new payment
      const payment: Payment = {
        id: `payment-${Date.now()}`,
        deal_id: deal.id,
        method: paymentMethod,
        amount,
        received_at: new Date().toISOString(),
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
        recorded_by: user.id,
        created_at: new Date().toISOString(),
      };

      addPayment(payment);
      
      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });
    }
    
    // Refresh deal
    const updatedDeal = deals.find((d) => d.id === deal.id);
    if (updatedDeal) setDeal(updatedDeal);

    setPaymentDialogOpen(false);
    setEditingPayment(null);
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentNotes('');
  };

  const handleDeletePayment = () => {
    if (!deletePaymentId) return;

    deletePayment(deletePaymentId);
    
    // Refresh deal
    const updatedDeal = deals.find((d) => d.id === deal.id);
    if (updatedDeal) setDeal(updatedDeal);

    setDeletePaymentId(null);
    
    toast({
      title: 'Success',
      description: 'Payment deleted successfully',
    });
  };

  const handleGenerateInvoice = () => {
    toast({
      title: 'Coming Soon',
      description: 'Invoice PDF generation will be implemented',
    });
  };

  const handleIssueDeal = () => {
    if (!deal) return;
    issueDeal(deal.id);
    const updatedDeal = deals.find((d) => d.id === deal.id);
    if (updatedDeal) setDeal(updatedDeal);
    toast({
      title: 'Success',
      description: 'Deal issued successfully',
    });
  };

  const handleMarkDelivered = () => {
    if (!deal) return;
    markDelivered(deal.id);
    const updatedDeal = deals.find((d) => d.id === deal.id);
    if (updatedDeal) setDeal(updatedDeal);
    toast({
      title: 'Success',
      description: 'Deal marked as delivered',
    });
  };

  const handleCloseDeal = () => {
    if (!deal) return;
    closeDeal(deal.id);
    const updatedDeal = deals.find((d) => d.id === deal.id);
    if (updatedDeal) setDeal(updatedDeal);
    toast({
      title: 'Success',
      description: 'Deal closed successfully. Units marked as sold.',
    });
  };

  const handleApplyDiscount = () => {
    if (!deal) return;
    const discount = parseFloat(discountAmount);
    if (isNaN(discount) || discount < 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid discount amount',
        variant: 'destructive',
      });
      return;
    }

    updateDeal(deal.id, { discounts_total: discount });
    const updatedDeal = deals.find((d) => d.id === deal.id);
    if (updatedDeal) setDeal(updatedDeal);
    toast({
      title: 'Success',
      description: 'Discount applied',
    });
  };

  const handleRecalculateSubtotal = () => {
    if (!deal) return;
    const dealUnitsList = getDealUnits(deal.id);
    const newSubtotal = dealUnitsList.reduce((sum, du) => sum + du.agreed_unit_price, 0);
    updateDeal(deal.id, { vehicle_subtotal: newSubtotal });
    const updatedDeal = deals.find((d) => d.id === deal.id);
    if (updatedDeal) {
      setDeal(updatedDeal);
      toast({
        title: 'Success',
        description: 'Subtotal recalculated',
      });
    }
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
  const contact = opportunity?.contact_id ? useCRMStore.getState().getContact(opportunity.contact_id) : null;
  const salesRep = mockUsers.find((u) => u.id === deal.sales_rep_id);
  const dealUnitsList = getDealUnits(deal.id);
  const fees = getDealFees(deal.id);
  const dealPayments = getPaymentsByDeal(deal.id);

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Link to="/backoffice/deals">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{account?.name || 'Deal'}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>{opportunity?.name}</span>
                {contact && (
                  <>
                    <span>•</span>
                    <span>Contact: {contact.first_name} {contact.last_name}</span>
                  </>
                )}
                <span>•</span>
                <span>Sales Rep: {salesRep?.name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={
              deal.status === 'paid' ? 'bg-green-100 text-green-800' :
              deal.status === 'issued' ? 'bg-blue-100 text-blue-800' :
              deal.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
              deal.status === 'canceled' ? 'bg-red-100 text-red-800' :
              'bg-slate-100 text-slate-800'
            }>
              {deal.status.replace('_', ' ').toUpperCase()}
            </Badge>
            {deal.delivered_at && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Delivered
              </Badge>
            )}
            {deal.closed_at && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Closed
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {deal.status === 'draft' && (
            <Button onClick={handleIssueDeal}>
              <FileText className="h-4 w-4 mr-2" />
              Issue Deal
            </Button>
          )}
          {deal.status === 'paid' && !deal.delivered_at && (
            <Button onClick={handleMarkDelivered} variant="outline">
              Mark Delivered
            </Button>
          )}
          {deal.status === 'paid' && deal.delivered_at && !deal.closed_at && (
            <Button onClick={handleCloseDeal}>
              Close Deal
            </Button>
          )}
          {(deal.status === 'issued' || deal.status === 'paid') && (
            <Button onClick={handleGenerateInvoice} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          )}
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


        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Units, Discounts, Totals */}
          <div className="lg:col-span-2 space-y-6">
            {/* Units */}
            <Card>
              <CardHeader>
                <CardTitle>Units</CardTitle>
              </CardHeader>
              <CardContent>
                <DealUnitsGrid 
                  dealId={deal.id} 
                  onPriceChange={handleRecalculateSubtotal}
                />
              </CardContent>
            </Card>

            {/* Discounts */}
            <Card>
              <CardHeader>
                <CardTitle>Discounts (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label>Discount Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={discountAmount || deal.discounts_total}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <Button onClick={handleApplyDiscount}>
                    Apply Discount
                  </Button>
                </div>
                {deal.discounts_total > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Current discount: ${deal.discounts_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Totals Breakdown Card */}
            <Card>
              <CardHeader>
                <CardTitle>Deal Totals Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vehicle Subtotal:</span>
                    <span className="font-semibold">
                      ${deal.vehicle_subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {deal.discounts_total > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discounts:</span>
                      <span className="font-semibold text-red-600">
                        -${deal.discounts_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxes Total:</span>
                    <span className="font-semibold">
                      ${deal.taxes_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fees Total:</span>
                    <span className="font-semibold">
                      ${deal.fees_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-bold">Total Due:</span>
                    <span className="text-2xl font-bold">
                      ${deal.total_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-semibold text-green-600">
                      ${deal.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="font-bold">Balance Due:</span>
                    <span className="text-xl font-bold text-orange-600">
                      ${deal.balance_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tax & Fees Panel */}
          <div>
            <TaxFeesPanel 
              deal={deal} 
              onApply={() => {
                const updatedDeal = deals.find((d) => d.id === deal.id);
                if (updatedDeal) setDeal(updatedDeal);
              }} 
            />
          </div>
        </div>

        {/* Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payments</CardTitle>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenPaymentDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingPayment ? 'Edit Payment' : 'Record New Payment'}
                    </DialogTitle>
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
                    <Button variant="outline" onClick={() => {
                      setPaymentDialogOpen(false);
                      setEditingPayment(null);
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleRecordPayment}>
                      {editingPayment ? 'Update Payment' : 'Record Payment'}
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
                    <TableHead>Notes</TableHead>
                    <TableHead>Amount</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealPayments.map((payment) => {
                    const recorder = mockUsers.find((u) => u.id === payment.recorded_by);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>{format(new Date(payment.received_at), 'PPP')}</div>
                          {recorder && (
                            <div className="text-xs text-muted-foreground mt-1">
                              By {recorder.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {payment.method.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.reference || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {payment.notes || '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenPaymentDialog(payment)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletePaymentId(payment.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Payment Confirmation Dialog */}
        <AlertDialog open={!!deletePaymentId} onOpenChange={(open) => !open && setDeletePaymentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this payment? This action cannot be undone and will recalculate the deal totals.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </BackofficeLayout>
  );
}
