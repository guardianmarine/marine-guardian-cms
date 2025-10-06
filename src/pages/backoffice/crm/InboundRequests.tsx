import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { redirectToLogin } from '@/lib/session';
import { convertBuyerRequestToLead } from '@/services/crm/convertBuyerRequestToLead';
import { Search, ExternalLink, UserPlus, MoreVertical, Trash2, RotateCcw, XCircle, Loader2 } from 'lucide-react';
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
  deleted_at: string | null;
};

type UnitInfo = {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  slug?: string;
};

type Status = 'new' | 'processing' | 'converted' | 'spam' | 'closed' | 'all';
type ViewFilter = 'active' | 'trash' | 'all';

export default function InboundRequests() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, UnitInfo>>({});
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'info' | 'wish'>('all');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('active');
  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

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
    
    // View filter (active/trash/all)
    const matchesView =
      viewFilter === 'all' ||
      (viewFilter === 'active' && !req.deleted_at) ||
      (viewFilter === 'trash' && req.deleted_at);
    
    return matchesSearch && matchesStatus && matchesType && matchesView;
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

  const handleMoveToTrash = async (id: string) => {
    try {
      const { error } = await supabase
        .from('buyer_requests')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success(i18n.language === 'es' ? 'Movido a papelera' : 'Moved to trash');
      await loadRequests();
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error: any) {
      console.error('Error moving to trash:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al mover' : 'Failed to move'));
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('buyer_requests')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;

      toast.success(i18n.language === 'es' ? 'Restaurado' : 'Restored');
      await loadRequests();
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error: any) {
      console.error('Error restoring:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al restaurar' : 'Failed to restore'));
    }
  };

  const handleDeletePermanently = async (id: string) => {
    try {
      const { error } = await supabase
        .from('buyer_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(i18n.language === 'es' ? 'Eliminado permanentemente' : 'Deleted permanently');
      await loadRequests();
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error('Error deleting permanently:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al eliminar' : 'Failed to delete'));
    }
  };

  const handleBulkMoveToTrash = async () => {
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('buyer_requests')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      toast.success(
        i18n.language === 'es'
          ? `${ids.length} elementos movidos a papelera`
          : `${ids.length} items moved to trash`
      );
      await loadRequests();
      setSelectedIds(new Set());
    } catch (error: any) {
      console.error('Error bulk moving to trash:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al mover' : 'Failed to move'));
    }
  };

  const handleBulkRestore = async () => {
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('buyer_requests')
        .update({ deleted_at: null })
        .in('id', ids);

      if (error) throw error;

      toast.success(
        i18n.language === 'es'
          ? `${ids.length} elementos restaurados`
          : `${ids.length} items restored`
      );
      await loadRequests();
      setSelectedIds(new Set());
    } catch (error: any) {
      console.error('Error bulk restoring:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al restaurar' : 'Failed to restore'));
    }
  };

  const handleBulkDeletePermanently = async () => {
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('buyer_requests')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast.success(
        i18n.language === 'es'
          ? `${ids.length} elementos eliminados permanentemente`
          : `${ids.length} items deleted permanently`
      );
      await loadRequests();
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
    } catch (error: any) {
      console.error('Error bulk deleting:', error);
      toast.error(error?.message ?? (i18n.language === 'es' ? 'Error al eliminar' : 'Failed to delete'));
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConvertToLead = async (request: BuyerRequest) => {
    if (request.status === 'converted') {
      toast.warning(
        i18n.language === 'es'
          ? 'Esta solicitud ya fue convertida a lead'
          : 'This request has already been converted to a lead'
      );
      return;
    }

    setConverting(request.id);

    const result = await convertBuyerRequestToLead(request.id, {
      onNoSession: () => {
        toast.warning(
          i18n.language === 'es'
            ? 'Tu sesión expiró. Inicia sesión para continuar.'
            : 'Your session expired. Please log in to continue.'
        );
        redirectToLogin('/backoffice/crm/inbound-requests');
      }
    });

    setConverting(null);

    if (result.error) {
      if (result.error.message?.includes('already been converted')) {
        toast.warning(
          i18n.language === 'es'
            ? 'Esta solicitud ya fue convertida a lead'
            : 'This request has already been converted to a lead'
        );
        await loadRequests();
        return;
      }

      toast.error(
        i18n.language === 'es'
          ? `No se pudo crear el lead: ${result.error.message}`
          : `Failed to create lead: ${result.error.message}`
      );
      return;
    }

    toast.success(
      i18n.language === 'es'
        ? 'Lead creado y vinculado'
        : 'Lead created and linked'
    );

    await loadRequests();

    if (result.data?.lead_id) {
      navigate(`/backoffice/crm/leads/${result.data.lead_id}`);
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
          <Select value={viewFilter} onValueChange={(v: ViewFilter) => setViewFilter(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{i18n.language === 'es' ? 'Activo' : 'Active'}</SelectItem>
              <SelectItem value="trash">{i18n.language === 'es' ? 'Papelera' : 'Trash'}</SelectItem>
              <SelectItem value="all">{i18n.language === 'es' ? 'Todos' : 'All'}</SelectItem>
            </SelectContent>
          </Select>
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

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedIds.size} {i18n.language === 'es' ? 'seleccionados' : 'selected'}
            </span>
            <div className="flex gap-2 ml-auto">
              {viewFilter !== 'trash' ? (
                <Button size="sm" variant="outline" onClick={handleBulkMoveToTrash}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {i18n.language === 'es' ? 'Mover a papelera' : 'Move to Trash'}
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={handleBulkRestore}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {i18n.language === 'es' ? 'Restaurar' : 'Restore'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setBulkDeleteConfirm(true)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    {i18n.language === 'es' ? 'Eliminar permanentemente' : 'Delete Permanently'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Requests Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
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
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {i18n.language === 'es' ? 'Aún no hay solicitudes.' : 'No inbound requests yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow
                      key={request.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(request.id)}
                          onCheckedChange={() => toggleSelect(request.id)}
                        />
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <span title={new Date(request.created_at).toLocaleString()}>
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <Badge variant={request.request_type === 'info' ? 'default' : 'secondary'}>
                          {request.request_type}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
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
                      <TableCell
                        className="font-medium cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        {request.name}
                      </TableCell>
                      <TableCell
                        className="text-sm cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        {request.email}
                      </TableCell>
                      <TableCell
                        className="text-sm cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        {request.phone || '-'}
                      </TableCell>
                      <TableCell
                        className="text-sm capitalize cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        {request.preferred_contact || '-'}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!request.deleted_at && (
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
                              {converting === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserPlus className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!request.deleted_at ? (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToTrash(request.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {i18n.language === 'es' ? 'Mover a papelera' : 'Move to Trash'}
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestore(request.id);
                                    }}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    {i18n.language === 'es' ? 'Restaurar' : 'Restore'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmId(request.id);
                                    }}
                                    className="text-destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {i18n.language === 'es' ? 'Eliminar permanentemente' : 'Delete Permanently'}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
                      title={i18n.language === 'es' ? 'Convertir a Lead' : 'Convert to Lead'}
                    >
                      {converting === selectedRequest.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      {i18n.language === 'es' ? 'Convertir a Lead' : 'Convert to Lead'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {i18n.language === 'es' ? '¿Eliminar permanentemente?' : 'Delete Permanently?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {i18n.language === 'es'
                  ? 'Esta acción no se puede deshacer. La solicitud será eliminada permanentemente.'
                  : 'This action cannot be undone. The request will be permanently deleted.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{i18n.language === 'es' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmId && handleDeletePermanently(deleteConfirmId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {i18n.language === 'es' ? 'Eliminar' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {i18n.language === 'es' ? '¿Eliminar permanentemente?' : 'Delete Permanently?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {i18n.language === 'es'
                  ? `Esta acción no se puede deshacer. ${selectedIds.size} solicitudes serán eliminadas permanentemente.`
                  : `This action cannot be undone. ${selectedIds.size} requests will be permanently deleted.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{i18n.language === 'es' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDeletePermanently}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {i18n.language === 'es' ? 'Eliminar' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </BackofficeLayout>
  );
}
