import { useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDealsStore } from '@/services/dealsStore';
import { useCRMStore } from '@/services/crmStore';
import { mockUsers } from '@/services/mockData';
import { DollarSign, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { CommissionStatus } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Commissions() {
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');
  
  const { commissions, deals, markCommissionPayable, markCommissionPaid } = useDealsStore();
  const { accounts } = useCRMStore();

  const getStatusColor = (status: CommissionStatus) => {
    const colors: Record<CommissionStatus, string> = {
      accrued: 'bg-slate-100 text-slate-800',
      payable: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    };
    return colors[status];
  };

  const getStatusLabel = (status: CommissionStatus) => {
    const labels: Record<CommissionStatus, string> = {
      accrued: 'Accrued',
      payable: 'Payable',
      paid: 'Paid',
    };
    return labels[status];
  };

  const filteredCommissions = commissions.filter((comm) => {
    return statusFilter === 'all' || comm.status === statusFilter;
  });

  // Group by sales rep
  const commissionsBySalesRep = filteredCommissions.reduce((acc, comm) => {
    if (!acc[comm.sales_rep_id]) {
      acc[comm.sales_rep_id] = [];
    }
    acc[comm.sales_rep_id].push(comm);
    return acc;
  }, {} as Record<string, typeof commissions>);

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Sales Commissions</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage sales representative commissions
          </p>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CommissionStatus | 'all')}
              className="flex h-10 w-full md:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="accrued">Accrued</option>
              <option value="payable">Payable</option>
              <option value="paid">Paid</option>
            </select>
          </CardContent>
        </Card>

        {/* Commissions by Sales Rep */}
        <div className="space-y-6">
          {Object.entries(commissionsBySalesRep).map(([salesRepId, repCommissions]) => {
            const salesRep = mockUsers.find((u) => u.id === salesRepId);
            const totalCommissions = repCommissions.reduce((sum, c) => sum + c.calculated_amount, 0);
            const paidCommissions = repCommissions
              .filter((c) => c.status === 'paid')
              .reduce((sum, c) => sum + c.calculated_amount, 0);

            return (
              <Card key={salesRepId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{salesRep?.name || 'Unknown Sales Rep'}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {repCommissions.length} commission{repCommissions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        ${totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Paid: ${paidCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal / Account</TableHead>
                        <TableHead>Basis</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repCommissions.map((comm) => {
                        const deal = deals.find((d) => d.id === comm.deal_id);
                        const account = accounts.find((a) => a.id === deal?.account_id);

                        return (
                          <TableRow key={comm.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{account?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  Deal: {deal?.id || 'N/A'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{comm.basis}</TableCell>
                            <TableCell>
                              {comm.percent ? `${comm.percent}%` : 
                               comm.flat_amount ? `$${comm.flat_amount.toFixed(2)}` : 'N/A'}
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${comm.calculated_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(comm.status)}>
                                {getStatusLabel(comm.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {comm.status === 'accrued' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markCommissionPayable(comm.id)}
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Mark Payable
                                  </Button>
                                )}
                                {comm.status === 'payable' && (
                                  <Button
                                    size="sm"
                                    onClick={() => markCommissionPaid(comm.id)}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Mark Paid
                                  </Button>
                                )}
                                {comm.status === 'paid' && comm.paid_at && (
                                  <span className="text-xs text-muted-foreground">
                                    Paid: {format(new Date(comm.paid_at), 'PP')}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}

          {Object.keys(commissionsBySalesRep).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No commissions found</h3>
                <p className="text-sm text-muted-foreground">
                  {statusFilter !== 'all'
                    ? 'Try adjusting your filter'
                    : 'Commissions will appear here when deals are created'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
