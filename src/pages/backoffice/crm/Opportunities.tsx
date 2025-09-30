import { useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCRMStore } from '@/services/crmStore';
import { getOpportunityStageLabel } from '@/lib/crm-integrations';
import { Plus, TrendingUp, Filter, X, Maximize2, Minimize2, Kanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { OpportunityStage } from '@/types';

export default function Opportunities() {
  const { t } = useTranslation();
  const { opportunities } = useCRMStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<OpportunityStage | 'all'>('all');
  const [compactView, setCompactView] = useState(false);

  const getStageColor = (stage: string) => {
    const colors = {
      new: 'bg-blue-500',
      qualified: 'bg-cyan-500',
      visit: 'bg-indigo-500',
      quote: 'bg-purple-500',
      negotiation: 'bg-orange-500',
      won: 'bg-green-500',
      lost: 'bg-gray-500',
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-500';
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = searchTerm === '' || 
      opp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.account?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || opp.pipeline_stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const hasActiveFilters = stageFilter !== 'all' || searchTerm !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStageFilter('all');
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6 bg-background">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-foreground">{t('crm.opportunities')}</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/backoffice/crm/opportunities/kanban')}>
              <Kanban className="h-4 w-4 mr-2" />
              {t('crm.kanbanView')}
            </Button>
            <Button onClick={() => navigate('/backoffice/crm/opportunities/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('crm.addOpportunity')}
            </Button>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {t('crm.filterByStage')}
                </label>
                <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as OpportunityStage | 'all')}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">{t('crm.allStages')}</SelectItem>
                    <SelectItem value="new">{getOpportunityStageLabel('new', t)}</SelectItem>
                    <SelectItem value="qualified">{getOpportunityStageLabel('qualified', t)}</SelectItem>
                    <SelectItem value="visit">{getOpportunityStageLabel('visit', t)}</SelectItem>
                    <SelectItem value="quote">{getOpportunityStageLabel('quote', t)}</SelectItem>
                    <SelectItem value="negotiation">{getOpportunityStageLabel('negotiation', t)}</SelectItem>
                    <SelectItem value="won">{getOpportunityStageLabel('won', t)}</SelectItem>
                    <SelectItem value="lost">{getOpportunityStageLabel('lost', t)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredOpportunities.length} {filteredOpportunities.length === 1 ? 'opportunity' : 'opportunities'}
        </div>

        {/* Opportunities List */}
        <div className="grid gap-3">
          {filteredOpportunities.map((opp) => (
            <Card
              key={opp.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors bg-card border-border"
              onClick={() => navigate(`/backoffice/crm/opportunities/${opp.id}`)}
            >
              <CardHeader className={compactView ? 'py-3' : undefined}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className={compactView ? 'text-base truncate' : 'text-lg'}>{opp.name}</CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {opp.account?.name} • {format(new Date(opp.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Badge className={getStageColor(opp.pipeline_stage)}>
                      {getOpportunityStageLabel(opp.pipeline_stage, t)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {!compactView && opp.expected_close_at && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Expected Close: <span className="font-medium text-foreground">{format(new Date(opp.expected_close_at), 'MMM d, yyyy')}</span>
                  </p>
                </CardContent>
              )}
            </Card>
          ))}

          {filteredOpportunities.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? 'No opportunities match your filters.' : 'No opportunities yet. Create your first opportunity.'}
                </p>
                <Button className="mt-4" onClick={() => navigate('/backoffice/crm/opportunities/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('crm.addOpportunity')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
