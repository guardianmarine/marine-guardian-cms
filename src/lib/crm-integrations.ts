import { LeadSource, LeadStatus, OpportunityStage, OpportunityReasonLost, ActivityKind } from '@/types';

/**
 * CRM Integration Helpers
 * 
 * Phase 1: Basic deeplinks for communication
 * Future phases: Email tracking, calendar sync, SMS integration
 */

// ============================================================================
// COMMUNICATION DEEPLINKS
// ============================================================================

/**
 * Generate mailto link for email
 */
export const getEmailLink = (email: string, subject?: string, body?: string): string => {
  const params = new URLSearchParams();
  if (subject) params.append('subject', subject);
  if (body) params.append('body', body);
  
  const queryString = params.toString();
  return `mailto:${email}${queryString ? '?' + queryString : ''}`;
};

/**
 * Generate tel link for phone calls
 */
export const getPhoneLink = (phone: string): string => {
  // Remove all non-numeric characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  return `tel:${cleanPhone}`;
};

/**
 * Generate WhatsApp deeplink
 * Works on both mobile and desktop (web.whatsapp.com)
 */
export const getWhatsAppLink = (phone: string, message?: string): string => {
  // Remove all non-numeric characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // WhatsApp uses international format without + or 00
  const whatsappNumber = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;
  
  const encodedMessage = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${whatsappNumber}${encodedMessage ? '?text=' + encodedMessage : ''}`;
};

/**
 * Generate SMS deeplink (for future use)
 */
export const getSMSLink = (phone: string, body?: string): string => {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  return `sms:${cleanPhone}${body ? '?body=' + encodeURIComponent(body) : ''}`;
};

// ============================================================================
// ENUM TRANSLATIONS
// ============================================================================

/**
 * Get translated label for Lead Source
 * Canonical values stored in DB, translations shown in UI
 */
export const getLeadSourceLabel = (source: LeadSource, t: (key: string) => string): string => {
  const sourceKey = source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, '');
  return t(`crm.source${sourceKey}`);
};

/**
 * Get translated label for Lead Status
 */
export const getLeadStatusLabel = (status: LeadStatus, t: (key: string) => string): string => {
  const statusKey = status.charAt(0).toUpperCase() + status.slice(1);
  return t(`crm.status${statusKey}`);
};

/**
 * Get translated label for Opportunity Stage
 */
export const getOpportunityStageLabel = (stage: OpportunityStage, t: (key: string) => string): string => {
  const stageKey = stage.charAt(0).toUpperCase() + stage.slice(1);
  return t(`crm.stage${stageKey}`);
};

/**
 * Get translated label for Opportunity Reason Lost
 */
export const getReasonLostLabel = (reason: OpportunityReasonLost, t: (key: string) => string): string => {
  const reasonKey = reason.charAt(0).toUpperCase() + reason.slice(1);
  return t(`crm.reasonLost${reasonKey}`);
};

/**
 * Get translated label for Activity Kind
 */
export const getActivityKindLabel = (kind: ActivityKind, t: (key: string) => string): string => {
  const kindKey = kind.charAt(0).toUpperCase() + kind.slice(1);
  return t(`crm.activity${kindKey}`);
};

// ============================================================================
// FUTURE EXTENSION POINTS (Not implemented in Phase 1)
// ============================================================================

/**
 * Email Tracking Extension Point
 * 
 * Future implementation will:
 * - Track when emails are opened
 * - Track link clicks
 * - Log email events to activity timeline
 * - Integrate with email service providers (SendGrid, Mailgun, etc.)
 * 
 * Example usage:
 * const tracked = await trackEmail({
 *   to: contact.email,
 *   subject: 'Follow up',
 *   body: 'Thanks for your interest...',
 *   leadId: lead.id
 * });
 */
export interface EmailTrackingConfig {
  to: string;
  subject: string;
  body: string;
  leadId?: string;
  opportunityId?: string;
  accountId?: string;
}

export const trackEmail = async (config: EmailTrackingConfig): Promise<void> => {
  // Phase 2: Implement email tracking
  console.log('[Future] Email tracking for:', config);
  throw new Error('Email tracking not implemented in Phase 1');
};

/**
 * Calendar Integration Extension Point
 * 
 * Future implementation will:
 * - Sync meetings and tasks with Google Calendar/Outlook
 * - Auto-create calendar events from activities
 * - Send meeting invites to contacts
 * - Update CRM when calendar events change
 * 
 * Example usage:
 * const event = await createCalendarEvent({
 *   title: 'Unit viewing with customer',
 *   start: new Date('2025-10-15T10:00:00'),
 *   duration: 60,
 *   attendees: [contact.email],
 *   opportunityId: opp.id
 * });
 */
export interface CalendarEventConfig {
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  duration?: number; // minutes
  attendees?: string[];
  location?: string;
  leadId?: string;
  opportunityId?: string;
  accountId?: string;
}

export const createCalendarEvent = async (config: CalendarEventConfig): Promise<void> => {
  // Phase 2: Implement calendar sync
  console.log('[Future] Calendar event creation for:', config);
  throw new Error('Calendar integration not implemented in Phase 1');
};

/**
 * SMS Integration Extension Point
 * 
 * Future implementation will:
 * - Send SMS via Twilio or similar service
 * - Track SMS delivery and responses
 * - Log SMS conversations to activity timeline
 * 
 * Example usage:
 * const sms = await sendSMS({
 *   to: contact.phone,
 *   message: 'Your unit is ready for viewing',
 *   leadId: lead.id
 * });
 */
export interface SMSConfig {
  to: string;
  message: string;
  leadId?: string;
  opportunityId?: string;
  accountId?: string;
}

export const sendSMS = async (config: SMSConfig): Promise<void> => {
  // Phase 2: Implement SMS integration
  console.log('[Future] SMS sending for:', config);
  throw new Error('SMS integration not implemented in Phase 1');
};

/**
 * Call Tracking Extension Point
 * 
 * Future implementation will:
 * - Integrate with VoIP systems (Twilio Voice, RingCentral, etc.)
 * - Track call duration and recordings
 * - Auto-log calls to activity timeline
 * - Click-to-call from CRM
 * 
 * Example usage:
 * const call = await initiateCall({
 *   to: contact.phone,
 *   from: '+1234567890',
 *   leadId: lead.id
 * });
 */
export interface CallConfig {
  to: string;
  from: string;
  leadId?: string;
  opportunityId?: string;
  accountId?: string;
}

export const initiateCall = async (config: CallConfig): Promise<void> => {
  // Phase 2: Implement call tracking
  console.log('[Future] Call initiation for:', config);
  throw new Error('Call tracking not implemented in Phase 1');
};
