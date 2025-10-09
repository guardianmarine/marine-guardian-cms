import { supabase } from '@/lib/supabaseClient';

export type ContactBasic = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  account_id: string;
};

export async function listContactsByAccount(accountId: string) {
  const { data, error, count } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, account_id', { count: 'exact' })
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }

  const result = { data: data ?? [], count: count ?? 0 };

  // Debug log (only in dev)
  if (import.meta.env.DEV) {
    console.debug('Account contacts count/data', result.count, result.data.slice(0, 3));
  }

  return result;
}
