import React, { useState, useMemo } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDealsStore } from '@/services/dealsStore';
import { useCRMStore } from '@/services/crmStore';
import { mockUsers } from '@/services/mockData';
import { Commission, CommissionStatus } from '@/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, parseISO } from 'date-fns';
import { DollarSign, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

type PeriodType = 'today' | 'week' | 'month' | 'all';

export default function CommissionsReport() {
  const { commissions, deals, updateCommission } = useDealsStore();
  const { accounts } = useCRMStore();
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');

  // Get sales reps only
  const salesReps = mockUsers.filter((u) => u.role === 'sales');

  // Filter commissions by period
  const filteredByPeriod = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (periodType) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'all':
        return commissions;
    }

    return commissions.filter((c) => {
      const createdAt = parseISO(c.created_at);
      return createdAt >= start && createdAt <= end;
    });
  }, [commissions, periodType]);

  // Filter by rep and status
  const filteredCommissions = useMemo(() => {
    return filteredByPeriod.filter((c) => {
      const repMatch = selectedRep === 'all' || c.sales_rep_id === selectedRep;
      const statusMatch = statusFilter === 'all' || c.status === statusFilter;
      return repMatch && statusMatch;
    });
  }, [filteredByPeriod, selectedRep, statusFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const accrued = filteredCommissions
      .filter((c) => c.status === 'accrued')
      .reduce((sum, c) => sum + c.calculated_amount, 0);
    const payable = filteredCommissions
      .filter((c) => c.status === 'payable')
      .reduce((sum, c) => sum + c.calculated_amount, 0);
    const paid = filteredCommissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.calculated_amount, 0);
    const total = accrued + payable + paid;

    return { accrued, payable, paid, total };
  }, [filteredCommissions]);

  // Group by sales rep
  const commissionsByRep = useMemo(() => {
    const grouped: Record<string, Commission[]> = {};
    
    filteredCommissions.forEach((comm) => {
      if (!grouped[comm.sales_rep_id]) {
        grouped[comm.sales_rep_id] = [];
      }
      grouped[comm.sales_rep_id].push(comm);
    });

    return grouped;
  }, [filteredCommissions]);

  const getStatusColor = (status: CommissionStatus) => {
    switch (status) {
      case 'accrued':
        return 'bg-blue-100 text-blue-800';
      case 'payable':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMarkPaid = (commissionId: string) => {
    updateCommission(commissionId, {
      status: 'paid',
      paid_at: new Date().toISOString(),
    });
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Commissions Report</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage sales representative commissions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Accrued
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${totals.accrued.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-600" />
                Payable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                ${totals.payable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                ${totals.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Period</label>
                <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Sales Rep</label>
                <Select value={selectedRep} onValueChange={setSelectedRep}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reps</SelectItem>
                    {salesReps.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CommissionStatus | 'all')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="accrued">Accrued</SelectItem>
                    <SelectItem value="payable">Payable</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commissions by Rep */}
        <div className="space-y-4">
          {Object.keys(commissionsByRep).length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No commissions found for the selected filters
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(commissionsByRep).map(([repId, repCommissions]) => {
              const rep = salesReps.find((r) => r.id === repId);
              if (!rep) return null;

              const repTotal = repCommissions.reduce((sum, c) => sum + c.calculated_amount, 0);
              const repPayable = repCommissions
                .filter((c) => c.status === 'payable')
                .reduce((sum, c) => sum + c.calculated_amount, 0);
              const repPaid = repCommissions
                .filter((c) => c.status === 'paid')
                .reduce((sum, c) => sum + c.calculated_amount, 0);

              return (
                <Card key={repId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{rep.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rep.commission_percent}% commission rate • {repCommissions.length} deals
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Earned</p>
                        <p className="text-2xl font-bold">
                          ${repTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex gap-2 mt-1 justify-end">
                          <span className="text-xs text-yellow-600">
                            Payable: ${repPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-green-600">
                            Paid: ${repPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deal</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {repCommissions.map((comm) => {
                          const deal = deals.find((d) => d.id === comm.deal_id);
                          const account = accounts.find((a) => a.id === deal?.account_id);

                          return (
                            <TableRow key={comm.id}>
                              <TableCell className="font-medium">
                                Deal #{comm.deal_id.slice(-6)}
                              </TableCell>
                              <TableCell>{account?.name || '-'}</TableCell>
                              <TableCell>{comm.percent}%</TableCell>
                              <TableCell className="font-semibold">
                                ${comm.calculated_amount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(comm.status)}>
                                  {comm.status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {format(parseISO(comm.created_at), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="text-right">
                                {comm.status === 'payable' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleMarkPaid(comm.id)}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                                {comm.status === 'paid' && comm.paid_at && (
                                  <span className="text-xs text-muted-foreground">
                                    Paid {format(parseISO(comm.paid_at), 'MMM dd')}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
