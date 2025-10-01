import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ExternalLink } from 'lucide-react';
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
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadLead();
  }, [id]);

  const loadLead = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setLead(data);

      // Fetch unit if present
      if (data.unit_id) {
        const { data: unitData } = await supabase
          .from('units')
          .select('id, make, model, year, slug')
          .eq('id', data.unit_id)
          .single();
        if (unitData) setUnit(unitData);
      }
    } catch (error: any) {
      console.error('Error loading lead:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al cargar lead' : 'Failed to load lead'));
    } finally {
      setLoading(false);
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/backoffice/crm/leads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{lead.account_name}</h2>
            <p className="text-muted-foreground">
              {i18n.language === 'es' ? 'Detalles del Lead' : 'Lead Details'}
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
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

                {unit && (
                  <div>
                    <Label>{i18n.language === 'es' ? 'Unidad de Interés' : 'Unit of Interest'}</Label>
                    <a
                      href={unit.slug ? `/unit/${unit.slug}` : `/unit/${unit.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 mt-1 text-primary hover:underline"
                    >
                      <span>
                        {[unit.year, unit.make, unit.model].filter(Boolean).join(' ')}
                      </span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}

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
