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
import { useCRMStore } from '@/services/crmStore';
import { useAuth } from '@/contexts/AuthContext';
import { getCRMPermissions } from '@/lib/permissions';
import { getEmailLink, getPhoneLink, getWhatsAppLink, getLeadSourceLabel, getLeadStatusLabel } from '@/lib/crm-integrations';
import { Phone, Mail, MessageSquare, ClipboardList, CheckCircle, XCircle, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { toast } from 'sonner';
import { LeadStatus, OpportunityStage, ActivityKind } from '@/types';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getLead, updateLead, getActivities, addActivity, getAccount, getContact, addOpportunity, convertLeadToOpportunity } = useCRMStore();
  
  const permissions = user ? getCRMPermissions(user.role) : { canEditCRM: false };
  
  const lead = id ? getLead(id) : null;
  const account = lead?.account_id ? getAccount(lead.account_id) : null;
  const contact = lead?.contact_id ? getContact(lead.contact_id) : null;
  const activities = id ? getActivities('lead', id) : [];

  const [activityDialog, setActivityDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [convertDialog, setConvertDialog] = useState(false);
  const [activityKind, setActivityKind] = useState<ActivityKind>('call');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [opportunityName, setOpportunityName] = useState('');
  const [expectedClose, setExpectedClose] = useState('');

  if (!lead) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <p>Lead not found</p>
        </div>
      </BackofficeLayout>
    );
  }

  const slaHours = lead.first_touch_at
    ? differenceInHours(new Date(lead.first_touch_at), new Date(lead.created_at))
    : differenceInHours(new Date(), new Date(lead.created_at));
  
  const slaViolated = slaHours > lead.sla_first_touch_hours;
  const slaAtRisk = !lead.first_touch_at && slaHours > lead.sla_first_touch_hours * 0.7;

  const handleLogActivity = () => {
    if (!subject) {
      toast.error('Subject is required');
      return;
    }

    addActivity({
      parent_type: 'lead',
      parent_id: lead.id,
      kind: activityKind,
      subject,
      body,
      owner_user_id: lead.owner_user_id || 'current-user',
      due_at: null,
      completed_at: null,
    });

    toast.success('Activity logged successfully');
    setActivityDialog(false);
    setSubject('');
    setBody('');
  };

  const handleAddTask = () => {
    if (!subject) {
      toast.error('Subject is required');
      return;
    }

    addActivity({
      parent_type: 'lead',
      parent_id: lead.id,
      kind: 'task',
      subject,
      body,
      due_at: dueDate ? new Date(dueDate).toISOString() : null,
      completed_at: null,
      owner_user_id: lead.owner_user_id || 'current-user',
    });

    toast.success('Task created successfully');
    setTaskDialog(false);
    setSubject('');
    setBody('');
    setDueDate('');
  };

  const handleConvert = () => {
    if (!opportunityName) {
      toast.error('Opportunity name is required');
      return;
    }

    const opportunity = convertLeadToOpportunity(lead.id, {
      account_id: lead.account_id!,
      contact_id: lead.contact_id,
      owner_user_id: lead.owner_user_id || 'current-user',
      name: opportunityName,
      pipeline_stage: 'new' as OpportunityStage,
      expected_close_at: expectedClose ? new Date(expectedClose).toISOString() : null,
    });

    toast.success('Lead converted to opportunity!');
    navigate(`/backoffice/crm/opportunities/${opportunity.id}`);
  };

  const handleStatusChange = (status: LeadStatus) => {
    updateLead(lead.id, { status });
    toast.success(`Lead ${status}`);
  };

  const getStatusColor = (status: LeadStatus) => {
    const colors = {
      new: 'bg-blue-500',
      qualified: 'bg-green-500',
      disqualified: 'bg-gray-500',
      converted: 'bg-purple-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold">
              {account?.name || `${contact?.first_name} ${contact?.last_name}` || 'Lead'}
            </h2>
            <p className="text-muted-foreground">
              {t(`crm.source${lead.source.charAt(0).toUpperCase() + lead.source.slice(1).replace('_', '')}`)} • 
              {format(new Date(lead.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(lead.status)}>
              {lead.status}
            </Badge>
            {lead.lead_score > 0 && (
              <Badge variant="outline">Score: {lead.lead_score}</Badge>
            )}
          </div>
        </div>

        {/* SLA Alert */}
        {(slaViolated || slaAtRisk) && (
          <Card className={slaViolated ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'}>
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className={slaViolated ? 'h-5 w-5 text-red-600' : 'h-5 w-5 text-yellow-600'} />
              <div>
                <p className={slaViolated ? 'font-semibold text-red-900' : 'font-semibold text-yellow-900'}>
                  {slaViolated ? 'SLA Violated!' : 'SLA At Risk!'}
                </p>
                <p className={slaViolated ? 'text-sm text-red-700' : 'text-sm text-yellow-700'}>
                  {lead.first_touch_at
                    ? `First touch took ${slaHours} hours (SLA: ${lead.sla_first_touch_hours}h)`
                    : `${slaHours} hours since creation. Action required within ${lead.sla_first_touch_hours}h.`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {permissions.canEditCRM && (
            <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setActivityKind('call')}>
                  <Phone className="h-4 w-4 mr-2" />
                  Log Call
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Activity</DialogTitle>
                  <DialogDescription>Record an interaction with this lead</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Activity Type</Label>
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

            {contact?.email && (
              <Button variant="outline" asChild>
                <a href={getEmailLink(contact.email, `Follow up: ${lead.category_interest || 'Lead'}`)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </a>
              </Button>
            )}

            {contact?.phone && (
              <>
                <Button variant="outline" asChild>
                  <a href={getPhoneLink(contact.phone)}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={getWhatsAppLink(contact.phone, `Hi, this is regarding your interest in ${lead.category_interest || 'our inventory'}`)} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              </>
            )}

            <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                  <DialogDescription>Add a follow-up task for this lead</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Task Subject</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div>
                    <Label>Details</Label>
                    <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                  <Button onClick={handleAddTask} className="w-full">Create Task</Button>
                </div>
              </DialogContent>
            </Dialog>

            {permissions.canEditCRM && lead.status !== 'qualified' && lead.status !== 'converted' && (
              <Button variant="outline" onClick={() => handleStatusChange('qualified' as LeadStatus)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Qualify
              </Button>
            )}

            {permissions.canEditCRM && lead.status !== 'disqualified' && (
              <Button variant="outline" onClick={() => handleStatusChange('disqualified' as LeadStatus)}>
                <XCircle className="h-4 w-4 mr-2" />
                Disqualify
              </Button>
            )}

            {permissions.canEditCRM && lead.status === 'qualified' && (
              <Dialog open={convertDialog} onOpenChange={setConvertDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Convert to Opportunity
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convert to Opportunity</DialogTitle>
                    <DialogDescription>Create a new opportunity from this qualified lead</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Opportunity Name</Label>
                      <Input
                        value={opportunityName}
                        onChange={(e) => setOpportunityName(e.target.value)}
                        placeholder="e.g., Truck Purchase - ABC Corp"
                      />
                    </div>
                    <div>
                      <Label>Expected Close Date</Label>
                      <Input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />
                    </div>
                    <Button onClick={handleConvert} className="w-full">Convert</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Lead Info */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account</label>
                <p>{account?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact</label>
                <p>{contact ? `${contact.first_name} ${contact.last_name}` : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Source</label>
                <p>{t(`crm.source${lead.source.charAt(0).toUpperCase() + lead.source.slice(1).replace('_', '')}`)}</p>
              </div>
              {lead.category_interest && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Interest</label>
                  <p className="capitalize">{lead.category_interest}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Owner</label>
                <p>{lead.owner_user_id || 'Unassigned'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline ({activities.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities yet</p>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 5).map((activity) => (
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
        </div>
      </div>
    </BackofficeLayout>
  );
}
