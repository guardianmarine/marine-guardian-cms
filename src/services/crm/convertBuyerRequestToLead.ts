import { supabase } from '@/integrations/supabase/client';

interface ConvertOptions {
  onNoSession?: () => void;
}

interface ConvertResult {
  data?: {
    success: boolean;
    lead_id: string;
    account_id: string;
    contact_id: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Converts a buyer request to a lead.
 * Validates and refreshes session before calling the RPC.
 */
export async function convertBuyerRequestToLead(
  requestId: string,
  options?: ConvertOptions
): Promise<ConvertResult> {
  // Try to get current session
  const { data: sessionData } = await supabase.auth.getSession();
  
  // If no session, try to refresh
  if (!sessionData?.session) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    
    if (!refreshData?.session) {
      if (options?.onNoSession) {
        options.onNoSession();
      }
      return {
        error: {
          message: 'Session expired. Please log in to continue.',
          code: '28000'
        }
      };
    }
  }

  // Call the RPC with correct parameter name
  const { data, error } = await supabase.rpc('convert_buyer_request_to_lead', {
    p_request_id: requestId,
  });

  if (error) {
    return {
      error: {
        message: error.message,
        code: error.code
      }
    };
  }

  return { data: data as ConvertResult['data'] };
}
