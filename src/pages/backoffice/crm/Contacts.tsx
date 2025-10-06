import { useState, useEffect } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { getEmailLink, getPhoneLink, getWhatsAppLink } from '@/lib/crm-integrations';
import { Plus, UserCircle, Mail, Phone, MessageSquare, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SoftDeleteActions } from '@/components/common/SoftDeleteActions';
import { ViewFilterTabs } from '@/components/common/ViewFilterTabs';
import { ViewFilter } from '@/hooks/useSoftDelete';

type Contact = {
  id: string;
  account_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  deleted_at: string | null;
  account?: {
    id: string;
    name: string;
  };
};

export default function Contacts() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('active');

  useEffect(() => {
    loadContacts();
  }, [viewFilter]);

  const loadContacts = async () => {
    try {
      let query = supabase
        .from('contacts')
        .select('id, account_id, first_name, last_name, email, phone, created_at, deleted_at, accounts(id, name)')
        .order('created_at', { ascending: false });

      if (viewFilter === 'active') {
        query = query.is('deleted_at', null);
      } else if (viewFilter === 'trash') {
        query = query.not('deleted_at', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform to match our type
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        account: item.accounts ? { id: item.accounts.id, name: item.accounts.name } : undefined,
      }));

      setContacts(transformedData);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al cargar contactos' : 'Failed to load contacts'));
    } finally {
      setLoading(false);
    }
  };


  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchTerm));
    return matchesSearch;
  });

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <h2 className="text-3xl font-bold mb-6">{t('crm.contacts')}</h2>
          <p className="text-muted-foreground">{i18n.language === 'es' ? 'Cargando...' : 'Loading...'}</p>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">{t('crm.contacts')}</h2>
          <Button onClick={() => navigate('/backoffice/crm/contacts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('crm.addContact')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ViewFilterTabs value={viewFilter} onValueChange={setViewFilter} />
        </div>

        <div className="grid gap-4">
          {filteredContacts.map((contact) => (
            <Card
              key={contact.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => navigate(`/backoffice/crm/contacts/${contact.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserCircle className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">
                        {contact.first_name} {contact.last_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {contact.account?.name || 'No account'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm space-y-1">
                      {contact.email && (
                        <div className="flex items-center justify-end space-x-2">
                          <span>{contact.email}</span>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={getEmailLink(contact.email)} onClick={(e) => e.stopPropagation()}>
                              <Mail className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center justify-end space-x-2">
                          <span>{contact.phone}</span>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={getPhoneLink(contact.phone)} onClick={(e) => e.stopPropagation()}>
                              <Phone className="h-3 w-3" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={getWhatsAppLink(contact.phone)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                              <MessageSquare className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                    <SoftDeleteActions
                      table="contacts"
                      id={contact.id}
                      isDeleted={!!contact.deleted_at}
                      onActionComplete={loadContacts}
                      inline
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

          {filteredContacts.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || viewFilter !== 'active' ? 'No contacts found matching your filters.' : 'No contacts yet. Create your first contact.'}
                </p>
                {!searchTerm && viewFilter === 'active' && (
                  <Button className="mt-4" onClick={() => navigate('/backoffice/crm/contacts/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('crm.addContact')}
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
