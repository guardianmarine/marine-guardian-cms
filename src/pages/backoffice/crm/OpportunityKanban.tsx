import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCRMStore } from '@/services/crmStore';
import { getOpportunityStageLabel } from '@/lib/crm-integrations';
import { Plus, Eye, Table as TableIcon, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { OpportunityStage } from '@/types';

const stages: { key: OpportunityStage; color: string }[] = [
  { key: 'new', color: 'bg-blue-500' },
  { key: 'qualified', color: 'bg-cyan-500' },
  { key: 'visit', color: 'bg-indigo-500' },
  { key: 'quote', color: 'bg-purple-500' },
  { key: 'negotiation', color: 'bg-orange-500' },
  { key: 'won', color: 'bg-green-500' },
  { key: 'lost', color: 'bg-gray-500' },
];

export default function OpportunityKanban() {
  const { t } = useTranslation();
  const { opportunities, updateOpportunity, getOpportunityUnits } = useCRMStore();
  const navigate = useNavigate();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  
  // Keyboard navigation state
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [focusedStage, setFocusedStage] = useState<OpportunityStage>('new');
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle drag and drop
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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, opportunityId: string, currentStage: OpportunityStage) => {
    const currentStageIndex = stages.findIndex(s => s.key === currentStage);
    const stageOpportunities = opportunities.filter(opp => opp.pipeline_stage === currentStage);
    const currentCardIndex = stageOpportunities.findIndex(opp => opp.id === opportunityId);

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (currentStageIndex > 0) {
          const prevStage = stages[currentStageIndex - 1].key;
          setFocusedStage(prevStage);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (currentStageIndex < stages.length - 1) {
          const nextStage = stages[currentStageIndex + 1].key;
          setFocusedStage(nextStage);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentCardIndex > 0) {
          const prevCard = stageOpportunities[currentCardIndex - 1];
          setSelectedCard(prevCard.id);
          cardRefs.current[prevCard.id]?.focus();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentCardIndex < stageOpportunities.length - 1) {
          const nextCard = stageOpportunities[currentCardIndex + 1];
          setSelectedCard(nextCard.id);
          cardRefs.current[nextCard.id]?.focus();
        }
        break;
      case ' ':
        e.preventDefault();
        setSelectedCard(selectedCard === opportunityId ? null : opportunityId);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedCard) {
          const targetStageIndex = stages.findIndex(s => s.key === focusedStage);
          if (targetStageIndex !== currentStageIndex) {
            updateOpportunity(selectedCard, { pipeline_stage: focusedStage });
            setSelectedCard(null);
          }
        }
        break;
    }
  };

  const getOpportunityValue = (opportunityId: string) => {
    const units = getOpportunityUnits(opportunityId);
    return units.reduce((sum, ou) => sum + (ou.agreed_unit_price || 0), 0);
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6 bg-background">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-foreground">{t('crm.opportunities')} - {t('crm.kanbanView')}</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/backoffice/crm/opportunities')}>
              <TableIcon className="h-4 w-4 mr-2" />
              {t('crm.tableView')}
            </Button>
            <Button onClick={() => navigate('/backoffice/crm/opportunities/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('crm.addOpportunity')}
            </Button>
          </div>
        </div>

        {/* Keyboard help */}
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
            {t('crm.keyboardNavigation')}
          </AlertDescription>
        </Alert>

        {/* Kanban Board */}
        <div className="grid grid-cols-7 gap-4 min-h-[600px]">
          {stages.map((stage) => {
            const stageOpportunities = opportunities.filter(
              (opp) => opp.pipeline_stage === stage.key
            );

            return (
              <div
                key={stage.key}
                className={`bg-muted/30 rounded-lg p-4 border-2 transition-colors ${
                  focusedStage === stage.key ? 'border-primary' : 'border-transparent'
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`${stage.color} text-white`}>
                      {getOpportunityStageLabel(stage.key, t)}
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
                        ref={(el) => (cardRefs.current[opp.id] = el)}
                        className={`cursor-move hover:shadow-md transition-all bg-card border-border ${
                          selectedCard === opp.id ? 'ring-2 ring-primary' : ''
                        }`}
                        draggable
                        tabIndex={0}
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        onKeyDown={(e) => handleKeyDown(e, opp.id, stage.key)}
                        onFocus={() => setFocusedStage(stage.key)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium line-clamp-2 text-foreground">
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
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Pipeline Summary</CardTitle>
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
                    <div className="text-sm font-medium text-foreground">
                      {getOpportunityStageLabel(stage.key, t)}
                    </div>
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
