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
import { getEmailLink, getPhoneLink, getWhatsAppLink } from '@/lib/crm-integrations';
import { Building, UserPlus, Upload, TrendingUp, Users, FileText, Activity, Mail, Phone, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    getAccount,
    getAccountContacts,
    getAccountOpportunities,
    addContact,
    getActivities,
    addDocument,
    getDocuments,
  } = useCRMStore();

  const account = id ? getAccount(id) : null;
  const contacts = id ? getAccountContacts(id) : [];
  const opportunities = id ? getAccountOpportunities(id) : [];
  const activities = id ? getActivities('account', id) : [];
  const documents = id ? getDocuments('account', id) : [];

  const [contactDialog, setContactDialog] = useState(false);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  if (!account) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p>Account not found</p>
        </div>
      </BackofficeLayout>
    );
  }

  const wonOpportunities = opportunities.filter((opp) => opp.pipeline_stage === 'won');
  const isRepeatBuyer = wonOpportunities.length > 1;
  const totalValue = wonOpportunities.reduce((sum, opp) => {
    // This would calculate from opportunity_units in a real implementation
    return sum;
  }, 0);

  const handleAddContact = () => {
    if (!firstName || !lastName || !email) {
      toast.error('First name, last name, and email are required');
      return;
    }

    addContact({
      account_id: account.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      role_title: roleTitle || undefined,
      preferred_lang: 'en',
    });

    toast.success('Contact added successfully');
    setContactDialog(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setRoleTitle('');
  };

  const handleAddDocument = () => {
    if (!documentName || !documentUrl) {
      toast.error('Document name and URL are required');
      return;
    }

    addDocument({
      parent_type: 'account',
      parent_id: account.id,
      name: documentName,
      file_url: documentUrl,
      mime: 'application/pdf',
      size_kb: 0,
      uploaded_by: 'current-user',
    });

    toast.success('Document uploaded successfully');
    setDocumentDialog(false);
    setDocumentName('');
    setDocumentUrl('');
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">{account.name}</h2>
              {isRepeatBuyer && (
                <Badge className="bg-purple-500">
                  Repeat Buyer
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground capitalize">
              {account.kind} • {format(new Date(account.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={contactDialog} onOpenChange={setContactDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                  <DialogDescription>Add a new contact to this account</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>First Name</Label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div>
                    <Label>Role/Title</Label>
                    <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
                  </div>
                  <Button onClick={handleAddContact} className="w-full">Add Contact</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={documentDialog} onOpenChange={setDocumentDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>Upload account-related documents</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Document Name</Label>
                    <Input
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      placeholder="e.g., Tax Certificate"
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
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Contacts</div>
              <div className="text-2xl font-bold">{contacts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Opportunities</div>
              <div className="text-2xl font-bold">{opportunities.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Won Deals</div>
              <div className="text-2xl font-bold">{wonOpportunities.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Tax Exempt</div>
              <div className="text-2xl font-bold">
                {account.is_tax_exempt ? 'Yes' : 'No'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities ({opportunities.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p>{account.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="capitalize">{account.kind}</p>
                  </div>
                  {account.tax_id && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tax ID</label>
                      <p>{account.tax_id}</p>
                    </div>
                  )}
                  {account.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <div className="flex items-center gap-2">
                        <p>{account.phone}</p>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getPhoneLink(account.phone)} className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getWhatsAppLink(account.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                  {account.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="flex items-center gap-2">
                        <p>{account.email}</p>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getEmailLink(account.email)} className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                  {account.website && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Website</label>
                      <p>
                        <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-primary">
                          {account.website}
                        </a>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {account.billing_address && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Address</label>
                      <p>{account.billing_address}</p>
                    </div>
                  )}
                  {account.billing_state && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">State</label>
                      <p>{account.billing_state}</p>
                    </div>
                  )}
                  {account.billing_country && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Country</label>
                      <p>{account.billing_country}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tax Exempt</label>
                    <p>{account.is_tax_exempt ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resale Certificate</label>
                    <p>{account.resale_cert ? 'Yes' : 'No'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contacts">
            <Card>
              <CardContent>
                {contacts.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No contacts yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() => navigate(`/backoffice/crm/contacts/${contact.id}`)}
                      >
                        <div>
                          <p className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{contact.email}</p>
                          {contact.role_title && (
                            <p className="text-xs text-muted-foreground">{contact.role_title}</p>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contact.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities">
            <Card>
              <CardContent>
                {opportunities.length === 0 ? (
                  <div className="py-12 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No opportunities yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {opportunities.map((opp) => (
                      <div
                        key={opp.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() => navigate(`/backoffice/crm/opportunities/${opp.id}`)}
                      >
                        <div>
                          <p className="font-medium">{opp.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(opp.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={`bg-${opp.pipeline_stage === 'won' ? 'green' : opp.pipeline_stage === 'lost' ? 'gray' : 'blue'}-500`}>
                            {opp.pipeline_stage}
                          </Badge>
                          {opp.expected_close_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Close: {format(new Date(opp.expected_close_at), 'MMM d')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
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

          <TabsContent value="activity">
            <Card>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="py-12 text-center">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No activities yet</p>
                  </div>
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
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}