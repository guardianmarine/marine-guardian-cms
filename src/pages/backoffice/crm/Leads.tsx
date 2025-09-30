import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useCRMStore } from '@/services/crmStore';
import { LeadSource, LeadStatus, UnitCategory } from '@/types';
import { Plus, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow, differenceInHours } from 'date-fns';

export default function Leads() {
  const { leads } = useCRMStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<UnitCategory | 'all'>('all');

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchQuery ||
      lead.contact?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.account?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || lead.category_interest === categoryFilter;

    return matchesSearch && matchesSource && matchesStatus && matchesCategory;
  });

  // Calculate SLA status
  const getSLAStatus = (lead: typeof leads[0]) => {
    if (lead.first_touch_at) return 'touched';
    
    const createdAt = new Date(lead.created_at);
    const now = new Date();
    const hoursPassed = differenceInHours(now, createdAt);
    const hoursRemaining = lead.sla_first_touch_hours - hoursPassed;

    if (hoursRemaining <= 0) return 'overdue';
    if (hoursRemaining <= 6) return 'urgent';
    return 'ok';
  };

  const renderSLABadge = (lead: typeof leads[0]) => {
    const status = getSLAStatus(lead);

    if (status === 'touched') {
      return (
        <Badge variant="outline" className="flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Contacted
        </Badge>
      );
    }

    if (status === 'overdue') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </Badge>
      );
    }

    if (status === 'urgent') {
      const createdAt = new Date(lead.created_at);
      const now = new Date();
      const hoursPassed = differenceInHours(now, createdAt);
      const hoursRemaining = lead.sla_first_touch_hours - hoursPassed;

      return (
        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
          <AlertCircle className="h-3 w-3" />
          {hoursRemaining}h left
        </Badge>
      );
    }

    return null;
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground">Manage incoming leads with SLA tracking</p>
          </div>
          <Link to="/backoffice/crm/leads/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as LeadSource | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="web_form">Web Form</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="campaign">Campaign</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="disqualified">Disqualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as UnitCategory | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="truck">Trucks</SelectItem>
              <SelectItem value="trailer">Trailers</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        {lead.contact ? (
                          <>
                            <div className="font-medium">
                              {lead.contact.first_name} {lead.contact.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">{lead.contact.email}</div>
                          </>
                        ) : (
                          <div className="text-muted-foreground">No contact</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.source}</Badge>
                    </TableCell>
                    <TableCell>
                      {lead.category_interest ? (
                        <div className="text-sm">
                          <div className="font-medium capitalize">{lead.category_interest}</div>
                          {lead.unit_interest && (
                            <div className="text-muted-foreground">
                              {lead.unit_interest.year} {lead.unit_interest.make}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lead.status === 'new'
                            ? 'default'
                            : lead.status === 'qualified'
                            ? 'secondary'
                            : lead.status === 'converted'
                            ? 'outline'
                            : 'destructive'
                        }
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderSLABadge(lead)}</TableCell>
                    <TableCell>
                      {lead.owner_user_id ? (
                        <span className="text-sm">{lead.owner_user_id}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/backoffice/crm/leads/${lead.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </BackofficeLayout>
  );
}
