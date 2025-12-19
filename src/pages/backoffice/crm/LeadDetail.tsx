import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ExternalLink, Plus, Search, Car } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type Lead = {
  id: string;
  source: string;
  stage: string;
  account_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  preferred_contact: string | null;
  unit_id: string | null;
  buyer_request_id: string | null;
  notes: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type UnitInfo = {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  slug?: string;
  stock_number?: string;
  title?: string;
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UnitInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (id) loadLead();
  }, [id]);

  // Search units when query changes
  useEffect(() => {
    if (!assignModalOpen) return;
    const timer = setTimeout(() => {
      searchUnits(unitSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [unitSearch, assignModalOpen]);

  const loadLead = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setLead(data);

      // Fetch unit if present (with schema-safe fallback)
      if (data.unit_id) {
        await fetchUnit(data.unit_id);
      }
    } catch (error: any) {
      console.error('Error loading lead:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al cargar lead' : 'Failed to load lead'));
    } finally {
      setLoading(false);
    }
  };

  const fetchUnit = async (unitId: string) => {
    try {
      // Try new schema first
      let { data: unitData, error } = await supabase
        .from('units')
        .select('id, stock_number, title, make, model, year, slug')
        .eq('id', unitId)
        .single();

      // Fallback if columns don't exist
      if (error && error.message?.includes('does not exist')) {
        const fallback = await supabase
          .from('units')
          .select('id, make, model, year, slug')
          .eq('id', unitId)
          .single();
        unitData = fallback.data ? { ...fallback.data, stock_number: undefined, title: undefined } as any : null;
      }

      if (unitData) setUnit(unitData);
    } catch (err) {
      console.error('Error fetching unit:', err);
    }
  };

  const searchUnits = async (query: string) => {
    setSearchLoading(true);
    try {
      let supaQuery = supabase.from('units').select('id, stock_number, title, make, model, year, slug');
      
      if (query.trim()) {
        supaQuery = supaQuery.or(`stock_number.ilike.%${query}%,title.ilike.%${query}%,make.ilike.%${query}%,model.ilike.%${query}%`);
      }

      const { data, error } = await supaQuery.limit(20);
      
      if (error) {
        // Fallback without stock_number/title
        const fallback = await supabase
          .from('units')
          .select('id, make, model, year, slug')
          .or(`make.ilike.%${query}%,model.ilike.%${query}%`)
          .limit(20);
        setSearchResults((fallback.data ?? []).map(u => ({ ...u, stock_number: undefined, title: undefined })));
      } else {
        setSearchResults(data ?? []);
      }
    } catch (err) {
      console.error('Error searching units:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const getUnitLabel = (u: UnitInfo) => {
    return u.stock_number 
      || u.title 
      || [u.year, u.make, u.model].filter(Boolean).join(' ').trim() 
      || u.slug 
      || '—';
  };

  const handleAssignUnit = async (unitId: string) => {
    if (!lead) return;
    try {
      const { error } = await supabase
        .from('leads')
        .update({ unit_id: unitId })
        .eq('id', lead.id);

      if (error) throw error;
      
      setLead({ ...lead, unit_id: unitId });
      await fetchUnit(unitId);
      setAssignModalOpen(false);
      toast.success(i18n.language === 'es' ? 'Unidad asignada' : 'Unit assigned');
    } catch (error: any) {
      console.error('Error assigning unit:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al asignar' : 'Failed to assign'));
    }
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          stage: lead.stage,
          notes: lead.notes,
        })
        .eq('id', lead.id);

      if (error) throw error;
      toast.success(i18n.language === 'es' ? 'Lead actualizado' : 'Lead updated');
    } catch (error: any) {
      console.error('Error updating lead:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al actualizar' : 'Failed to update'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p className="text-muted-foreground">{i18n.language === 'es' ? 'Cargando...' : 'Loading...'}</p>
        </div>
      </BackofficeLayout>
    );
  }

  if (!lead) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p className="text-muted-foreground">{i18n.language === 'es' ? 'Lead no encontrado' : 'Lead not found'}</p>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/backoffice/crm/leads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{lead.account_name}</h2>
            <p className="text-muted-foreground">
              {i18n.language === 'es' ? 'Detalles del Lead' : 'Lead Details'}
            </p>
          </div>
          <Button 
            type="button"
            variant="outline"
            onClick={() => navigate(`/backoffice/deals/new?lead_id=${lead.id}`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {i18n.language === 'es' ? 'Crear Deal' : 'Create Deal'}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving 
              ? (i18n.language === 'es' ? 'Guardando...' : 'Saving...') 
              : (i18n.language === 'es' ? 'Guardar' : 'Save')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{i18n.language === 'es' ? 'Información' : 'Information'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{i18n.language === 'es' ? 'Fuente' : 'Source'}</Label>
                    <p className="mt-1 capitalize">{lead.source}</p>
                  </div>
                  <div>
                    <Label>{i18n.language === 'es' ? 'Etapa' : 'Stage'}</Label>
                    <Select
                      value={lead.stage}
                      onValueChange={(v) => setLead({ ...lead, stage: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
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
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{i18n.language === 'es' ? 'Nombre de Contacto' : 'Contact Name'}</Label>
                    <p className="mt-1">{lead.contact_name || '-'}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="mt-1">{lead.contact_email || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{i18n.language === 'es' ? 'Teléfono' : 'Phone'}</Label>
                    <p className="mt-1">{lead.contact_phone || '-'}</p>
                  </div>
                  <div>
                    <Label>{i18n.language === 'es' ? 'Contacto Preferido' : 'Preferred Contact'}</Label>
                    <p className="mt-1 capitalize">{lead.preferred_contact || '-'}</p>
                  </div>
                </div>

                {/* Unit Section - Always show with assign option */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>{i18n.language === 'es' ? 'Unidad de Interés' : 'Unit of Interest'}</Label>
                    <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <Search className="h-3 w-3 mr-1" />
                          {unit 
                            ? (i18n.language === 'es' ? 'Cambiar' : 'Change') 
                            : (i18n.language === 'es' ? 'Asignar Unidad' : 'Assign Unit')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {i18n.language === 'es' ? 'Buscar Unidad' : 'Search Unit'}
                          </DialogTitle>
                        </DialogHeader>
                        <Command className="rounded-lg border shadow-md">
                          <CommandInput 
                            placeholder={i18n.language === 'es' ? 'Buscar por stock #, marca, modelo...' : 'Search by stock #, make, model...'} 
                            value={unitSearch}
                            onValueChange={setUnitSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {searchLoading 
                                ? (i18n.language === 'es' ? 'Buscando...' : 'Searching...') 
                                : (i18n.language === 'es' ? 'No se encontraron unidades' : 'No units found')}
                            </CommandEmpty>
                            <CommandGroup>
                              {searchResults.map((u) => (
                                <CommandItem
                                  key={u.id}
                                  value={u.id}
                                  onSelect={() => handleAssignUnit(u.id)}
                                  className="cursor-pointer"
                                >
                                  <Car className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{getUnitLabel(u)}</span>
                                    {u.stock_number && (
                                      <span className="text-xs text-muted-foreground">
                                        Stock: {u.stock_number}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {unit ? (
                    <div className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
                      <Link
                        to={`/backoffice/inventory/${unit.id}`}
                        className="flex items-start gap-4"
                      >
                        <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{getUnitLabel(unit)}</p>
                          {unit.stock_number && (
                            <p className="text-sm text-muted-foreground">
                              Stock #: {unit.stock_number}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {i18n.language === 'es' ? 'Ver detalles' : 'View details'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-muted/30 text-muted-foreground text-center">
                      <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {i18n.language === 'es' 
                          ? 'No hay unidad asignada. Usa "Asignar Unidad" para vincular una.' 
                          : 'No unit assigned. Use "Assign Unit" to link one.'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label>{i18n.language === 'es' ? 'Notas' : 'Notes'}</Label>
                  <Textarea
                    value={lead.notes || ''}
                    onChange={(e) => setLead({ ...lead, notes: e.target.value })}
                    rows={6}
                    className="mt-1"
                    placeholder={i18n.language === 'es' ? 'Agregar notas...' : 'Add notes...'}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{i18n.language === 'es' ? 'Actividad' : 'Activity'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <Label>{i18n.language === 'es' ? 'Creado' : 'Created'}</Label>
                  <p className="text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div>
                  <Label>{i18n.language === 'es' ? 'Última Actualización' : 'Last Updated'}</Label>
                  <p className="text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {lead.buyer_request_id && (
              <Card>
                <CardHeader>
                  <CardTitle>{i18n.language === 'es' ? 'Solicitud Original' : 'Original Request'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/backoffice/crm/inbound-requests')}
                  >
                    {i18n.language === 'es' ? 'Ver Solicitud' : 'View Request'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
