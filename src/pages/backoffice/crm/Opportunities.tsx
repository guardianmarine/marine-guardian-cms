import { useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOpportunities } from '@/hooks/useOpportunities';
import { Plus, TrendingUp, Filter, X, Maximize2, Minimize2, Kanban } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

type OpportunityStage = 'new' | 'qualified' | 'quote' | 'negotiation' | 'won' | 'lost';

export default function Opportunities() {
  const { opportunities, loading } = useOpportunities();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<OpportunityStage | 'all'>('all');
  const [compactView, setCompactView] = useState(false);

  const getStageColor = (stage: string) => {
    const colors = {
      new: 'bg-blue-500',
      qualified: 'bg-cyan-500',
      quote: 'bg-purple-500',
      negotiation: 'bg-orange-500',
      won: 'bg-green-500',
      lost: 'bg-gray-500',
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-500';
  };

  const getStageLabel = (stage: string) => {
    const labels = {
      new: 'New',
      qualified: 'Qualified',
      quote: 'Quote',
      negotiation: 'Negotiation',
      won: 'Won',
      lost: 'Lost',
    };
    return labels[stage as keyof typeof labels] || stage;
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const accountName = opp.account?.name || '';
    const contactName = opp.contact ? `${opp.contact.first_name} ${opp.contact.last_name}` : '';
    
    const matchesSearch = searchTerm === '' || 
      accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contactName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || opp.stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const hasActiveFilters = stageFilter !== 'all' || searchTerm !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStageFilter('all');
  };

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6 bg-background">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-foreground">Opportunities</h2>
          <div className="flex gap-2">
            <Link to="/backoffice/crm/opportunities/kanban">
              <Button variant="outline" type="button">
                <Kanban className="h-4 w-4 mr-2" />
                Kanban View
              </Button>
            </Link>
            <Link to="/backoffice/crm/opportunities/new">
              <Button type="button">
                <Plus className="h-4 w-4 mr-2" />
                Add Opportunity
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} type="button">
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompactView(!compactView)}
                  type="button"
                >
                  {compactView ? (
                    <>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Normal View
                    </>
                  ) : (
                    <>
                      <Minimize2 className="h-4 w-4 mr-2" />
                      Compact View
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
                  Search
                </label>
                <Input
                  placeholder="Search opportunities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-background border-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Filter by Stage
                </label>
                <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as OpportunityStage | 'all')}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
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
          {filteredOpportunities.map((opp) => {
            const accountName = opp.account?.name || 'Untitled';
            const contactName = opp.contact 
              ? `${opp.contact.first_name} ${opp.contact.last_name}` 
              : '';
            const value = opp.amount_cents ? opp.amount_cents / 100 : 0;

            return (
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
                        <CardTitle className={compactView ? 'text-base truncate' : 'text-lg'}>
                          {accountName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate">
                          {contactName && `${contactName} • `}
                          {format(new Date(opp.created_at), 'MMM d, yyyy')}
                          {value > 0 && ` • $${value.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Badge className={getStageColor(opp.stage)}>
                        {getStageLabel(opp.stage)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {!compactView && opp.expected_close_date && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Expected Close: <span className="font-medium text-foreground">
                        {format(new Date(opp.expected_close_date), 'MMM d, yyyy')}
                      </span>
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {filteredOpportunities.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No opportunities found</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Pipeline Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {(['new', 'qualified', 'quote', 'negotiation', 'won', 'lost'] as OpportunityStage[]).map((stage) => {
                const stageOpps = opportunities.filter((opp) => opp.stage === stage);
                const stageValue = stageOpps.reduce((sum, opp) => 
                  sum + (opp.amount_cents ? opp.amount_cents / 100 : 0), 0
                );
                return (
                  <div key={stage} className="text-center">
                    <Badge className={getStageColor(stage) + ' mb-2'}>
                      {getStageLabel(stage)}
                    </Badge>
                    <div className="text-2xl font-bold text-foreground">{stageOpps.length}</div>
                    {stageValue > 0 && (
                      <div className="text-sm text-muted-foreground">${stageValue.toLocaleString()}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
