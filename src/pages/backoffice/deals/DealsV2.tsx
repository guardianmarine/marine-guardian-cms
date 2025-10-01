import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useDeals } from '@/hooks/useDeals';
import { Plus, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function DealsV2() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { deals, loading } = useDeals();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
      quoted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      won: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      invoiced: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      delivered: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch = !searchTerm || 
      deal.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || deal.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Loading deals...</p>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Deals & Invoices</h1>
            <p className="text-muted-foreground mt-1">Manage deals, units, fees, and generate invoices</p>
          </div>
          <Link to="/backoffice/deals-v2/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Deal
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
                  placeholder="Search deals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="quoted">Quoted</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="invoiced">Invoiced</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
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
                  <Link to="/backoffice/deals-v2/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Deal
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredDeals.map((deal) => (
              <Link key={deal.id} to={`/backoffice/deals-v2/${deal.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">
                          Deal #{deal.id.slice(0, 8).toUpperCase()}
                        </CardTitle>
                        {deal.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {deal.notes}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(deal.status)}>
                        {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Subtotal</p>
                        <p className="font-medium">
                          ${deal.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Due</p>
                        <p className="font-medium">
                          ${deal.total_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Currency</p>
                        <p className="font-medium">{deal.currency}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">
                          {format(new Date(deal.created_at), 'PP')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
