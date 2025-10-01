import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

type Status = 'new' | 'processing' | 'converted' | 'spam' | 'closed' | 'all';

export default function InboundRequests() {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
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
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al actualizar' : 'Failed to update'));
    }
  };

  const handleConvertToLead = async (request: BuyerRequest) => {
    try {
      // Check if leads table exists by trying to query it
      const { error: leadsCheckError } = await supabase
        .from('leads')
        .select('id')
        .limit(1);

      if (leadsCheckError && leadsCheckError.code === '42P01') {
        // Table doesn't exist
        toast.error(
          i18n.language === 'es'
            ? "Tabla 'leads' no encontrada. Marcado como En proceso."
            : 'Leads table not found. Marked as Processing.'
        );
        await handleStatusChange(request.id, 'processing');
        return;
      }

      // Try to create lead
      const { error: insertError } = await supabase.from('leads').insert({
        source: 'website',
        name: request.name,
        email: request.email,
        phone: request.phone,
        notes: request.message,
        status: 'new',
      });

      if (insertError) throw insertError;

      await handleStatusChange(request.id, 'converted');
      toast.success(i18n.language === 'es' ? 'Lead creado' : 'Lead created');
    } catch (error: any) {
      console.error('Error converting to lead:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al crear lead' : 'Failed to create lead'));
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
                        {request.unit_id ? (
                          <a
                            href={`/inventory/${request.unit_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <span className="text-sm">{request.unit_id.substring(0, 8)}...</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
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
                    <Button onClick={() => handleConvertToLead(selectedRequest)}>
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
