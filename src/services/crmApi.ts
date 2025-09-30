import { useCRMStore } from './crmStore';
import type {
  Account,
  Contact,
  Lead,
  Opportunity,
  Activity,
  LeadSource,
  LeadStatus,
  OpportunityStage,
  ActivityKind,
  ActivityParentType,
  UnitCategory,
} from '@/types';

// API Response types (excluding cost/margin fields)

export interface AccountSummaryResponse {
  account: Account;
  contacts: Contact[];
  opportunities: Opportunity[];
  wonDealsCount: number;
  totalRevenue: number;
}

export interface LeadFilters {
  owner?: string;
  status?: LeadStatus;
  source?: LeadSource;
  date_from?: string;
  date_to?: string;
  category_interest?: UnitCategory;
}

export interface OpportunityFilters {
  stage?: OpportunityStage;
  owner?: string;
  date_from?: string;
  date_to?: string;
  expected_close_before?: string;
  expected_close_after?: string;
}

export interface LeadResponse extends Omit<Lead, 'unit_interest'> {
  account?: Omit<Account, 'notes'>;
  contact?: Omit<Contact, 'notes'>;
}

export interface OpportunityResponse extends Omit<Opportunity, 'reason_lost_notes'> {
  account?: Omit<Account, 'notes'>;
  contact?: Omit<Contact, 'notes'>;
  units?: Array<{
    unit_id: string;
    quantity: number;
    agreed_unit_price?: number;
  }>;
}

export interface ActivityCreateRequest {
  parent_type: ActivityParentType;
  parent_id: string;
  kind: ActivityKind;
  subject: string;
  body?: string;
  due_at?: string;
  owner_user_id?: string;
}

// API Service Functions

/**
 * GET /api/crm/accounts/:id
 * Returns account summary with counts of won deals
 * Excludes cost/margin data
 */
export const getAccountSummary = (accountId: string): AccountSummaryResponse | null => {
  const store = useCRMStore.getState();
  
  const account = store.getAccount(accountId);
  if (!account) return null;

  const contacts = store.getAccountContacts(accountId);
  const opportunities = store.getAccountOpportunities(accountId);
  
  // Calculate won deals and total revenue (based on agreed prices, not costs)
  const wonOpportunities = opportunities.filter(opp => opp.pipeline_stage === 'won');
  const wonDealsCount = wonOpportunities.length;
  
  let totalRevenue = 0;
  wonOpportunities.forEach(opp => {
    const oppUnits = store.getOpportunityUnits(opp.id);
    oppUnits.forEach(ou => {
      if (ou.agreed_unit_price) {
        totalRevenue += ou.agreed_unit_price * ou.quantity;
      }
    });
  });

  return {
    account,
    contacts,
    opportunities,
    wonDealsCount,
    totalRevenue,
  };
};

/**
 * GET /api/crm/leads?filters
 * Returns filtered leads list
 * Excludes sensitive data
 */
export const getLeadsFiltered = (filters: LeadFilters = {}): LeadResponse[] => {
  const store = useCRMStore.getState();
  let leads = [...store.leads];

  // Apply filters
  if (filters.owner) {
    leads = leads.filter(l => l.owner_user_id === filters.owner);
  }
  
  if (filters.status) {
    leads = leads.filter(l => l.status === filters.status);
  }
  
  if (filters.source) {
    leads = leads.filter(l => l.source === filters.source);
  }
  
  if (filters.category_interest) {
    leads = leads.filter(l => l.category_interest === filters.category_interest);
  }
  
  if (filters.date_from) {
    leads = leads.filter(l => new Date(l.created_at) >= new Date(filters.date_from!));
  }
  
  if (filters.date_to) {
    leads = leads.filter(l => new Date(l.created_at) <= new Date(filters.date_to!));
  }

  // Transform to response format (exclude unit_interest object which might contain costs)
  return leads.map(lead => {
    const { unit_interest, ...leadData } = lead;
    
    return {
      ...leadData,
      account: lead.account_id ? store.getAccount(lead.account_id) : undefined,
      contact: lead.contact_id ? store.getContact(lead.contact_id) : undefined,
    };
  });
};

/**
 * GET /api/crm/opportunities?filters
 * Returns filtered opportunities list
 * Excludes cost/margin data from units
 */
export const getOpportunitiesFiltered = (filters: OpportunityFilters = {}): OpportunityResponse[] => {
  const store = useCRMStore.getState();
  let opportunities = [...store.opportunities];

  // Apply filters
  if (filters.stage) {
    opportunities = opportunities.filter(o => o.pipeline_stage === filters.stage);
  }
  
  if (filters.owner) {
    opportunities = opportunities.filter(o => o.owner_user_id === filters.owner);
  }
  
  if (filters.date_from) {
    opportunities = opportunities.filter(o => new Date(o.created_at) >= new Date(filters.date_from!));
  }
  
  if (filters.date_to) {
    opportunities = opportunities.filter(o => new Date(o.created_at) <= new Date(filters.date_to!));
  }
  
  if (filters.expected_close_before) {
    opportunities = opportunities.filter(o => 
      o.expected_close_at && new Date(o.expected_close_at) <= new Date(filters.expected_close_before!)
    );
  }
  
  if (filters.expected_close_after) {
    opportunities = opportunities.filter(o => 
      o.expected_close_at && new Date(o.expected_close_at) >= new Date(filters.expected_close_after!)
    );
  }

  // Transform to response format (exclude reason_lost_notes and cost data)
  return opportunities.map(opp => {
    const { reason_lost_notes, ...oppData } = opp;
    
    const units = store.getOpportunityUnits(opp.id).map(ou => ({
      unit_id: ou.unit_id,
      quantity: ou.quantity,
      agreed_unit_price: ou.agreed_unit_price,
      // Explicitly exclude cost fields that might be in unit object
    }));
    
    return {
      ...oppData,
      account: store.getAccount(opp.account_id),
      contact: opp.contact_id ? store.getContact(opp.contact_id) : undefined,
      units,
    };
  });
};

/**
 * POST /api/crm/leads/:id/convert
 * Converts lead to opportunity
 */
export const convertLead = (
  leadId: string,
  opportunityName: string,
  expectedCloseAt?: string
): { success: boolean; opportunity?: Opportunity; error?: string } => {
  const store = useCRMStore.getState();
  
  const lead = store.getLead(leadId);
  if (!lead) {
    return { success: false, error: 'Lead not found' };
  }
  
  if (lead.status === 'converted') {
    return { success: false, error: 'Lead already converted' };
  }
  
  if (!lead.account_id) {
    return { success: false, error: 'Lead must have an account before conversion' };
  }

  try {
    const opportunity = store.convertLeadToOpportunity(leadId, {
      account_id: lead.account_id,
      contact_id: lead.contact_id,
      owner_user_id: lead.owner_user_id || 'user-1',
      name: opportunityName,
      pipeline_stage: 'new',
      expected_close_at: expectedCloseAt,
    });

    return { success: true, opportunity };
  } catch (error) {
    return { success: false, error: 'Failed to convert lead' };
  }
};

/**
 * POST /api/crm/opportunities/:id/units
 * Add unit to opportunity
 */
export const addUnitToOpportunity = (
  opportunityId: string,
  unitId: string,
  quantity: number = 1,
  agreedPrice?: number
): { success: boolean; error?: string } => {
  const store = useCRMStore.getState();
  
  const opportunity = store.getOpportunity(opportunityId);
  if (!opportunity) {
    return { success: false, error: 'Opportunity not found' };
  }

  try {
    store.addOpportunityUnit({
      opportunity_id: opportunityId,
      unit_id: unitId,
      quantity,
      agreed_unit_price: agreedPrice,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to add unit' };
  }
};

/**
 * DELETE /api/crm/opportunities/:id/units/:unitId
 * Remove unit from opportunity
 */
export const removeUnitFromOpportunity = (
  opportunityId: string,
  unitId: string
): { success: boolean; error?: string } => {
  const store = useCRMStore.getState();
  
  try {
    store.removeOpportunityUnit(opportunityId, unitId);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to remove unit' };
  }
};

/**
 * POST /api/crm/activities
 * Log a new activity (note, call, meeting, email, whatsapp, task)
 */
export const logActivity = (
  activityData: ActivityCreateRequest
): { success: boolean; activity?: Activity; error?: string } => {
  const store = useCRMStore.getState();
  
  // Validate parent exists
  if (activityData.parent_type === 'lead') {
    const lead = store.getLead(activityData.parent_id);
    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }
  } else if (activityData.parent_type === 'opportunity') {
    const opportunity = store.getOpportunity(activityData.parent_id);
    if (!opportunity) {
      return { success: false, error: 'Opportunity not found' };
    }
  } else if (activityData.parent_type === 'account') {
    const account = store.getAccount(activityData.parent_id);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }
  } else if (activityData.parent_type === 'contact') {
    const contact = store.getContact(activityData.parent_id);
    if (!contact) {
      return { success: false, error: 'Contact not found' };
    }
  }

  try {
    const activity = store.addActivity(activityData);
    return { success: true, activity };
  } catch (error) {
    return { success: false, error: 'Failed to log activity' };
  }
};

// Export convenience functions for direct use
export const crmApi = {
  getAccountSummary,
  getLeadsFiltered,
  getOpportunitiesFiltered,
  convertLead,
  addUnitToOpportunity,
  removeUnitFromOpportunity,
  logActivity,
};
