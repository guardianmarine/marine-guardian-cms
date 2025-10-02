import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Search, ExternalLink, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

type BuyerRequest = {
  id: string;
  unit_id: string | null;
  request_type: 'info' | 'wish';
  name: string;
  email: string;
  phone: string | null;
  preferred_contact: string | null;
  message: string | null;
  page_url: string | null;
  status: 'new' | 'processing' | 'converted' | 'spam' | 'closed';
  created_at: string;
};

type UnitInfo = {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  slug?: string;
};

type Status = 'new' | 'processing' | 'converted' | 'spam' | 'closed' | 'all';

export default function InboundRequests() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, UnitInfo>>({});
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'info' | 'wish'>('all');
  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('buyer_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);

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
          // Don't fail, just leave unitsById empty
        }
      }
    } catch (error: any) {
      console.error('Error loading requests:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al cargar solicitudes' : 'Failed to load requests'));
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.phone && req.phone.includes(searchTerm)) ||
      (req.message && req.message.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesType = typeFilter === 'all' || req.request_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'new':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'converted':
        return 'outline';
      case 'spam':
        return 'destructive';
      case 'closed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleStatusChange = async (id: string, newStatus: BuyerRequest['status']) => {
    try {
      const { error } = await supabase
        .from('buyer_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
      );
      toast.success(i18n.language === 'es' ? 'Estado actualizado' : 'Status updated');
      
      // Refresh the list to update badge count
      await loadRequests();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al actualizar' : 'Failed to update'));
    }
  };

  const handleConvertToLead = async (request: BuyerRequest) => {
    if (!user?.id) {
      toast.error(i18n.language === 'es' ? 'Usuario no autenticado' : 'User not authenticated');
      return;
    }

    setConverting(request.id);
    try {
      // Parse unit ID from page_url if available
      let resolvedUnitId = request.unit_id;
      if (!resolvedUnitId && request.page_url) {
        const urlSegments = request.page_url.split('/').filter(Boolean);
        const lastSegment = urlSegments[urlSegments.length - 1];
        
        if (lastSegment) {
          // Try to look up by ID first (UUID pattern)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(lastSegment)) {
            const { data } = await supabase
              .from('units')
              .select('id')
              .eq('id', lastSegment)
              .maybeSingle();
            if (data) resolvedUnitId = data.id;
          } else {
            // Try slug lookup
            const { data } = await supabase
              .from('units')
              .select('id')
              .eq('slug', lastSegment)
              .maybeSingle();
            if (data) resolvedUnitId = data.id;
          }
        }
      }

      // Split name into first/last
      const nameParts = request.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // 1. Check if contact exists by email
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id, account_id, accounts(id, name)')
        .eq('email', request.email)
        .maybeSingle();

      let accountId: string;
      let contactId: string;

      if (existingContact) {
        // Reuse existing contact and account
        accountId = existingContact.account_id;
        contactId = existingContact.id;
        
        // Update contact info if needed
        await supabase
          .from('contacts')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: request.phone || null,
          })
          .eq('id', contactId);
      } else {
        // 2. Create or reuse Account (upsert by name for individuals)
        // Check if an individual account with this name exists
        const { data: existingAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('kind', 'individual')
          .eq('name', request.name)
          .maybeSingle();

        if (existingAccount) {
          accountId = existingAccount.id;
        } else {
          // Create new Account - DO NOT send created_by (trigger will fill it)
          const { data: account, error: accountError } = await supabase
            .from('accounts')
            .insert({
              kind: 'individual',
              name: request.name,
            })
            .select('id')
            .single();

          if (accountError) {
            // Handle RLS errors specifically
            if (accountError.message?.includes('row-level security')) {
              toast.error(
                i18n.language === 'es'
                  ? 'Error de permisos al crear cuenta. Verifica que tienes acceso de escritura a la tabla accounts.'
                  : 'Permission error creating account. Verify you have write access to the accounts table.'
              );
            } else {
              toast.error(
                i18n.language === 'es'
                  ? `Error al crear cuenta: ${accountError.message}`
                  : `Failed to create account: ${accountError.message}`
              );
            }
            throw accountError;
          }
          accountId = account.id;
        }

        // 3. Create new Contact (upsert by email)
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .upsert({
            account_id: accountId,
            first_name: firstName,
            last_name: lastName,
            email: request.email,
            phone: request.phone || null,
          }, {
            onConflict: 'email',
          })
          .select('id')
          .single();

        if (contactError) {
          if (contactError.message?.includes('row-level security')) {
            toast.error(
              i18n.language === 'es'
                ? 'Error de permisos al crear contacto. Verifica que tienes acceso de escritura a la tabla contacts.'
                : 'Permission error creating contact. Verify you have write access to the contacts table.'
            );
          } else {
            toast.error(
              i18n.language === 'es'
                ? `Error al crear contacto: ${contactError.message}`
                : `Failed to create contact: ${contactError.message}`
            );
          }
          throw contactError;
        }
        contactId = contact.id;
      }

      // 4. Create Lead - DO NOT send owner_user_id (DB will auto-fill it)
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          account_id: accountId,
          contact_id: contactId,
          unit_id: resolvedUnitId || null,
          source: 'website',
          stage: 'new',
          notes: request.message || null,
        })
        .select('id')
        .single();

      if (leadError) {
        if (leadError.message?.includes('row-level security')) {
          toast.error(
            i18n.language === 'es'
              ? 'Error de permisos al crear lead. Verifica que tienes acceso de escritura a la tabla leads.'
              : 'Permission error creating lead. Verify you have write access to the leads table.'
          );
        } else {
          toast.error(
            i18n.language === 'es'
              ? `Error al crear lead: ${leadError.message}`
              : `Failed to create lead: ${leadError.message}`
          );
        }
        throw leadError;
      }

      // 5. Mark request as converted
      await supabase
        .from('buyer_requests')
        .update({ status: 'converted' })
        .eq('id', request.id);

      toast.success(
        i18n.language === 'es'
          ? 'Lead creado exitosamente'
          : 'Lead created successfully'
      );

      await loadRequests();
      navigate(`/backoffice/crm/leads/${lead.id}`);
    } catch (error: any) {
      console.error('Error converting to lead:', error);
      
      // Handle specific RLS errors
      if (error?.message?.includes('row-level security')) {
        toast.error(
          i18n.language === 'es'
            ? 'Error de permisos: verifica que tienes los permisos necesarios para crear cuentas, contactos y leads.'
            : 'Permission error: verify you have the necessary permissions to create accounts, contacts and leads.'
        );
      } else {
        const errorMsg = error?.message || 'Unknown error';
        toast.error(
          i18n.language === 'es' 
            ? `Error al crear lead: ${errorMsg}` 
            : `Failed to create lead: ${errorMsg}`
        );
      }
    } finally {
      setConverting(null);
    }
  };

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <h2 className="text-3xl font-bold mb-6">
            {i18n.language === 'es' ? 'Solicitudes Entrantes' : 'Inbound Requests'}
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
            {i18n.language === 'es' ? 'Solicitudes Entrantes' : 'Inbound Requests'}
          </h2>
          <p className="text-muted-foreground">
            {i18n.language === 'es'
              ? 'Gestionar solicitudes de compradores desde el sitio público'
              : 'Manage buyer requests from the public site'}
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
          <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{i18n.language === 'es' ? 'Todos' : 'All Types'}</SelectItem>
              <SelectItem value="info">{i18n.language === 'es' ? 'Información' : 'Info'}</SelectItem>
              <SelectItem value="wish">{i18n.language === 'es' ? 'Deseo' : 'Wish'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: Status) => setStatusFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{i18n.language === 'es' ? 'Todos' : 'All Status'}</SelectItem>
              <SelectItem value="new">{i18n.language === 'es' ? 'Nuevo' : 'New'}</SelectItem>
              <SelectItem value="processing">{i18n.language === 'es' ? 'Procesando' : 'Processing'}</SelectItem>
              <SelectItem value="converted">{i18n.language === 'es' ? 'Convertido' : 'Converted'}</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="closed">{i18n.language === 'es' ? 'Cerrado' : 'Closed'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{i18n.language === 'es' ? 'Creado' : 'Created'}</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Tipo' : 'Type'}</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Unidad' : 'Unit'}</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Nombre' : 'Name'}</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Teléfono' : 'Phone'}</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Contacto Preferido' : 'Preferred'}</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Estado' : 'Status'}</TableHead>
                  <TableHead>{i18n.language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {i18n.language === 'es' ? 'Aún no hay solicitudes.' : 'No inbound requests yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        <span title={new Date(request.created_at).toLocaleString()}>
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={request.request_type === 'info' ? 'default' : 'secondary'}>
                          {request.request_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.unit_id && unitsById[request.unit_id] ? (
                          <a
                            href={
                              unitsById[request.unit_id].slug
                                ? `/unit/${unitsById[request.unit_id].slug}`
                                : `/unit/${unitsById[request.unit_id].id}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <span className="text-sm">
                              {[
                                unitsById[request.unit_id].year,
                                unitsById[request.unit_id].make,
                                unitsById[request.unit_id].model,
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : request.page_url ? (
                          <a
                            href={request.page_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-primary hover:underline text-sm"
                          >
                            {i18n.language === 'es' ? 'Abrir' : 'Open'}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{request.name}</TableCell>
                      <TableCell className="text-sm">{request.email}</TableCell>
                      <TableCell className="text-sm">{request.phone || '-'}</TableCell>
                      <TableCell className="text-sm capitalize">{request.preferred_contact || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertToLead(request);
                          }}
                          disabled={converting === request.id}
                          title={i18n.language === 'es' ? 'Convertir a Lead' : 'Convert to Lead'}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Request Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {i18n.language === 'es' ? 'Detalles de Solicitud' : 'Request Details'}
              </DialogTitle>
              <DialogDescription>
                {i18n.language === 'es' ? 'Información completa de la solicitud' : 'Full request information'}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">
                      {i18n.language === 'es' ? 'Nombre' : 'Name'}
                    </label>
                    <p>{selectedRequest.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p>{selectedRequest.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      {i18n.language === 'es' ? 'Teléfono' : 'Phone'}
                    </label>
                    <p>{selectedRequest.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      {i18n.language === 'es' ? 'Contacto Preferido' : 'Preferred Contact'}
                    </label>
                    <p className="capitalize">{selectedRequest.preferred_contact || '-'}</p>
                  </div>
                </div>

                {selectedRequest.message && (
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium">
                      {i18n.language === 'es' ? 'Mensaje' : 'Message'}
                    </label>
                    <p className="mt-1 text-muted-foreground">{selectedRequest.message}</p>
                  </div>
                )}

                {selectedRequest.page_url && (
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium">
                      {i18n.language === 'es' ? 'URL de Página' : 'Page URL'}
                    </label>
                    <p className="mt-1 text-sm break-all text-muted-foreground">{selectedRequest.page_url}</p>
                  </div>
                )}

                <div className="border-t pt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">
                      {i18n.language === 'es' ? 'Estado:' : 'Status:'}
                    </label>
                    <Select
                      value={selectedRequest.status}
                      onValueChange={(v: any) => {
                        handleStatusChange(selectedRequest.id, v);
                        setSelectedRequest({ ...selectedRequest, status: v });
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">{i18n.language === 'es' ? 'Nuevo' : 'New'}</SelectItem>
                        <SelectItem value="processing">
                          {i18n.language === 'es' ? 'Procesando' : 'Processing'}
                        </SelectItem>
                        <SelectItem value="converted">
                          {i18n.language === 'es' ? 'Convertido' : 'Converted'}
                        </SelectItem>
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="closed">
                          {i18n.language === 'es' ? 'Cerrado' : 'Closed'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange(selectedRequest.id, 'spam')}
                    >
                      {i18n.language === 'es' ? 'Marcar Spam' : 'Mark as Spam'}
                    </Button>
                    <Button
                      onClick={() => handleConvertToLead(selectedRequest)}
                      disabled={converting === selectedRequest.id}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {i18n.language === 'es' ? 'Convertir a Lead' : 'Convert to Lead'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </BackofficeLayout>
  );
}
