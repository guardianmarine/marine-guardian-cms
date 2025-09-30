import React, { useState, useMemo } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDealsStore } from '@/services/dealsStore';
import { useCRMStore } from '@/services/crmStore';
import { useInventoryStore } from '@/services/inventoryStore';
import { useAuth } from '@/contexts/AuthContext';
import { mockUsers } from '@/services/mockData';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users, 
  Calendar,
  Percent,
  Award,
  BarChart3
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function FinanceOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { deals, commissions } = useDealsStore();
  const { accounts } = useCRMStore();
  const { units } = useInventoryStore();

  // Role guard - only finance and admin
  if (user?.role !== 'finance' && user?.role !== 'admin') {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                You do not have permission to view this page. This module is restricted to Finance and Admin users.
              </p>
            </CardContent>
          </Card>
        </div>
      </BackofficeLayout>
    );
  }

  // Filters
  const [dateRange, setDateRange] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [makeFilter, setMakeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  // Get unique values for filters
  const makes = useMemo(() => {
    const uniqueMakes = [...new Set(units.map(u => u.make))];
    return uniqueMakes.sort();
  }, [units]);

  const years = useMemo(() => {
    const uniqueYears = [...new Set(units.map(u => u.year))];
    return uniqueYears.sort((a, b) => b - a);
  }, [units]);

  // Filter deals based on selected filters
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      // Get deal units
      const dealUnits = units.filter(u => 
        deal.opportunity_id && u.status === 'sold'
      );

      // Category filter
      if (categoryFilter !== 'all') {
        const hasCategory = dealUnits.some(u => u.category === categoryFilter);
        if (!hasCategory) return false;
      }

      // Make filter
      if (makeFilter !== 'all') {
        const hasMake = dealUnits.some(u => u.make === makeFilter);
        if (!hasMake) return false;
      }

      // Year filter
      if (yearFilter !== 'all') {
        const hasYear = dealUnits.some(u => u.year === parseInt(yearFilter));
        if (!hasYear) return false;
      }

      // Date range filter
      if (dateRange !== 'all' && deal.closed_at) {
        const closedDate = parseISO(deal.closed_at);
        const now = new Date();
        const daysAgo = differenceInDays(now, closedDate);

        if (dateRange === '30' && daysAgo > 30) return false;
        if (dateRange === '90' && daysAgo > 90) return false;
        if (dateRange === '365' && daysAgo > 365) return false;
      }

      return true;
    });
  }, [deals, units, dateRange, categoryFilter, makeFilter, yearFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const closedDeals = filteredDeals.filter(d => d.closed_at && d.status === 'paid');
    
    // Revenue
    const totalRevenue = closedDeals.reduce((sum, d) => sum + d.total_due, 0);
    
    // Units sold
    const soldUnits = units.filter(u => u.status === 'sold' && u.sold_at);
    const unitsSold = soldUnits.length;
    
    // Average ticket
    const avgTicket = closedDeals.length > 0 ? totalRevenue / closedDeals.length : 0;
    
    // Days on lot
    const daysOnLot = soldUnits
      .filter(u => u.listed_at && u.sold_at)
      .map(u => {
        const listed = parseISO(u.listed_at!);
        const sold = parseISO(u.sold_at!);
        return differenceInDays(sold, listed);
      });
    const avgDaysOnLot = daysOnLot.length > 0 
      ? daysOnLot.reduce((sum, days) => sum + days, 0) / daysOnLot.length 
      : 0;

    // Profitability - calculate total costs and gross/net
    const profitability = soldUnits.map(unit => {
      const totalCost = (
        (unit.cost_purchase || 0) +
        (unit.cost_transport_in || 0) +
        (unit.cost_reconditioning || 0) +
        (unit.cost_recon_parts || 0) +
        (unit.cost_recon_labor || 0) +
        (unit.cost_detailing || 0) +
        (unit.cost_marketing || 0) +
        (unit.cost_fees || 0) +
        (unit.cost_overhead_applied || 0)
      );
      const revenue = unit.display_price;
      const grossProfit = revenue - (unit.cost_purchase || 0);
      const netProfit = revenue - totalCost;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return {
        unit,
        totalCost,
        revenue,
        grossProfit,
        netProfit,
        grossMargin,
        netMargin,
      };
    });

    const totalGrossProfit = profitability.reduce((sum, p) => sum + p.grossProfit, 0);
    const totalNetProfit = profitability.reduce((sum, p) => sum + p.netProfit, 0);
    const avgGrossMargin = profitability.length > 0
      ? profitability.reduce((sum, p) => sum + p.grossMargin, 0) / profitability.length
      : 0;
    const avgNetMargin = profitability.length > 0
      ? profitability.reduce((sum, p) => sum + p.netMargin, 0) / profitability.length
      : 0;

    // Top customers - repeat buyers
    const accountDealCounts: Record<string, number> = {};
    closedDeals.forEach(deal => {
      accountDealCounts[deal.account_id] = (accountDealCounts[deal.account_id] || 0) + 1;
    });
    const repeatBuyers = Object.entries(accountDealCounts)
      .filter(([_, count]) => count > 1)
      .map(([accountId, count]) => {
        const account = accounts.find(a => a.id === accountId);
        const accountDeals = closedDeals.filter(d => d.account_id === accountId);
        const totalSpent = accountDeals.reduce((sum, d) => sum + d.total_due, 0);
        return {
          account,
          dealCount: count,
          totalSpent,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);

    // Sales rep performance
    const salesReps = mockUsers.filter(u => u.role === 'sales');
    const repPerformance = salesReps.map(rep => {
      const repDeals = closedDeals.filter(d => d.sales_rep_id === rep.id);
      const repRevenue = repDeals.reduce((sum, d) => sum + d.total_due, 0);
      const repCommissions = commissions.filter(c => c.sales_rep_id === rep.id);
      const accruedComm = repCommissions
        .filter(c => c.status === 'accrued')
        .reduce((sum, c) => sum + c.calculated_amount, 0);
      const payableComm = repCommissions
        .filter(c => c.status === 'payable')
        .reduce((sum, c) => sum + c.calculated_amount, 0);
      const paidComm = repCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.calculated_amount, 0);

      return {
        rep,
        dealCount: repDeals.length,
        revenue: repRevenue,
        commissions: {
          accrued: accruedComm,
          payable: payableComm,
          paid: paidComm,
          total: accruedComm + payableComm + paidComm,
        },
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      unitsSold,
      avgTicket,
      avgDaysOnLot,
      totalGrossProfit,
      totalNetProfit,
      avgGrossMargin,
      avgNetMargin,
      profitability,
      repeatBuyers,
      repPerformance,
    };
  }, [filteredDeals, units, accounts, commissions]);

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Finance Overview</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive financial metrics and profitability analysis
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="365">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="truck">Trucks</SelectItem>
                    <SelectItem value="trailer">Trailers</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Make</Label>
                <Select value={makeFilter} onValueChange={setMakeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Makes</SelectItem>
                    {makes.map(make => (
                      <SelectItem key={make} value={make}>{make}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDateRange('all');
                    setCategoryFilter('all');
                    setMakeFilter('all');
                    setYearFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Units Sold
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metrics.unitsSold}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Avg Ticket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${metrics.avgTicket.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                Avg Days on Lot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{Math.round(metrics.avgDaysOnLot)} days</p>
            </CardContent>
          </Card>
        </div>

        {/* Profitability Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Total Gross Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                ${metrics.totalGrossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Total Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">
                ${metrics.totalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-4 w-4 text-blue-600" />
                Avg Gross Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {metrics.avgGrossMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-4 w-4 text-indigo-600" />
                Avg Net Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {metrics.avgNetMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Customers - Repeat Buyers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Customers - Repeat Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.repeatBuyers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No repeat buyers found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Deals</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Avg per Deal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.repeatBuyers.slice(0, 10).map((buyer, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {buyer.account?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge>{buyer.dealCount} deals</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${buyer.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        ${(buyer.totalSpent / buyer.dealCount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sales Rep Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Sales Rep Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Deals</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Accrued</TableHead>
                  <TableHead>Payable</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Total Commissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.repPerformance.map((perf) => (
                  <TableRow key={perf.rep.id}>
                    <TableCell className="font-medium">{perf.rep.name}</TableCell>
                    <TableCell>{perf.dealCount}</TableCell>
                    <TableCell className="font-semibold">
                      ${perf.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      ${perf.commissions.accrued.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-yellow-600 font-semibold">
                      ${perf.commissions.payable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-green-600">
                      ${perf.commissions.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-bold">
                      ${perf.commissions.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Unit-Level Profitability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Unit-Level Profitability (Top 20)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Gross Profit</TableHead>
                    <TableHead>Gross Margin</TableHead>
                    <TableHead>Net Profit</TableHead>
                    <TableHead>Net Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.profitability
                    .sort((a, b) => b.netProfit - a.netProfit)
                    .slice(0, 20)
                    .map((profit, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {profit.unit.year} {profit.unit.make} {profit.unit.model}
                        </TableCell>
                        <TableCell>
                          ${profit.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          ${profit.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          ${profit.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{profit.grossMargin.toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell className={`font-semibold ${profit.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ${profit.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={profit.netMargin >= 0 ? 'border-emerald-600 text-emerald-600' : 'border-red-600 text-red-600'}
                          >
                            {profit.netMargin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
