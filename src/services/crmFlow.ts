import { supabase } from '@/integrations/supabase/client';

interface ConvertToLeadInput {
  buyerRequestId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  unitId?: string;
  pageUrl?: string;
  currentUserId: string;
}

interface ConvertToLeadResult {
  accountId: string;
  contactId: string;
  leadId: string;
  opportunityId: string;
  taskId: string;
}

/**
 * Parse full name into first and last name
 */
function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Parse unit ID or slug from URL
 * Supports URLs like:
 * - /unit/<id>
 * - /unit/<slug>
 * - https://domain/unit/<id>
 * - https://domain/unit/<slug>
 */
function parseUnitIdOrSlugFromUrl(url: string): { by: 'id' | 'slug'; value: string } | null {
  if (!url) return null;
  
  try {
    // Handle both relative and absolute URLs
    const urlObj = url.startsWith('http') ? new URL(url) : new URL(url, 'http://dummy.com');
    const pathMatch = urlObj.pathname.match(/\/unit\/([^/?#]+)/);
    
    if (!pathMatch || !pathMatch[1]) return null;
    
    const value = pathMatch[1];
    
    // Check if it's a UUID (rough check)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(value)) {
      return { by: 'id', value };
    }
    
    // Otherwise, assume it's a slug
    return { by: 'slug', value };
  } catch (err) {
    console.error('Error parsing unit URL:', err);
    return null;
  }
}

/**
 * Resolve unit ID from either direct unit_id or page_url
 */
async function resolveUnitId(unitId?: string, pageUrl?: string): Promise<string | null> {
  // If we already have a unit_id, use it
  if (unitId) return unitId;
  
  // Try to parse from page_url
  if (!pageUrl) return null;
  
  const parsed = parseUnitIdOrSlugFromUrl(pageUrl);
  if (!parsed) return null;
  
  try {
    if (parsed.by === 'id') {
      // Verify the unit exists
      const { data } = await supabase
        .from('units')
        .select('id')
        .eq('id', parsed.value)
        .maybeSingle();
      
      return data?.id || null;
    } else {
      // Look up by slug
      const { data } = await supabase
        .from('units')
        .select('id')
        .eq('slug', parsed.value)
        .maybeSingle();
      
      return data?.id || null;
    }
  } catch (err) {
    console.error('Error resolving unit:', err);
    return null;
  }
}

/**
 * Convert a buyer request into a full CRM lead with account, contact, opportunity, and task
 * This function is idempotent and tolerant to duplicates
 */
export async function convertBuyerRequestToLead(
  input: ConvertToLeadInput
): Promise<ConvertToLeadResult> {
  const { buyerRequestId, name, email, phone, message, unitId, pageUrl, currentUserId } = input;
  
  try {
    const { firstName, lastName } = parseName(name);

    // 1. Resolve unit_id (from direct unitId or parsed from pageUrl)
    const resolvedUnitId = await resolveUnitId(unitId, pageUrl);

    // 2. Check if contact exists by email (upsert logic)
    let accountId: string;
    let contactId: string;

    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, account_id, phone')
      .eq('email', email)
      .maybeSingle();

    if (existingContact) {
      // Reuse existing contact and account
      contactId = existingContact.id;
      accountId = existingContact.account_id!;
      
      // Update phone if it's empty and we have a new phone
      if (phone && !existingContact.phone) {
        await supabase
          .from('contacts')
          .update({ phone })
          .eq('id', contactId);
      }
    } else {
      // 3. Create new account
      const { data: newAccount, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name: name,
          kind: 'individual',
          created_by: currentUserId,
        })
        .select()
        .single();

      if (accountError) throw new Error(`Failed to create account: ${accountError.message}`);
      accountId = newAccount.id;

      // 4. Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          account_id: accountId,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
        })
        .select()
        .single();

      if (contactError) throw new Error(`Failed to create contact: ${contactError.message}`);
      contactId = newContact.id;
    }

    // 5. Create lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        account_id: accountId,
        contact_id: contactId,
        unit_id: resolvedUnitId,
        stage: 'new',
        source: 'website',
        owner_user_id: currentUserId,
        notes: message,
      })
      .select()
      .single();

    if (leadError) throw new Error(`Failed to create lead: ${leadError.message}`);

    // 6. Create opportunity
    const expectedCloseDate = new Date();
    expectedCloseDate.setDate(expectedCloseDate.getDate() + 21); // 21 days from now

    const { data: opportunity, error: opportunityError } = await supabase
      .from('opportunities')
      .insert({
        account_id: accountId,
        contact_id: contactId,
        unit_id: resolvedUnitId,
        stage: 'new',
        expected_close: expectedCloseDate.toISOString().split('T')[0],
        owner_user_id: currentUserId,
      })
      .select()
      .single();

    if (opportunityError) throw new Error(`Failed to create opportunity: ${opportunityError.message}`);

    // 7. Create first contact task (SLA 24h)
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + 24); // 24 hours from now

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        lead_id: lead.id,
        opportunity_id: opportunity.id,
        title: 'First contact (SLA 24h)',
        due_at: dueAt.toISOString(),
        assigned_to: currentUserId,
        status: 'open',
      })
      .select()
      .single();

    if (taskError) throw new Error(`Failed to create task: ${taskError.message}`);

    // 8. Mark buyer request as converted
    const { error: updateError } = await supabase
      .from('buyer_requests')
      .update({
        status: 'converted',
        converted_to_lead_id: lead.id,
      })
      .eq('id', buyerRequestId);

    if (updateError) {
      console.error('Warning: Failed to update buyer request status:', updateError);
      // Don't throw - the conversion was successful even if this update failed
    }

    return {
      accountId,
      contactId,
      leadId: lead.id,
      opportunityId: opportunity.id,
      taskId: task.id,
    };
  } catch (error: any) {
    console.error('Error in convertBuyerRequestToLead:', error);
    throw new Error(error?.message || 'Failed to convert buyer request to lead');
  }
}

/**
 * Create a deal from a lead
 */
export async function createDealFromLead(leadId: string, currentUserId: string) {
  // Fetch lead details
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*, accounts(*), contacts(*), units(*), opportunities(*)')
    .eq('id', leadId)
    .single();

  if (leadError) throw leadError;

  // Create deal
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert({
      sales_rep_id: currentUserId,
      account_id: lead.account_id,
      contact_id: lead.contact_id,
      opportunity_id: lead.opportunities?.[0]?.id,
      status: 'draft',
      currency: 'USD',
      subtotal: 0,
      discounts_total: 0,
      fees_total: 0,
      tax_total: 0,
      total_due: 0,
      commission_base: 0,
      notes: lead.notes,
    })
    .select()
    .single();

  if (dealError) throw dealError;

  // If lead has a unit, add it to the deal
  if (lead.unit_id && lead.units) {
    const unit = lead.units;
    await supabase.from('deal_units').insert({
      deal_id: deal.id,
      unit_id: unit.id,
      price: unit.price || 0,
      unit_snapshot: {
        title: unit.title,
        vin: unit.vin,
        year: unit.year,
        make: unit.make,
        model: unit.model,
      },
    });
  }

  // Update lead stage to quoted
  await supabase
    .from('leads')
    .update({ stage: 'quoted' })
    .eq('id', leadId);

  return deal;
}

/**
 * Update unit status when deal changes
 */
export async function updateUnitStatusFromDeal(
  dealId: string,
  newStatus: string
) {
  // Get deal units
  const { data: dealUnits } = await supabase
    .from('deal_units')
    .select('unit_id')
    .eq('deal_id', dealId);

  if (!dealUnits || dealUnits.length === 0) return;

  const unitIds = dealUnits.map((du) => du.unit_id).filter(Boolean);

  if (newStatus === 'won' || newStatus === 'delivered') {
    // Mark units as sold
    await supabase
      .from('units')
      .update({ status: 'sold', sold_at: new Date().toISOString() })
      .in('id', unitIds);

    // Update lead to closed_won if linked
    const { data: deal } = await supabase
      .from('deals')
      .select(`
        opportunity_id,
        opportunities!inner(lead_id)
      `)
      .eq('id', dealId)
      .single();

    if (deal?.opportunities && 'lead_id' in deal.opportunities) {
      await supabase
        .from('leads')
        .update({ stage: 'closed_won' })
        .eq('id', deal.opportunities.lead_id);
    }
  } else if (newStatus === 'cancelled') {
    // Check if any other active deals use these units
    const { data: otherDeals } = await supabase
      .from('deal_units')
      .select('unit_id')
      .in('unit_id', unitIds)
      .neq('deal_id', dealId);

    const otherUnitIds = new Set(otherDeals?.map((d) => d.unit_id) || []);
    const unitsToFree = unitIds.filter((id) => !otherUnitIds.has(id));

    if (unitsToFree.length > 0) {
      await supabase
        .from('units')
        .update({ status: 'available', sold_at: null })
        .in('id', unitsToFree);
    }
  }
}
