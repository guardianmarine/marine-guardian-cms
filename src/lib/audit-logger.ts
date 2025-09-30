import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'tax_rule_created'
  | 'tax_rule_updated'
  | 'tax_rule_deleted'
  | 'deal_issued'
  | 'deal_closed'
  | 'payment_recorded'
  | 'payment_edited'
  | 'payment_deleted'
  | 'commission_status_changed'
  | 'invoice_generated'
  | 'invoice_regenerated'
  | 'deal_delivered';

export interface AuditLogEntry {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  userEmail: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Log an audit event to Supabase
 */
export const logAuditEvent = async (entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> => {
  try {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        action: auditEntry.action,
        entity_type: auditEntry.entityType,
        entity_id: auditEntry.entityId,
        user_id: auditEntry.userId,
        user_email: auditEntry.userEmail,
        changes: auditEntry.changes,
        metadata: auditEntry.metadata,
        created_at: auditEntry.timestamp,
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

/**
 * Log tax rule change
 */
export const logTaxRuleChange = async (
  action: 'tax_rule_created' | 'tax_rule_updated' | 'tax_rule_deleted',
  ruleId: string,
  userId: string,
  userEmail: string,
  changes?: Record<string, any>
): Promise<void> => {
  await logAuditEvent({
    action,
    entityType: 'tax_rule',
    entityId: ruleId,
    userId,
    userEmail,
    changes,
  });
};

/**
 * Log deal status change
 */
export const logDealStatusChange = async (
  action: 'deal_issued' | 'deal_closed' | 'deal_delivered',
  dealId: string,
  userId: string,
  userEmail: string,
  metadata?: Record<string, any>
): Promise<void> => {
  await logAuditEvent({
    action,
    entityType: 'deal',
    entityId: dealId,
    userId,
    userEmail,
    metadata,
  });
};

/**
 * Log payment change
 */
export const logPaymentChange = async (
  action: 'payment_recorded' | 'payment_edited' | 'payment_deleted',
  paymentId: string,
  dealId: string,
  userId: string,
  userEmail: string,
  changes?: Record<string, any>
): Promise<void> => {
  await logAuditEvent({
    action,
    entityType: 'payment',
    entityId: paymentId,
    userId,
    userEmail,
    changes,
    metadata: { dealId },
  });
};

/**
 * Log commission status change
 */
export const logCommissionStatusChange = async (
  commissionId: string,
  userId: string,
  userEmail: string,
  oldStatus: string,
  newStatus: string
): Promise<void> => {
  await logAuditEvent({
    action: 'commission_status_changed',
    entityType: 'commission',
    entityId: commissionId,
    userId,
    userEmail,
    changes: {
      oldStatus,
      newStatus,
    },
  });
};

/**
 * Log invoice generation
 */
export const logInvoiceGeneration = async (
  action: 'invoice_generated' | 'invoice_regenerated',
  invoiceId: string,
  dealId: string,
  userId: string,
  userEmail: string,
  metadata?: Record<string, any>
): Promise<void> => {
  await logAuditEvent({
    action,
    entityType: 'invoice',
    entityId: invoiceId,
    userId,
    userEmail,
    metadata: { dealId, ...metadata },
  });
};
