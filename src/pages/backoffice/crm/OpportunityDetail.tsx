import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCRMStore } from '@/services/crmStore';
import { useInventoryStore } from '@/services/inventoryStore';
import { useAuth } from '@/contexts/AuthContext';
import { getCRMPermissions } from '@/lib/permissions';
import { TrendingUp, Package, FileText, Activity as ActivityIcon, Plus, X, CheckCircle, XCircle, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { OpportunityStage, OpportunityReasonLost, ActivityKind } from '@/types';

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    getOpportunity,
    updateOpportunity,
    closeOpportunityAsWon,
    closeOpportunityAsLost,
    getAccount,
    getContact,
    getActivities,
    addActivity,
    getOpportunityUnits,
    addOpportunityUnit,
    removeOpportunityUnit,
    updateOpportunityUnitPrice,
    getDocuments,
    addDocument,
  } = useCRMStore();
  const { units } = useInventoryStore();
  
  const permissions = user ? getCRMPermissions(user.role) : { canEditCRM: false };

  const opportunity = id ? getOpportunity(id) : null;
  const account = opportunity?.account_id ? getAccount(opportunity.account_id) : null;
  const contact = opportunity?.contact_id ? getContact(opportunity.contact_id) : null;
  const activities = id ? getActivities('opportunity', id) : [];
  const opportunityUnits = id ? getOpportunityUnits(id) : [];
  const documents = id ? getDocuments('opportunity', id) : [];

  const [activityDialog, setActivityDialog] = useState(false);
  const [unitDialog, setUnitDialog] = useState(false);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [closeAsWon, setCloseAsWon] = useState(true);
  const [reasonLost, setReasonLost] = useState<OpportunityReasonLost>('price');
  const [reasonNotes, setReasonNotes] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [activityKind, setActivityKind] = useState<ActivityKind>('call');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  if (!opportunity) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p>Opportunity not found</p>
        </div>
      </BackofficeLayout>
    );
  }

  const totalValue = opportunityUnits.reduce(
    (sum, ou) => sum + (ou.agreed_unit_price || 0),
    0
  );

  const handleStageChange = (stage: OpportunityStage) => {
    updateOpportunity(opportunity.id, { pipeline_stage: stage });
    toast.success('Stage updated');
  };

  const handleAddUnit = () => {
    if (!selectedUnitId) {
      toast.error('Please select a unit');
      return;
    }

    addOpportunityUnit({
      opportunity_id: opportunity.id,
      unit_id: selectedUnitId,
      quantity: 1,
      agreed_unit_price: unitPrice ? parseFloat(unitPrice) : null,
    });

    toast.success('Unit added to opportunity');
    setUnitDialog(false);
    setSelectedUnitId('');
    setUnitPrice('');
  };

  const handleRemoveUnit = (unitId: string) => {
    removeOpportunityUnit(opportunity.id, unitId);
    toast.success('Unit removed');
  };

  const handleUpdateUnitPrice = (unitId: string, price: string) => {
    const numPrice = parseFloat(price);
    if (!isNaN(numPrice)) {
      updateOpportunityUnitPrice(opportunity.id, unitId, numPrice);
      toast.success('Price updated');
    }
  };

  const handleLogActivity = () => {
    if (!subject) {
      toast.error('Subject is required');
      return;
    }

    addActivity({
      parent_type: 'opportunity',
      parent_id: opportunity.id,
      kind: activityKind,
      subject,
      body,
      owner_user_id: opportunity.owner_user_id,
      due_at: null,
      completed_at: null,
    });

    toast.success('Activity logged');
    setActivityDialog(false);
    setSubject('');
    setBody('');
  };

  const handleAddDocument = () => {
    if (!documentName || !documentUrl) {
      toast.error('Document name and URL are required');
      return;
    }

    addDocument({
      parent_type: 'opportunity',
      parent_id: opportunity.id,
      name: documentName,
      file_url: documentUrl,
      mime: 'application/pdf',
      size_kb: 0,
      uploaded_by: opportunity.owner_user_id,
    });

    toast.success('Document added');
    setDocumentDialog(false);
    setDocumentName('');
    setDocumentUrl('');
  };

  const handleClose = () => {
    if (closeAsWon) {
      closeOpportunityAsWon(opportunity.id);
      toast.success('Opportunity closed as won! 🎉');
    } else {
      closeOpportunityAsLost(opportunity.id, reasonLost, reasonNotes);
      toast.success('Opportunity closed as lost');
    }
    setCloseDialog(false);
  };

  const getStageColor = (stage: OpportunityStage) => {
    const colors = {
      new: 'bg-blue-500',
      qualified: 'bg-cyan-500',
      visit: 'bg-indigo-500',
      quote: 'bg-purple-500',
      negotiation: 'bg-orange-500',
      won: 'bg-green-500',
      lost: 'bg-gray-500',
    };
    return colors[stage] || 'bg-gray-500';
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold">{opportunity.name}</h2>
            <p className="text-muted-foreground">
              {account?.name} • {format(new Date(opportunity.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {permissions.canEditCRM ? (
              <Select value={opportunity.pipeline_stage} onValueChange={(v) => handleStageChange(v as OpportunityStage)}>
                <SelectTrigger className="w-48">
                  <Badge className={getStageColor(opportunity.pipeline_stage)}>
                    {opportunity.pipeline_stage}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="visit">Visit</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={getStageColor(opportunity.pipeline_stage)}>
                {opportunity.pipeline_stage}
              </Badge>
            )}
            {permissions.canEditCRM && opportunity.pipeline_stage !== 'won' && opportunity.pipeline_stage !== 'lost' && (
              <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">Close</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Close Opportunity</DialogTitle>
                    <DialogDescription>Mark this opportunity as won or lost</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant={closeAsWon ? 'default' : 'outline'}
                        onClick={() => setCloseAsWon(true)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Won
                      </Button>
                      <Button
                        variant={!closeAsWon ? 'default' : 'outline'}
                        onClick={() => setCloseAsWon(false)}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Lost
                      </Button>
                    </div>
                    {!closeAsWon && (
                      <>
                        <div>
                          <Label>Reason Lost</Label>
                          <Select value={reasonLost} onValueChange={(v) => setReasonLost(v as OpportunityReasonLost)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="price">Price</SelectItem>
                              <SelectItem value="timing">Timing</SelectItem>
                              <SelectItem value="specs">Specs</SelectItem>
                              <SelectItem value="financing">Financing</SelectItem>
                              <SelectItem value="inventory">Inventory</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Additional Notes</Label>
                          <Textarea
                            value={reasonNotes}
                            onChange={(e) => setReasonNotes(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </>
                    )}
                    <Button onClick={handleClose} className="w-full">
                      Confirm Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Units</div>
              <div className="text-2xl font-bold">{opportunityUnits.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Expected Close</div>
              <div className="text-2xl font-bold">
                {opportunity.expected_close_at
                  ? format(new Date(opportunity.expected_close_at), 'MMM d')
                  : 'Not set'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="units">Units ({opportunityUnits.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Opportunity Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account</label>
                  <p>{account?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact</label>
                  <p>{contact ? `${contact.first_name} ${contact.last_name}` : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner</label>
                  <p>{opportunity.owner_user_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stage</label>
                  <Badge className={getStageColor(opportunity.pipeline_stage)}>
                    {opportunity.pipeline_stage}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="units">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Units in Opportunity</CardTitle>
                {permissions.canEditCRM && (
                  <Dialog open={unitDialog} onOpenChange={setUnitDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Unit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Unit</DialogTitle>
                        <DialogDescription>Select a unit to add to this opportunity</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Unit</Label>
                          <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {units
                                .filter((u) => u.status === 'published')
                                .map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    {unit.year} {unit.make} {unit.model}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Agreed Price (Optional)</Label>
                          <Input
                            type="number"
                            value={unitPrice}
                            onChange={(e) => setUnitPrice(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <Button onClick={handleAddUnit} className="w-full">Add Unit</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {opportunityUnits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No units added yet</p>
                ) : (
                  <div className="space-y-3">
                    {opportunityUnits.map((ou) => {
                      const unit = units.find((u) => u.id === ou.unit_id);
                      return (
                        <div key={ou.unit_id} className="flex items-center gap-3 p-3 border rounded-lg">
                          {unit?.photos[0] && (
                            <img
                              src={unit.photos[0].url}
                              alt={`${unit.make} ${unit.model}`}
                              className="w-20 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">
                              {unit?.year} {unit?.make} {unit?.model}
                            </p>
                            <p className="text-sm text-muted-foreground">VIN: {unit?.vin_or_serial}</p>
                            {permissions.canEditCRM && (
                              <div className="flex items-center gap-2 mt-2">
                                <Label className="text-xs">Price:</Label>
                                <Input
                                  type="number"
                                  value={ou.agreed_unit_price || ''}
                                  onChange={(e) => handleUpdateUnitPrice(ou.unit_id, e.target.value)}
                                  placeholder="Set price"
                                  className="w-32 h-8"
                                />
                              </div>
                            )}
                            {!permissions.canEditCRM && ou.agreed_unit_price && (
                              <p className="text-sm text-green-600 mt-2">
                                Price: ${ou.agreed_unit_price.toLocaleString()}
                              </p>
                            )}
                          </div>
                          {permissions.canEditCRM && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUnit(ou.unit_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Activity Timeline</CardTitle>
                {permissions.canEditCRM && (
                  <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Log Activity
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Log Activity</DialogTitle>
                        <DialogDescription>Record an interaction</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Type</Label>
                          <Select value={activityKind} onValueChange={(v) => setActivityKind(v as ActivityKind)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="call">Call</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="meeting">Meeting</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="note">Note</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Subject</Label>
                          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
                        </div>
                        <Button onClick={handleLogActivity} className="w-full">Log Activity</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activities yet</p>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="border-l-2 border-primary pl-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {activity.kind}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                        <p className="font-medium text-sm">{activity.subject}</p>
                        {activity.body && (
                          <p className="text-sm text-muted-foreground mt-1">{activity.body}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Documents</CardTitle>
                {permissions.canEditCRM && (
                  <Dialog open={documentDialog} onOpenChange={setDocumentDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>Add KYC documents, ID, licenses, etc.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Document Name</Label>
                          <Input
                            value={documentName}
                            onChange={(e) => setDocumentName(e.target.value)}
                            placeholder="e.g., Driver License"
                          />
                        </div>
                        <div>
                          <Label>File URL</Label>
                          <Input
                            value={documentUrl}
                            onChange={(e) => setDocumentUrl(e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                        <Button onClick={handleAddDocument} className="w-full">Upload</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(doc.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}
