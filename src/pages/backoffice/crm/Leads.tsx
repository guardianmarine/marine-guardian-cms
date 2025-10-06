import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Search, ExternalLink, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { SoftDeleteActions } from '@/components/common/SoftDeleteActions';
import { ViewFilterTabs } from '@/components/common/ViewFilterTabs';
import { ViewFilter } from '@/hooks/useSoftDelete';

type Lead = {
  id: string;
  source: string;
  stage: string;
  account_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  unit_id: string | null;
  created_at: string;
  deleted_at: string | null;
};

type UnitInfo = {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  slug?: string;
};

type Stage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed_won' | 'closed_lost' | 'archived' | 'all';

export default function Leads() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, UnitInfo>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<Stage>('all');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('active');

  useEffect(() => {
    loadLeads();
  }, [viewFilter]);

  const loadLeads = async () => {
    try {
      let query = supabase
        .from('leads')
        .select('id, source, stage, account_name, contact_email, contact_phone, unit_id, created_at, deleted_at')
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply deleted_at filter based on viewFilter
      if (viewFilter === 'active') {
        query = query.is('deleted_at', null);
      } else if (viewFilter === 'trash') {
        query = query.not('deleted_at', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeads(data || []);

      // Fetch referenced units
      const unitIds = Array.from(new Set((data || []).map(r => r.unit_id).filter(Boolean) as string[]));
      if (unitIds.length > 0) {
        try {
          const { data: units } = await supabase
            .from('units')
            .select('id, make, model, year, slug')
            .in('id', unitIds);
          
          setUnitsById(Object.fromEntries((units ?? []).map(u => [String(u.id), u])));
        } catch (unitError) {
          console.error('Error loading units:', unitError);
        }
      }
    } catch (error: any) {
      console.error('Error loading leads:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al cargar leads' : 'Failed to load leads'));
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.contact_email && lead.contact_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.contact_phone && lead.contact_phone.includes(searchTerm));
    const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getStageVariant = (stage: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (stage) {
      case 'new':
        return 'default';
      case 'contacted':
      case 'qualified':
        return 'secondary';
      case 'closed_won':
        return 'outline';
      case 'closed_lost':
      case 'archived':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleStageChange = async (id: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', id);

      if (error) throw error;

      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, stage: newStage } : lead))
      );
      toast.success(i18n.language === 'es' ? 'Etapa actualizada' : 'Stage updated');
    } catch (error: any) {
      console.error('Error updating stage:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al actualizar' : 'Failed to update'));
    }
  };


  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <h2 className="text-3xl font-bold mb-6">
            {i18n.language === 'es' ? 'Leads' : 'Leads'}
          </h2>
          <p className="text-muted-foreground">{i18n.language === 'es' ? 'Cargando...' : 'Loading...'}</p>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold">
            {i18n.language === 'es' ? 'Leads' : 'Leads'}
          </h2>
          <p className="text-muted-foreground">
            {i18n.language === 'es'
              ? 'Gestionar leads de ventas'
              : 'Manage sales leads'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={i18n.language === 'es' ? 'Buscar...' : 'Search...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ViewFilterTabs value={viewFilter} onValueChange={setViewFilter} />
          <Select value={stageFilter} onValueChange={(v: Stage) => setStageFilter(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{i18n.language === 'es' ? 'Todas las Etapas' : 'All Stages'}</SelectItem>
              <SelectItem value="new">{i18n.language === 'es' ? 'Nuevo' : 'New'}</SelectItem>
              <SelectItem value="contacted">{i18n.language === 'es' ? 'Contactado' : 'Contacted'}</SelectItem>
              <SelectItem value="qualified">{i18n.language === 'es' ? 'Calificado' : 'Qualified'}</SelectItem>
              <SelectItem value="proposal">{i18n.language === 'es' ? 'Propuesta' : 'Proposal'}</SelectItem>
              <SelectItem value="closed_won">{i18n.language === 'es' ? 'Ganado' : 'Won'}</SelectItem>
              <SelectItem value="closed_lost">{i18n.language === 'es' ? 'Perdido' : 'Lost'}</SelectItem>
              <SelectItem value="archived">{i18n.language === 'es' ? 'Archivado' : 'Archived'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{i18n.language === 'es' ? 'Creado' : 'Created'}</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Etapa' : 'Stage'}</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Cuenta' : 'Account'}</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Teléfono' : 'Phone'}</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Unidad' : 'Unit'}</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {i18n.language === 'es' ? 'Aún no hay leads.' : 'No leads yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/backoffice/crm/leads/${lead.id}`)}
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        <span title={new Date(lead.created_at).toLocaleString()}>
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={lead.stage}
                          onValueChange={(v) => handleStageChange(lead.id, v)}
                        >
                          <SelectTrigger className="w-32">
                            <Badge variant={getStageVariant(lead.stage)}>{lead.stage}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">{i18n.language === 'es' ? 'Nuevo' : 'New'}</SelectItem>
                            <SelectItem value="contacted">{i18n.language === 'es' ? 'Contactado' : 'Contacted'}</SelectItem>
                            <SelectItem value="qualified">{i18n.language === 'es' ? 'Calificado' : 'Qualified'}</SelectItem>
                            <SelectItem value="proposal">{i18n.language === 'es' ? 'Propuesta' : 'Proposal'}</SelectItem>
                            <SelectItem value="closed_won">{i18n.language === 'es' ? 'Ganado' : 'Won'}</SelectItem>
                            <SelectItem value="closed_lost">{i18n.language === 'es' ? 'Perdido' : 'Lost'}</SelectItem>
                            <SelectItem value="archived">{i18n.language === 'es' ? 'Archivado' : 'Archived'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-medium">{lead.account_name}</TableCell>
                      <TableCell className="text-sm">{lead.contact_email || '-'}</TableCell>
                      <TableCell className="text-sm">{lead.contact_phone || '-'}</TableCell>
                      <TableCell>
                        {lead.unit_id && unitsById[lead.unit_id] ? (
                          <Link
                            to={
                              unitsById[lead.unit_id].slug
                                ? `/inventory/${unitsById[lead.unit_id].year || 'unit'}/${unitsById[lead.unit_id].slug}`
                                : `/unit/${unitsById[lead.unit_id].id}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <span className="text-sm">
                              {[
                                unitsById[lead.unit_id].year,
                                unitsById[lead.unit_id].make,
                                unitsById[lead.unit_id].model,
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/backoffice/crm/leads/${lead.id}`);
                            }}
                            title={i18n.language === 'es' ? 'Ver Detalles' : 'View Details'}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <SoftDeleteActions
                            table="leads"
                            id={lead.id}
                            isDeleted={!!lead.deleted_at}
                            onActionComplete={loadLeads}
                            inline
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
