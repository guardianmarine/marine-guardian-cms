import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCRMStore } from '@/services/crmStore';
import { OpportunityStage } from '@/types';
import { Plus, Search, Grip } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PIPELINE_STAGES: { stage: OpportunityStage; label: string; color: string }[] = [
  { stage: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { stage: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { stage: 'visit', label: 'Visit', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { stage: 'quote', label: 'Quote', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { stage: 'negotiation', label: 'Negotiation', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { stage: 'won', label: 'Won', color: 'bg-green-100 text-green-800 border-green-200' },
  { stage: 'lost', label: 'Lost', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

export default function Opportunities() {
  const { opportunities, opportunityUnits, updateOpportunity } = useCRMStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<OpportunityStage | 'all'>('all');
  const [draggedOpp, setDraggedOpp] = useState<string | null>(null);

  // Filter opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      !searchQuery ||
      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.account?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage = stageFilter === 'all' || opp.pipeline_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  // Get units count and estimated value for an opportunity
  const getOpportunityStats = (oppId: string) => {
    const units = opportunityUnits.filter((ou) => ou.opportunity_id === oppId);
    const totalValue = units.reduce((sum, ou) => sum + (ou.agreed_unit_price || 0), 0);
    return { unitsCount: units.length, estimatedValue: totalValue };
  };

  // Drag and drop handlers
  const handleDragStart = (oppId: string) => {
    setDraggedOpp(oppId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stage: OpportunityStage) => {
    if (draggedOpp) {
      updateOpportunity(draggedOpp, { pipeline_stage: stage });
      setDraggedOpp(null);
    }
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Opportunities</h1>
            <p className="text-muted-foreground">Manage your sales pipeline</p>
          </div>
          <Link to="/backoffice/crm/opportunities/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Opportunity
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="kanban" className="space-y-6">
          <TabsList>
            <TabsTrigger value="kanban">Kanban View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>

          {/* Kanban View */}
          <TabsContent value="kanban" className="space-y-4">
            <div className="grid grid-cols-7 gap-4 overflow-x-auto">
              {PIPELINE_STAGES.map((stageInfo) => {
                const stageOpps = filteredOpportunities.filter(
                  (opp) => opp.pipeline_stage === stageInfo.stage
                );

                return (
                  <div
                    key={stageInfo.stage}
                    className="min-w-[250px]"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(stageInfo.stage)}
                  >
                    <div className={`rounded-lg border-2 ${stageInfo.color} p-3 mb-3`}>
                      <h3 className="font-semibold flex items-center justify-between">
                        {stageInfo.label}
                        <Badge variant="secondary">{stageOpps.length}</Badge>
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {stageOpps.map((opp) => {
                        const stats = getOpportunityStats(opp.id);
                        return (
                          <Card
                            key={opp.id}
                            draggable
                            onDragStart={() => handleDragStart(opp.id)}
                            className="cursor-move hover:shadow-md transition-shadow"
                          >
                            <CardHeader className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-sm font-medium">{opp.name}</CardTitle>
                                <Grip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-2">
                              <div className="text-sm text-muted-foreground">
                                {opp.account?.name || 'No account'}
                              </div>
                              {stats.unitsCount > 0 && (
                                <div className="text-sm">
                                  <div className="font-medium">{stats.unitsCount} units</div>
                                  {stats.estimatedValue > 0 && (
                                    <div className="text-muted-foreground">
                                      Est. ${stats.estimatedValue.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              )}
                              {opp.expected_close_at && (
                                <div className="text-xs text-muted-foreground">
                                  Close: {new Date(opp.expected_close_at).toLocaleDateString()}
                                </div>
                              )}
                              <Link to={`/backoffice/crm/opportunities/${opp.id}`}>
                                <Button variant="ghost" size="sm" className="w-full mt-2">
                                  View Details
                                </Button>
                              </Link>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Table View */}
          <TabsContent value="table">
            <div className="flex gap-4 mb-4">
              <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as OpportunityStage | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {PIPELINE_STAGES.map((s) => (
                    <SelectItem key={s.stage} value={s.stage}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Est. Value</TableHead>
                    <TableHead>Expected Close</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOpportunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No opportunities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOpportunities.map((opp) => {
                      const stats = getOpportunityStats(opp.id);
                      const stageInfo = PIPELINE_STAGES.find((s) => s.stage === opp.pipeline_stage);

                      return (
                        <TableRow key={opp.id}>
                          <TableCell>
                            <div className="font-medium">{opp.name}</div>
                            {opp.contact && (
                              <div className="text-sm text-muted-foreground">
                                {opp.contact.first_name} {opp.contact.last_name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{opp.account?.name || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={stageInfo?.color}>
                              {stageInfo?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{stats.unitsCount}</TableCell>
                          <TableCell>
                            {stats.estimatedValue > 0
                              ? `$${stats.estimatedValue.toLocaleString()}`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {opp.expected_close_at
                              ? new Date(opp.expected_close_at).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(opp.created_at), { addSuffix: true })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/backoffice/crm/opportunities/${opp.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}
