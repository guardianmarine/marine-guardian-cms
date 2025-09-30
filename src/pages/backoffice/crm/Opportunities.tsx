import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCRMStore } from '@/services/crmStore';
import { Plus, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

export default function Opportunities() {
  const { t } = useTranslation();
  const { opportunities } = useCRMStore();
  const navigate = useNavigate();

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

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">{t('crm.opportunities')}</h2>
          <Button onClick={() => navigate('/backoffice/crm/opportunities/new')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('crm.addOpportunity')}
          </Button>
        </div>

        <div className="grid gap-4">
          {opportunities.map((opp) => (
            <Card
              key={opp.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => navigate(`/backoffice/crm/opportunities/${opp.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{opp.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {opp.account?.name} • {format(new Date(opp.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStageColor(opp.pipeline_stage)}>
                      {t(`crm.stage${opp.pipeline_stage.charAt(0).toUpperCase() + opp.pipeline_stage.slice(1)}`)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {opp.expected_close_at && (
                <CardContent className="pt-0">
                  <p className="text-sm">
                    Expected Close: <span className="font-medium">{format(new Date(opp.expected_close_at), 'MMM d, yyyy')}</span>
                  </p>
                </CardContent>
              )}
            </Card>
          ))}

          {opportunities.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No opportunities yet. Create your first opportunity.</p>
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
