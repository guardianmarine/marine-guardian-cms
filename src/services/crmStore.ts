import { create } from 'zustand';
import type {
  Account,
  Contact,
  Lead,
  Opportunity,
  OpportunityUnit,
  Activity,
  Document,
  LeadIntakeLink,
  LeadSource,
  LeadStatus,
  OpportunityStage,
  OpportunityReasonLost,
  ActivityKind,
  ActivityParentType,
  DocumentParentType,
} from '@/types';
import {
  mockAccounts,
  mockContacts,
  mockLeads,
  mockOpportunities,
  mockOpportunityUnits,
  mockActivities,
} from './crmMockData';

interface CRMStore {
  accounts: Account[];
  contacts: Contact[];
  leads: Lead[];
  opportunities: Opportunity[];
  opportunityUnits: OpportunityUnit[];
  activities: Activity[];
  documents: Document[];
  leadIntakeLinks: LeadIntakeLink[];

  // Account actions
  addAccount: (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => Account;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  getAccount: (id: string) => Account | undefined;
  getAccountContacts: (accountId: string) => Contact[];
  getAccountOpportunities: (accountId: string) => Opportunity[];

  // Contact actions
  addContact: (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>) => Contact;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  getContact: (id: string) => Contact | undefined;

  // Lead actions
  addLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => Lead;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  getLead: (id: string) => Lead | undefined;
  convertLeadToOpportunity: (leadId: string, opportunityData: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) => Opportunity;

  // Opportunity actions
  addOpportunity: (opportunity: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) => Opportunity;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  getOpportunity: (id: string) => Opportunity | undefined;
  closeOpportunityAsWon: (id: string) => void;
  closeOpportunityAsLost: (id: string, reason: OpportunityReasonLost, notes?: string) => void;

  // Opportunity Units
  addOpportunityUnit: (oppUnit: OpportunityUnit) => void;
  removeOpportunityUnit: (opportunityId: string, unitId: string) => void;
  getOpportunityUnits: (opportunityId: string) => OpportunityUnit[];
  updateOpportunityUnitPrice: (opportunityId: string, unitId: string, price: number) => void;

  // Activity actions
  addActivity: (activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>) => Activity;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  getActivities: (parentType: ActivityParentType, parentId: string) => Activity[];
  getMyTasks: (userId: string) => Activity[];
  completeTask: (id: string) => void;

  // Document actions
  addDocument: (doc: Omit<Document, 'id' | 'created_at'>) => Document;
  getDocuments: (parentType: DocumentParentType, parentId: string) => Document[];

  // Lead Intake Links
  linkBuyerRequestToLead: (buyerRequestId: string, leadId: string) => void;
}

export const useCRMStore = create<CRMStore>((set, get) => ({
  accounts: mockAccounts,
  contacts: mockContacts,
  leads: mockLeads,
  opportunities: mockOpportunities,
  opportunityUnits: mockOpportunityUnits,
  activities: mockActivities,
  documents: [],
  leadIntakeLinks: [],

  // Account actions
  addAccount: (accountData) => {
    const account: Account = {
      ...accountData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => ({ accounts: [...state.accounts, account] }));
    return account;
  },

  updateAccount: (id, updates) => {
    set((state) => ({
      accounts: state.accounts.map((acc) =>
        acc.id === id ? { ...acc, ...updates, updated_at: new Date().toISOString() } : acc
      ),
    }));
  },

  getAccount: (id) => get().accounts.find((acc) => acc.id === id),

  getAccountContacts: (accountId) => get().contacts.filter((c) => c.account_id === accountId),

  getAccountOpportunities: (accountId) => get().opportunities.filter((o) => o.account_id === accountId),

  // Contact actions
  addContact: (contactData) => {
    const contact: Contact = {
      ...contactData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => ({ contacts: [...state.contacts, contact] }));
    return contact;
  },

  updateContact: (id, updates) => {
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ),
    }));
  },

  getContact: (id) => get().contacts.find((c) => c.id === id),

  // Lead actions
  addLead: (leadData) => {
    const lead: Lead = {
      ...leadData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => ({ leads: [...state.leads, lead] }));
    return lead;
  },

  updateLead: (id, updates) => {
    set((state) => ({
      leads: state.leads.map((l) =>
        l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
      ),
    }));
  },

  getLead: (id) => get().leads.find((l) => l.id === id),

  convertLeadToOpportunity: (leadId, opportunityData) => {
    const opportunity = get().addOpportunity(opportunityData);
    get().updateLead(leadId, { status: 'converted' as LeadStatus });
    return opportunity;
  },

  // Opportunity actions
  addOpportunity: (opportunityData) => {
    const opportunity: Opportunity = {
      ...opportunityData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => ({ opportunities: [...state.opportunities, opportunity] }));
    return opportunity;
  },

  updateOpportunity: (id, updates) => {
    set((state) => ({
      opportunities: state.opportunities.map((o) =>
        o.id === id ? { ...o, ...updates, updated_at: new Date().toISOString() } : o
      ),
    }));
  },

  getOpportunity: (id) => get().opportunities.find((o) => o.id === id),

  closeOpportunityAsWon: (id) => {
    get().updateOpportunity(id, {
      pipeline_stage: 'won' as OpportunityStage,
      closed_at: new Date().toISOString(),
    });
  },

  closeOpportunityAsLost: (id, reason, notes) => {
    get().updateOpportunity(id, {
      pipeline_stage: 'lost' as OpportunityStage,
      reason_lost: reason,
      reason_lost_notes: notes,
      closed_at: new Date().toISOString(),
    });
  },

  // Opportunity Units
  addOpportunityUnit: (oppUnit) => {
    set((state) => ({ opportunityUnits: [...state.opportunityUnits, oppUnit] }));
  },

  removeOpportunityUnit: (opportunityId, unitId) => {
    set((state) => ({
      opportunityUnits: state.opportunityUnits.filter(
        (ou) => !(ou.opportunity_id === opportunityId && ou.unit_id === unitId)
      ),
    }));
  },

  getOpportunityUnits: (opportunityId) =>
    get().opportunityUnits.filter((ou) => ou.opportunity_id === opportunityId),

  updateOpportunityUnitPrice: (opportunityId, unitId, price) => {
    set((state) => ({
      opportunityUnits: state.opportunityUnits.map((ou) =>
        ou.opportunity_id === opportunityId && ou.unit_id === unitId
          ? { ...ou, agreed_unit_price: price }
          : ou
      ),
    }));
  },

  // Activity actions
  addActivity: (activityData) => {
    const activity: Activity = {
      ...activityData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => ({ activities: [...state.activities, activity] }));

    // Update first_touch_at for leads if this is the first activity
    if (activityData.parent_type === 'lead') {
      const lead = get().getLead(activityData.parent_id);
      if (lead && !lead.first_touch_at) {
        get().updateLead(activityData.parent_id, {
          first_touch_at: new Date().toISOString(),
        });
      }
    }

    return activity;
  },

  updateActivity: (id, updates) => {
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a
      ),
    }));
  },

  getActivities: (parentType, parentId) =>
    get()
      .activities.filter((a) => a.parent_type === parentType && a.parent_id === parentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),

  getMyTasks: (userId) =>
    get().activities.filter(
      (a) => a.kind === 'task' && a.owner_user_id === userId && !a.completed_at
    ),

  completeTask: (id) => {
    get().updateActivity(id, { completed_at: new Date().toISOString() });
  },

  // Document actions
  addDocument: (docData) => {
    const document: Document = {
      ...docData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    set((state) => ({ documents: [...state.documents, document] }));
    return document;
  },

  getDocuments: (parentType, parentId) =>
    get().documents.filter((d) => d.parent_type === parentType && d.parent_id === parentId),

  // Lead Intake Links
  linkBuyerRequestToLead: (buyerRequestId, leadId) => {
    const link: LeadIntakeLink = {
      id: crypto.randomUUID(),
      buyer_request_id: buyerRequestId,
      lead_id: leadId,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ leadIntakeLinks: [...state.leadIntakeLinks, link] }));
  },
}));
