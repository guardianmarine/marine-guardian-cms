import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { getEmailLink, getPhoneLink, getWhatsAppLink } from '@/lib/crm-integrations';
import { listContactsByAccount } from '@/services/crm/contacts.service';
import { Building, TrendingUp, Users, Mail, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type Account = {
  id: string;
  kind: 'company' | 'individual';
  name: string;
  tax_id?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  billing_address?: string | null;
  billing_state?: string | null;
  billing_country?: string | null;
  is_tax_exempt: boolean;
  resale_cert: boolean;
  created_at: string;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role_title?: string | null;
};

type Opportunity = {
  id: string;
  stage: string;
  amount_cents?: number | null;
  expected_close_date?: string | null;
  created_at: string;
};

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsCount, setContactsCount] = useState(0);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAccount();
    }
  }, [id]);

  const loadAccount = async () => {
    if (!id) return;

    // Verificar configuración de Supabase
    if (!isSupabaseReady() || !supabase) {
      setLoading(false);
      toast.error('Supabase no está configurado correctamente');
      return;
    }
    
    try {
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (accountError) throw accountError;
      setAccount(accountData);

      // Use unified contacts service
      const { data: contactsData, count: contactsCountValue } = await listContactsByAccount(id);
      setContacts(contactsData);
      setContactsCount(contactsCountValue);

      const { data: oppsData } = await supabase
        .from('opportunities')
        .select('id, stage, amount_cents, expected_close_date, created_at')
        .eq('account_id', id)
        .is('deleted_at', null);
      setOpportunities(oppsData || []);
    } catch (error: any) {
      console.error('Error loading account:', error);
      toast.error(error?.message ?? 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p>{i18n.language === 'es' ? 'Cargando...' : 'Loading...'}</p>
        </div>
      </BackofficeLayout>
    );
  }

  if (!account) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p>{i18n.language === 'es' ? 'Cuenta no encontrada' : 'Account not found'}</p>
        </div>
      </BackofficeLayout>
    );
  }

  const wonOpportunities = opportunities.filter((opp) => opp.stage === 'won');
  const isRepeatBuyer = wonOpportunities.length > 1;

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">{account.name}</h2>
              {isRepeatBuyer && (
                <Badge className="bg-purple-500">
                  {i18n.language === 'es' ? 'Comprador Repetido' : 'Repeat Buyer'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground capitalize">
              {account.kind} • {format(new Date(account.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">
                {i18n.language === 'es' ? 'Contactos' : 'Contacts'}
              </div>
              <div className="text-2xl font-bold">{contactsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">
                {i18n.language === 'es' ? 'Oportunidades' : 'Opportunities'}
              </div>
              <div className="text-2xl font-bold">{opportunities.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">
                {i18n.language === 'es' ? 'Negocios Ganados' : 'Won Deals'}
              </div>
              <div className="text-2xl font-bold">{wonOpportunities.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              {i18n.language === 'es' ? 'Resumen' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="contacts">
              {i18n.language === 'es' ? 'Contactos' : 'Contacts'} ({contactsCount})
            </TabsTrigger>
            <TabsTrigger value="opportunities">
              {i18n.language === 'es' ? 'Oportunidades' : 'Opportunities'} ({opportunities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {i18n.language === 'es' ? 'Información de Cuenta' : 'Account Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p>{account.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="capitalize">{account.kind}</p>
                  </div>
                  {account.tax_id && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tax ID</label>
                      <p>{account.tax_id}</p>
                    </div>
                  )}
                  {account.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <div className="flex items-center gap-2">
                        <p>{account.phone}</p>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getPhoneLink(account.phone)} className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getWhatsAppLink(account.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                  {account.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="flex items-center gap-2">
                        <p>{account.email}</p>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getEmailLink(account.email)} className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                  {account.website && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Website</label>
                      <p>
                        <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-primary">
                          {account.website}
                        </a>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {i18n.language === 'es' ? 'Información de Facturación' : 'Billing Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {account.billing_address && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Address</label>
                      <p>{account.billing_address}</p>
                    </div>
                  )}
                  {account.billing_state && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">State</label>
                      <p>{account.billing_state}</p>
                    </div>
                  )}
                  {account.billing_country && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Country</label>
                      <p>{account.billing_country}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {i18n.language === 'es' ? 'Exento de Impuestos' : 'Tax Exempt'}
                    </label>
                    <p>{account.is_tax_exempt ? (i18n.language === 'es' ? 'Sí' : 'Yes') : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {i18n.language === 'es' ? 'Certificado de Reventa' : 'Resale Certificate'}
                    </label>
                    <p>{account.resale_cert ? (i18n.language === 'es' ? 'Sí' : 'Yes') : 'No'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contacts">
            <Card>
              <CardContent className="pt-6">
                {contacts.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {i18n.language === 'es' ? 'Aún no hay contactos' : 'No contacts yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() => navigate(`/backoffice/crm/contacts/${contact.id}`)}
                      >
                        <div>
                          <p className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{contact.email}</p>
                          {contact.role_title && (
                            <p className="text-xs text-muted-foreground">{contact.role_title}</p>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contact.phone || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities">
            <Card>
              <CardContent className="pt-6">
                {opportunities.length === 0 ? (
                  <div className="py-12 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {i18n.language === 'es' ? 'Aún no hay oportunidades' : 'No opportunities yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {opportunities.map((opp) => (
                      <div
                        key={opp.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() => navigate(`/backoffice/crm/opportunities/${opp.id}`)}
                      >
                        <div>
                          <p className="font-medium">
                            {account.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(opp.created_at), 'MMM d, yyyy')}
                            {opp.amount_cents && ` • $${(opp.amount_cents / 100).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={opp.stage === 'won' ? 'default' : 'secondary'}>
                            {opp.stage}
                          </Badge>
                          {opp.expected_close_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {i18n.language === 'es' ? 'Cierre' : 'Close'}: {format(new Date(opp.expected_close_date), 'MMM d')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}