import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { getEmailLink, getPhoneLink, getWhatsAppLink } from '@/lib/crm-integrations';
import { User, Mail, Phone, MessageSquare, Building } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role_title?: string | null;
  account_id: string;
  preferred_lang?: string | null;
  created_at: string;
};

type Account = {
  id: string;
  name: string;
  kind: 'company' | 'individual';
};

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [contact, setContact] = useState<Contact | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadContact();
    }
  }, [id]);

  const loadContact = async () => {
    if (!id) return;
    
    try {
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (contactError) throw contactError;
      setContact(contactData);

      if (contactData.account_id) {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('id, name, kind')
          .eq('id', contactData.account_id)
          .is('deleted_at', null)
          .single();
        setAccount(accountData);
      }
    } catch (error: any) {
      console.error('Error loading contact:', error);
      toast.error(error?.message ?? 'Failed to load contact');
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

  if (!contact) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p>{i18n.language === 'es' ? 'Contacto no encontrado' : 'Contact not found'}</p>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">
                {contact.first_name} {contact.last_name}
              </h2>
            </div>
            <p className="text-muted-foreground">
              {i18n.language === 'es' ? 'Creado' : 'Created'}: {format(new Date(contact.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/backoffice/crm/contacts')}>
            {i18n.language === 'es' ? 'Volver' : 'Back'}
          </Button>
        </div>

        {/* Contact Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {i18n.language === 'es' ? 'Información de Contacto' : 'Contact Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {i18n.language === 'es' ? 'Nombre' : 'Name'}
                </label>
                <p className="text-lg font-medium">
                  {contact.first_name} {contact.last_name}
                </p>
              </div>

              {contact.role_title && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'es' ? 'Cargo' : 'Role'}
                  </label>
                  <p>{contact.role_title}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="flex items-center gap-2">
                  <p>{contact.email}</p>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={getEmailLink(contact.email)} className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>

              {contact.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'es' ? 'Teléfono' : 'Phone'}
                  </label>
                  <div className="flex items-center gap-2">
                    <p>{contact.phone}</p>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={getPhoneLink(contact.phone)} className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={getWhatsAppLink(contact.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {contact.preferred_lang && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'es' ? 'Idioma Preferido' : 'Preferred Language'}
                  </label>
                  <p className="uppercase">{contact.preferred_lang}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {account && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {i18n.language === 'es' ? 'Cuenta Asociada' : 'Associated Account'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                  onClick={() => navigate(`/backoffice/crm/accounts/${account.id}`)}
                >
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{account.kind}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    {i18n.language === 'es' ? 'Ver Detalles' : 'View Details'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
