import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCRMStore } from '@/services/crmStore';
import { Plus, TrendingUp, Eye, Table as TableIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { OpportunityStage } from '@/types';

const stages: { key: OpportunityStage; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'bg-blue-500' },
  { key: 'qualified', label: 'Qualified', color: 'bg-cyan-500' },
  { key: 'visit', label: 'Visit', color: 'bg-indigo-500' },
  { key: 'quote', label: 'Quote', color: 'bg-purple-500' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { key: 'won', label: 'Won', color: 'bg-green-500' },
  { key: 'lost', label: 'Lost', color: 'bg-gray-500' },
];

export default function OpportunityKanban() {
  const { t } = useTranslation();
  const { opportunities, updateOpportunity, getOpportunityUnits } = useCRMStore();
  const navigate = useNavigate();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, opportunityId: string) => {
    setDraggedItem(opportunityId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: OpportunityStage) => {
    e.preventDefault();
    if (draggedItem) {
      updateOpportunity(draggedItem, { pipeline_stage: targetStage });
      setDraggedItem(null);
    }
  };

  const getOpportunityValue = (opportunityId: string) => {
    const units = getOpportunityUnits(opportunityId);
    return units.reduce((sum, ou) => sum + (ou.agreed_unit_price || 0), 0);
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">{t('crm.opportunities')} - Kanban</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/backoffice/crm/opportunities')}>
              <TableIcon className="h-4 w-4 mr-2" />
              Table View
            </Button>
            <Button onClick={() => navigate('/backoffice/crm/opportunities/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('crm.addOpportunity')}
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-7 gap-4 min-h-[600px]">
          {stages.map((stage) => {
            const stageOpportunities = opportunities.filter(
              (opp) => opp.pipeline_stage === stage.key
            );

            return (
              <div
                key={stage.key}
                className="bg-muted/30 rounded-lg p-4"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`${stage.color} text-white`}>
                      {stage.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({stageOpportunities.length})
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {stageOpportunities.map((opp) => {
                    const value = getOpportunityValue(opp.id);
                    const unitsCount = getOpportunityUnits(opp.id).length;

                    return (
                      <Card
                        key={opp.id}
                        className="cursor-move hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium line-clamp-2">
                            {opp.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {opp.account?.name}
                          </p>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {value > 0 && (
                              <div className="text-sm font-semibold text-green-600">
                                ${value.toLocaleString()}
                              </div>
                            )}
                            {unitsCount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {unitsCount} unit{unitsCount !== 1 ? 's' : ''}
                              </div>
                            )}
                            {opp.expected_close_at && (
                              <div className="text-xs text-muted-foreground">
                                Close: {format(new Date(opp.expected_close_at), 'MMM d')}
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(opp.created_at), 'MMM d')}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/backoffice/crm/opportunities/${opp.id}`);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {stageOpportunities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No opportunities
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4">
              {stages.map((stage) => {
                const stageOpportunities = opportunities.filter(
                  (opp) => opp.pipeline_stage === stage.key
                );
                const stageValue = stageOpportunities.reduce(
                  (sum, opp) => sum + getOpportunityValue(opp.id),
                  0
                );

                return (
                  <div key={stage.key} className="text-center">
                    <div className="text-sm font-medium">{stage.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {stageOpportunities.length} opps
                    </div>
                    {stageValue > 0 && (
                      <div className="text-sm font-semibold text-green-600">
                        ${stageValue.toLocaleString()}
                      </div>
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