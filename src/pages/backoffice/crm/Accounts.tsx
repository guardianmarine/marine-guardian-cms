import { useState, useEffect } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { getCRMPermissions } from '@/lib/permissions';
import { Building, Plus, Search, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SoftDeleteActions } from '@/components/common/SoftDeleteActions';
import { ViewFilterTabs } from '@/components/common/ViewFilterTabs';
import { ViewFilter } from '@/hooks/useSoftDelete';
import { useSessionErrorHandler, handleQueryError } from '@/hooks/useSessionErrorHandler';

type Account = {
  id: string;
  kind: 'company' | 'individual';
  name: string;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
  contact_count: number;
};

export default function Accounts() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'company' | 'individual'>('all');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('active');
  
  // Enable global session error handling
  useSessionErrorHandler();
  
  const permissions = user ? getCRMPermissions(user.role) : { canViewCRM: false, canCreateCRM: false };

  useEffect(() => {
    loadAccounts();
  }, [viewFilter]);

  const loadAccounts = async () => {
    // Verificar configuración de Supabase
    if (!isSupabaseReady() || !supabase) {
      setLoading(false);
      toast.error('Supabase no está configurado correctamente');
      return;
    }

    try {
      // Get accounts with aggregated contact count (no N+1)
      // Trying Option B: explicit FK by column
      let query = supabase
        .from('accounts')
        .select('id, kind, name, is_active, created_at, deleted_at, contacts!account_id(count)')
        .order('created_at', { ascending: false });

      if (viewFilter === 'active') {
        query = query.is('deleted_at', null);
      } else if (viewFilter === 'trash') {
        query = query.not('deleted_at', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setAccounts([]);
        return;
      }

      // Map the aggregated count from the nested contacts array
      const accountsWithCount = data.map((acc: any) => {
        const count = acc.contacts?.[0]?.count ?? 0;
        
        // Debug log (only in development)
        if (import.meta.env.DEV) {
          console.debug('[Accounts] Row contacts agg:', {
            accountId: acc.id,
            accountName: acc.name,
            contactCount: count,
            rawContacts: acc.contacts
          });
        }
        
        return {
          id: acc.id,
          kind: acc.kind,
          name: acc.name,
          is_active: acc.is_active,
          created_at: acc.created_at,
          deleted_at: acc.deleted_at,
          contact_count: count
        };
      });
      
      // Direct count verification for first account (dev only)
      if (import.meta.env.DEV && accountsWithCount.length > 0) {
        const firstAccount = accountsWithCount[0];
        const { count: directCount, error: countError } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', firstAccount.id)
          .is('deleted_at', null);
        
        console.debug('[Accounts] Direct count verification:', {
          accountId: firstAccount.id,
          accountName: firstAccount.name,
          embeddedCount: firstAccount.contact_count,
          directCount: directCount,
          error: countError
        });
      }
      
      setAccounts(accountsWithCount);
    } catch (error: any) {
      console.error('Error loading accounts:', error);
      
      // Handle authentication errors specifically
      handleQueryError(
        error,
        logout,
        error?.message ?? (i18n.language === 'es' ? 'Error al cargar cuentas' : 'Failed to load accounts')
      );
    } finally {
      setLoading(false);
    }
  };


  // Verificar configuración de Supabase primero
  if (!isSupabaseReady()) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuración faltante</AlertTitle>
            <AlertDescription>
              Supabase no está configurado. Configure VITE_SUPABASE_URL y
              VITE_SUPABASE_ANON_KEY en las variables de entorno, o asegúrese de
              que window.__SUPABASE__ esté definido en index.html.
            </AlertDescription>
          </Alert>
        </div>
      </BackofficeLayout>
    );
  }

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <h2 className="text-3xl font-bold mb-6">{t('crm.accounts')}</h2>
          <p className="text-muted-foreground">{i18n.language === 'es' ? 'Cargando...' : 'Loading...'}</p>
        </div>
      </BackofficeLayout>
    );
  }

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
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKind = kindFilter === 'all' || acc.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

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
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ViewFilterTabs value={viewFilter} onValueChange={setViewFilter} />
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
          {filteredAccounts.map((account) => (
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
                        {account.kind} • {account.contact_count} {account.contact_count === 1 ? 'contact' : 'contacts'} • {format(new Date(account.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {!account.is_active && (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                    <SoftDeleteActions
                      table="accounts"
                      id={account.id}
                      isDeleted={!!account.deleted_at}
                      onActionComplete={loadAccounts}
                      inline
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

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
