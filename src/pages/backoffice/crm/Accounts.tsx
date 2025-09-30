import { useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCRMStore } from '@/services/crmStore';
import { useAuth } from '@/contexts/AuthContext';
import { getCRMPermissions } from '@/lib/permissions';
import { Building, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Accounts() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { accounts, getAccountOpportunities } = useCRMStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'company' | 'individual'>('all');
  
  const permissions = user ? getCRMPermissions(user.role) : { canViewCRM: false, canCreateCRM: false };

  if (!user || !permissions.canViewCRM) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p className="text-red-500">You do not have permission to view CRM data.</p>
        </div>
      </BackofficeLayout>
    );
  }

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.email && acc.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesKind = kindFilter === 'all' || acc.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

  const getRepeatBuyerCount = (accountId: string) => {
    const opps = getAccountOpportunities(accountId);
    return opps.filter((opp) => opp.pipeline_stage === 'won').length;
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">{t('crm.accounts')}</h2>
          {permissions.canCreateCRM && (
            <Button onClick={() => navigate('/backoffice/crm/accounts/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('crm.addAccount')}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4">
          {filteredAccounts.map((account) => {
            const wonDeals = getRepeatBuyerCount(account.id);
            const isRepeatBuyer = wonDeals > 1;

            return (
              <Card
                key={account.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate(`/backoffice/crm/accounts/${account.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize">
                          {account.kind} • {format(new Date(account.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isRepeatBuyer && (
                        <Badge className="bg-purple-500">
                          Repeat Buyer ({wonDeals})
                        </Badge>
                      )}
                      {account.is_tax_exempt && (
                        <Badge variant="outline">Tax Exempt</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}

          {filteredAccounts.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || kindFilter !== 'all' ? 'No accounts found matching your filters.' : 'No accounts yet. Create your first account.'}
                </p>
                {permissions.canCreateCRM && !searchTerm && kindFilter === 'all' && (
                  <Button className="mt-4" onClick={() => navigate('/backoffice/crm/accounts/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('crm.addAccount')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
