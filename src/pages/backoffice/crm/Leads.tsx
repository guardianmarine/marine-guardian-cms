import { useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCRMStore } from '@/services/crmStore';
import { getLeadSourceLabel, getLeadStatusLabel } from '@/lib/crm-integrations';
import { Plus, Phone, Mail, MessageSquare, Filter, X, Maximize2, Minimize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { LeadStatus, LeadSource } from '@/types';

export default function Leads() {
  const { t } = useTranslation();
  const { leads } = useCRMStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');
  const [compactView, setCompactView] = useState(false);

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

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = searchTerm === '' || 
      lead.account?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact?.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const hasActiveFilters = statusFilter !== 'all' || sourceFilter !== 'all' || searchTerm !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSourceFilter('all');
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6 bg-background">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-foreground">{t('crm.leads')}</h2>
          <Button onClick={() => navigate('/backoffice/crm/leads/new')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('crm.addLead')}
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {t('crm.filters')}
              </CardTitle>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    {t('crm.clearFilters')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompactView(!compactView)}
                >
                  {compactView ? (
                    <>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      {t('crm.normalView')}
                    </>
                  ) : (
                    <>
                      <Minimize2 className="h-4 w-4 mr-2" />
                      {t('crm.compactView')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('common.search')}
                </label>
                <Input
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-background border-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('crm.filterByStatus')}
                </label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | 'all')}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">{t('crm.allStatuses')}</SelectItem>
                    <SelectItem value="new">{getLeadStatusLabel('new', t)}</SelectItem>
                    <SelectItem value="qualified">{getLeadStatusLabel('qualified', t)}</SelectItem>
                    <SelectItem value="disqualified">{getLeadStatusLabel('disqualified', t)}</SelectItem>
                    <SelectItem value="converted">{getLeadStatusLabel('converted', t)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('crm.filterBySource')}
                </label>
                <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as LeadSource | 'all')}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">{t('crm.allSources')}</SelectItem>
                    <SelectItem value="web_form">{getLeadSourceLabel('web_form', t)}</SelectItem>
                    <SelectItem value="phone">{getLeadSourceLabel('phone', t)}</SelectItem>
                    <SelectItem value="whatsapp">{getLeadSourceLabel('whatsapp', t)}</SelectItem>
                    <SelectItem value="email">{getLeadSourceLabel('email', t)}</SelectItem>
                    <SelectItem value="referral">{getLeadSourceLabel('referral', t)}</SelectItem>
                    <SelectItem value="campaign">{getLeadSourceLabel('campaign', t)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
        </div>

        {/* Leads List */}
        <div className="grid gap-3">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors bg-card border-border"
              onClick={() => navigate(`/backoffice/crm/leads/${lead.id}`)}
            >
              <CardHeader className={compactView ? 'py-3' : undefined}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {getSourceIcon(lead.source)}
                    <div className="flex-1 min-w-0">
                      <CardTitle className={compactView ? 'text-base' : 'text-lg'}>
                        {lead.account?.name || lead.contact?.first_name + ' ' + lead.contact?.last_name || 'Unnamed Lead'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {getLeadSourceLabel(lead.source, t)} • {format(new Date(lead.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(lead.status)}>
                      {getLeadStatusLabel(lead.status, t)}
                    </Badge>
                    {lead.lead_score > 0 && (
                      <Badge variant="outline">Score: {lead.lead_score}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              {!compactView && lead.category_interest && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Interest: <span className="font-medium text-foreground">{lead.category_interest}</span>
                  </p>
                </CardContent>
              )}
            </Card>
          ))}

          {filteredLeads.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? 'No leads match your filters.' : 'No leads yet. Create your first lead.'}
                </p>
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
