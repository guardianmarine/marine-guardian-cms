import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { usePurchasingStore } from '@/services/purchasingStore';
import { useCRMStore } from '@/services/crmStore';
import { BuyerRequest, BuyerRequestStatus, Lead, Account, Contact } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, CheckCircle, XCircle, UserPlus, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function BuyerRequests() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { buyerRequests, updateBuyerRequest } = usePurchasingStore();
  const { 
    addAccount, 
    addContact, 
    addLead, 
    addLeadIntakeLink, 
    getLeadByBuyerRequest,
    contacts 
  } = useCRMStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BuyerRequestStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'truck' | 'trailer' | 'equipment'>('all');
  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);

  const filteredRequests = buyerRequests.filter((req) => {
    const matchesSearch =
      req.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || req.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: BuyerRequestStatus) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500';
      case 'in_review':
        return 'bg-yellow-500';
      case 'matched':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleStatusChange = (id: string, status: BuyerRequestStatus) => {
    updateBuyerRequest(id, { status });
  };

  const handleCreateLead = (request: BuyerRequest) => {
    // Check if lead already exists
    const existingLead = getLeadByBuyerRequest(request.id);
    if (existingLead) {
      toast({
        title: 'Lead already exists',
        description: 'This buyer request already has a lead',
        variant: 'destructive',
      });
      navigate(`/backoffice/crm/leads/${existingLead.id}`);
      return;
    }

    // Deduplication: check for existing contact by email
    const existingContact = contacts.find(c => c.email.toLowerCase() === request.email.toLowerCase());
    
    let accountId: string;
    let contactId: string;
    const now = new Date().toISOString();

    if (existingContact) {
      // Use existing account and contact
      accountId = existingContact.account_id;
      contactId = existingContact.id;
    } else {
      // Create new account (individual)
      const newAccount: Account = {
        id: Math.random().toString(36).substr(2, 9),
        name: request.requester_name,
        kind: 'individual',
        email: request.email,
        phone: request.phone,
        is_tax_exempt: false,
        resale_cert: false,
        created_at: now,
        updated_at: now,
      };
      addAccount(newAccount);
      accountId = newAccount.id;

      // Create new contact
      const nameParts = request.requester_name.split(' ');
      const firstName = nameParts[0] || request.requester_name;
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const newContact: Contact = {
        id: Math.random().toString(36).substr(2, 9),
        account_id: accountId,
        first_name: firstName,
        last_name: lastName,
        email: request.email,
        phone: request.phone,
        preferred_lang: request.locale,
        created_at: now,
        updated_at: now,
      };
      addContact(newContact);
      contactId = newContact.id;
    }

    // Create lead
    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      source: 'web_form',
      account_id: accountId,
      contact_id: contactId,
      category_interest: request.category,
      status: 'new',
      lead_score: 0,
      sla_first_touch_hours: 24,
      owner_user_id: undefined, // TODO: Assign via round-robin or rules
      created_at: now,
      updated_at: now,
    };
    addLead(newLead);

    // Link buyer request to lead
    addLeadIntakeLink({
      id: Math.random().toString(36).substr(2, 9),
      buyer_request_id: request.id,
      lead_id: newLead.id,
      created_at: now,
    });

    updateBuyerRequest(request.id, { status: 'in_review' });

    toast({
      title: 'Lead created',
      description: 'Lead has been created and linked to this request',
    });

    navigate(`/backoffice/crm/leads/${newLead.id}`);
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold">{t('purchasing.buyerRequests')}</h2>
          <p className="text-muted-foreground">
            Manage incoming unit requests from potential buyers
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as any)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="truck">{t('search.trucks')}</SelectItem>
              <SelectItem value="trailer">{t('search.trailers')}</SelectItem>
              <SelectItem value="equipment">{t('search.equipment')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as BuyerRequestStatus | 'all')}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Preferences</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No buyer requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.requester_name}</TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>{request.email}</div>
                          <div className="text-muted-foreground">{request.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {request.desired_make && <div>Make: {request.desired_make}</div>}
                          {request.desired_model && <div>Model: {request.desired_model}</div>}
                          {request.desired_type && <div>Type: {request.desired_type}</div>}
                          {(request.year_min || request.year_max) && (
                            <div>
                              Year: {request.year_min || '?'} - {request.year_max || '?'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.budget_min || request.budget_max ? (
                          <div className="text-sm">
                            ${request.budget_min?.toLocaleString() || '?'} - $
                            {request.budget_max?.toLocaleString() || '?'}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateLead(request)}
                            title="Create Lead from this request"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          {request.status === 'new' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(request.id, 'in_review')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {getLeadByBuyerRequest(request.id) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              title="View linked lead"
                            >
                              <a href={`/backoffice/crm/leads/${getLeadByBuyerRequest(request.id)?.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
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
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>Full information about the buyer request</DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Requester Name</label>
                    <p>{selectedRequest.requester_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p>{selectedRequest.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <p>{selectedRequest.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Language</label>
                    <p>{selectedRequest.locale.toUpperCase()}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Unit Preferences</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <p>{selectedRequest.category}</p>
                    </div>
                    {selectedRequest.desired_make && (
                      <div>
                        <label className="text-sm font-medium">Desired Make</label>
                        <p>{selectedRequest.desired_make}</p>
                      </div>
                    )}
                    {selectedRequest.desired_model && (
                      <div>
                        <label className="text-sm font-medium">Desired Model</label>
                        <p>{selectedRequest.desired_model}</p>
                      </div>
                    )}
                    {selectedRequest.desired_type && (
                      <div>
                        <label className="text-sm font-medium">Type</label>
                        <p>{selectedRequest.desired_type}</p>
                      </div>
                    )}
                    {(selectedRequest.year_min || selectedRequest.year_max) && (
                      <div>
                        <label className="text-sm font-medium">Year Range</label>
                        <p>
                          {selectedRequest.year_min || '?'} - {selectedRequest.year_max || '?'}
                        </p>
                      </div>
                    )}
                    {(selectedRequest.mileage_min || selectedRequest.mileage_max) && (
                      <div>
                        <label className="text-sm font-medium">Mileage Range</label>
                        <p>
                          {selectedRequest.mileage_min?.toLocaleString() || '?'} -{' '}
                          {selectedRequest.mileage_max?.toLocaleString() || '?'}
                        </p>
                      </div>
                    )}
                    {(selectedRequest.budget_min || selectedRequest.budget_max) && (
                      <div>
                        <label className="text-sm font-medium">Budget Range</label>
                        <p>
                          ${selectedRequest.budget_min?.toLocaleString() || '?'} - $
                          {selectedRequest.budget_max?.toLocaleString() || '?'}
                        </p>
                      </div>
                    )}
                    {selectedRequest.location_pref && (
                      <div>
                        <label className="text-sm font-medium">Preferred Location</label>
                        <p>{selectedRequest.location_pref}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedRequest.notes && (
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium">Additional Notes</label>
                    <p className="mt-1 text-muted-foreground">{selectedRequest.notes}</p>
                  </div>
                )}

                <div className="border-t pt-4 flex items-center gap-2">
                  <label className="text-sm font-medium">Status:</label>
                  <Select
                    value={selectedRequest.status}
                    onValueChange={(v) => {
                      handleStatusChange(selectedRequest.id, v as BuyerRequestStatus);
                      setSelectedRequest({ ...selectedRequest, status: v as BuyerRequestStatus });
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="matched">Matched</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </BackofficeLayout>
  );
}
