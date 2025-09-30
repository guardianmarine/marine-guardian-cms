import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCRMStore } from '@/services/crmStore';
import { getEmailLink, getPhoneLink, getWhatsAppLink } from '@/lib/crm-integrations';
import { Plus, UserCircle, Mail, Phone, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Contacts() {
  const { t } = useTranslation();
  const { contacts } = useCRMStore();
  const navigate = useNavigate();

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

        <div className="grid gap-4">
          {contacts.map((contact) => (
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
                  <div className="text-right text-sm space-y-1">
                    {contact.email && (
                      <div className="flex items-center justify-end space-x-2">
                        <span>{contact.email}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getEmailLink(contact.email)}>
                            <Mail className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center justify-end space-x-2">
                        <span>{contact.phone}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getPhoneLink(contact.phone)}>
                            <Phone className="h-3 w-3" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getWhatsAppLink(contact.phone)} target="_blank" rel="noopener noreferrer">
                            <MessageSquare className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

          {contacts.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No contacts yet. Create your first contact.</p>
                <Button className="mt-4" onClick={() => navigate('/backoffice/crm/contacts/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('crm.addContact')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
