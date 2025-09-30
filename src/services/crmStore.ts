import { create } from 'zustand';
import {
  Account,
  Contact,
  Lead,
  Opportunity,
  OpportunityUnit,
  Activity,
  Document,
  LeadIntakeLink,
} from '@/types';

interface CRMStore {
  // State
  accounts: Account[];
  contacts: Contact[];
  leads: Lead[];
  opportunities: Opportunity[];
  opportunityUnits: OpportunityUnit[];
  activities: Activity[];
  documents: Document[];
  leadIntakeLinks: LeadIntakeLink[];

  // Accounts
  addAccount: (account: Account) => void;
  updateAccount: (id: string, data: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  getAccount: (id: string) => Account | undefined;

  // Contacts
  addContact: (contact: Contact) => void;
  updateContact: (id: string, data: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  getContactsByAccount: (accountId: string) => Contact[];

  // Leads
  addLead: (lead: Lead) => void;
  updateLead: (id: string, data: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  convertLeadToOpportunity: (leadId: string, opportunityData: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) => Opportunity;

  // Opportunities
  addOpportunity: (opportunity: Opportunity) => void;
  updateOpportunity: (id: string, data: Partial<Opportunity>) => void;
  deleteOpportunity: (id: string) => void;
  getOpportunity: (id: string) => Opportunity | undefined;

  // Opportunity Units
  addOpportunityUnit: (opportunityUnit: OpportunityUnit) => void;
  removeOpportunityUnit: (opportunityId: string, unitId: string) => void;
  updateOpportunityUnit: (opportunityId: string, unitId: string, data: Partial<OpportunityUnit>) => void;
  getOpportunityUnits: (opportunityId: string) => OpportunityUnit[];

  // Activities
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, data: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  getActivitiesByParent: (parentType: Activity['parent_type'], parentId: string) => Activity[];
  markActivityComplete: (id: string) => void;

  // Documents
  addDocument: (document: Document) => void;
  deleteDocument: (id: string) => void;
  getDocumentsByParent: (parentType: Document['parent_type'], parentId: string) => Document[];

  // Lead Intake Links
  addLeadIntakeLink: (link: LeadIntakeLink) => void;
  getLeadByBuyerRequest: (buyerRequestId: string) => Lead | undefined;
}

export const useCRMStore = create<CRMStore>((set, get) => ({
  // Initial state
  accounts: [],
  contacts: [],
  leads: [],
  opportunities: [],
  opportunityUnits: [],
  activities: [],
  documents: [],
  leadIntakeLinks: [],

  // Accounts
  addAccount: (account) => set((state) => ({ accounts: [...state.accounts, account] })),
  updateAccount: (id, data) =>
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a)),
    })),
  deleteAccount: (id) => set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) })),
  getAccount: (id) => get().accounts.find((a) => a.id === id),

  // Contacts
  addContact: (contact) => set((state) => ({ contacts: [...state.contacts, contact] })),
  updateContact: (id, data) =>
    set((state) => ({
      contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c)),
    })),
  deleteContact: (id) => set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id) })),
  getContactsByAccount: (accountId) => get().contacts.filter((c) => c.account_id === accountId),

  // Leads
  addLead: (lead) => set((state) => ({ leads: [...state.leads, lead] })),
  updateLead: (id, data) =>
    set((state) => ({
      leads: state.leads.map((l) => (l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l)),
    })),
  deleteLead: (id) => set((state) => ({ leads: state.leads.filter((l) => l.id !== id) })),
  convertLeadToOpportunity: (leadId, opportunityData) => {
    const lead = get().leads.find((l) => l.id === leadId);
    if (!lead) throw new Error('Lead not found');

    const now = new Date().toISOString();
    const opportunity: Opportunity = {
      ...opportunityData,
      id: Math.random().toString(36).substr(2, 9),
      created_at: now,
      updated_at: now,
    };

    get().addOpportunity(opportunity);
    get().updateLead(leadId, { status: 'converted' });

    return opportunity;
  },

  // Opportunities
  addOpportunity: (opportunity) => set((state) => ({ opportunities: [...state.opportunities, opportunity] })),
  updateOpportunity: (id, data) =>
    set((state) => ({
      opportunities: state.opportunities.map((o) =>
        o.id === id ? { ...o, ...data, updated_at: new Date().toISOString() } : o
      ),
    })),
  deleteOpportunity: (id) => set((state) => ({ opportunities: state.opportunities.filter((o) => o.id !== id) })),
  getOpportunity: (id) => get().opportunities.find((o) => o.id === id),

  // Opportunity Units
  addOpportunityUnit: (opportunityUnit) =>
    set((state) => ({ opportunityUnits: [...state.opportunityUnits, opportunityUnit] })),
  removeOpportunityUnit: (opportunityId, unitId) =>
    set((state) => ({
      opportunityUnits: state.opportunityUnits.filter(
        (ou) => !(ou.opportunity_id === opportunityId && ou.unit_id === unitId)
      ),
    })),
  updateOpportunityUnit: (opportunityId, unitId, data) =>
    set((state) => ({
      opportunityUnits: state.opportunityUnits.map((ou) =>
        ou.opportunity_id === opportunityId && ou.unit_id === unitId ? { ...ou, ...data } : ou
      ),
    })),
  getOpportunityUnits: (opportunityId) =>
    get().opportunityUnits.filter((ou) => ou.opportunity_id === opportunityId),

  // Activities
  addActivity: (activity) => set((state) => ({ activities: [...state.activities, activity] })),
  updateActivity: (id, data) =>
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a
      ),
    })),
  deleteActivity: (id) => set((state) => ({ activities: state.activities.filter((a) => a.id !== id) })),
  getActivitiesByParent: (parentType, parentId) =>
    get().activities.filter((a) => a.parent_type === parentType && a.parent_id === parentId),
  markActivityComplete: (id) =>
    get().updateActivity(id, { completed_at: new Date().toISOString() }),

  // Documents
  addDocument: (document) => set((state) => ({ documents: [...state.documents, document] })),
  deleteDocument: (id) => set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),
  getDocumentsByParent: (parentType, parentId) =>
    get().documents.filter((d) => d.parent_type === parentType && d.parent_id === parentId),

  // Lead Intake Links
  addLeadIntakeLink: (link) => set((state) => ({ leadIntakeLinks: [...state.leadIntakeLinks, link] })),
  getLeadByBuyerRequest: (buyerRequestId) => {
    const link = get().leadIntakeLinks.find((l) => l.buyer_request_id === buyerRequestId);
    return link ? get().leads.find((lead) => lead.id === link.lead_id) : undefined;
  },
}));
