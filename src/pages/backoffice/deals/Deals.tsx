import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useDealsStore } from '@/services/dealsStore';
import { useCRMStore } from '@/services/crmStore';
import { mockUsers } from '@/services/mockData';
import { Plus, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { DealStatus } from '@/types';

export default function Deals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DealStatus | 'all'>('all');
  
  const { deals, dealUnits } = useDealsStore();
  const { opportunities, accounts } = useCRMStore();

  const getStatusColor = (status: DealStatus) => {
    const colors: Record<DealStatus, string> = {
      draft: 'bg-slate-100 text-slate-800',
      issued: 'bg-blue-100 text-blue-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const getStatusLabel = (status: DealStatus) => {
    const labels: Record<DealStatus, string> = {
      draft: 'Draft',
      issued: 'Issued',
      partially_paid: 'Partially Paid',
      paid: 'Paid',
      canceled: 'Canceled',
    };
    return labels[status];
  };

  const filteredDeals = deals.filter((deal) => {
    const account = accounts.find((a) => a.id === deal.account_id);
    const opportunity = opportunities.find((o) => o.id === deal.opportunity_id);
    const salesRep = mockUsers.find((u) => u.id === deal.sales_rep_id);
    
    const matchesSearch =
      !searchTerm ||
      account?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salesRep?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || deal.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Deals</h1>
          <Link to="/backoffice/deals/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by account, opportunity, or sales rep..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DealStatus | 'all')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Deals List */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''} found
          </p>

          {filteredDeals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No deals found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first deal to get started'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Link to="/backoffice/deals/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Deal
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredDeals.map((deal) => {
              const account = accounts.find((a) => a.id === deal.account_id);
              const opportunity = opportunities.find((o) => o.id === deal.opportunity_id);
              const salesRep = mockUsers.find((u) => u.id === deal.sales_rep_id);
              const units = dealUnits.filter((du) => du.deal_id === deal.id);

              return (
                <Link key={deal.id} to={`/backoffice/deals/${deal.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-xl">
                            {account?.name || 'Unknown Account'}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {opportunity?.name || 'No opportunity linked'}
                          </p>
                        </div>
                        <Badge className={getStatusColor(deal.status)}>
                          {getStatusLabel(deal.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Sales Rep</p>
                          <p className="font-medium">{salesRep?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Units</p>
                          <p className="font-medium">{units.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Due</p>
                          <p className="font-medium">
                            ${deal.total_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p className="font-medium">
                            ${deal.balance_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      {deal.issued_at && (
                        <p className="text-xs text-muted-foreground mt-4">
                          Issued: {format(new Date(deal.issued_at), 'PPP')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
