import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCRMStore } from '@/services/crmStore';
import { Plus, Phone, Mail, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

export default function Leads() {
  const { t } = useTranslation();
  const { leads } = useCRMStore();
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-500',
      qualified: 'bg-green-500',
      disqualified: 'bg-gray-500',
      converted: 'bg-purple-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">{t('crm.leads')}</h2>
          <Button onClick={() => navigate('/backoffice/crm/leads/new')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('crm.addLead')}
          </Button>
        </div>

        <div className="grid gap-4">
          {leads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => navigate(`/backoffice/crm/leads/${lead.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getSourceIcon(lead.source)}
                    <div>
                      <CardTitle className="text-lg">
                        {lead.account?.name || lead.contact?.first_name + ' ' + lead.contact?.last_name || 'Unnamed Lead'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t(`crm.source${lead.source.charAt(0).toUpperCase() + lead.source.slice(1).replace('_', '')}`)} • {format(new Date(lead.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                    {lead.lead_score > 0 && (
                      <Badge variant="outline">Score: {lead.lead_score}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              {lead.category_interest && (
                <CardContent className="pt-0">
                  <p className="text-sm">
                    Interest: <span className="font-medium">{lead.category_interest}</span>
                  </p>
                </CardContent>
              )}
            </Card>
          ))}

          {leads.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No leads yet. Create your first lead.</p>
                <Button className="mt-4" onClick={() => navigate('/backoffice/crm/leads/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('crm.addLead')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
