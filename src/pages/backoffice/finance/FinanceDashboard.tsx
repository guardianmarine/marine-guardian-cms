import React from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDealsStore } from '@/services/dealsStore';
import { useCRMStore } from '@/services/crmStore';
import { DollarSign, TrendingUp, FileText, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function FinanceDashboard() {
  const { deals, payments } = useDealsStore();
  const { accounts } = useCRMStore();

  // Calculate metrics
  const totalRevenue = deals
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + d.total_due, 0);

  const outstandingBalance = deals
    .filter((d) => d.status !== 'paid' && d.status !== 'canceled')
    .reduce((sum, d) => sum + d.balance_due, 0);

  const paidDealsCount = deals.filter((d) => d.status === 'paid').length;

  const recentPayments = payments
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
    .slice(0, 10);

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      wire: 'Wire Transfer',
      ach: 'ACH',
      check: 'Check',
      cash: 'Cash',
      other: 'Other',
    };
    return labels[method] || method;
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Finance Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of financial metrics and recent transactions
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {paidDealsCount} paid deals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {deals.filter((d) => d.balance_due > 0).length} deals pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Paid Deals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidDealsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {deals.length} total deals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recent Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total payments recorded
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payments recorded yet
              </div>
            ) : (
              <div className="space-y-4">
                {recentPayments.map((payment) => {
                  const deal = deals.find((d) => d.id === payment.deal_id);
                  const account = accounts.find((a) => a.id === deal?.account_id);

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{account?.name || 'Unknown Account'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">
                            {getPaymentMethodLabel(payment.method)}
                          </Badge>
                          <span>•</span>
                          <span>{format(new Date(payment.received_at), 'PPP')}</span>
                          {payment.reference && (
                            <>
                              <span>•</span>
                              <span>Ref: {payment.reference}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
