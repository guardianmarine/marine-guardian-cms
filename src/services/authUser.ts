import { supabase } from '@/integrations/supabase/client';

export type StaffUser = {
  id: string;
  email: string | null;
  role: string | null;
  status: 'active' | 'inactive' | 'pending' | string;
  auth_user_id: string | null;
  name: string | null;
};

export async function getActiveUserForSession() {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData?.session?.user?.id;
  const email = sessionData?.session?.user?.email ?? null;
  
  if (!uid) {
    return { session: null, staff: null as StaffUser | null };
  }

  // 1) Search by auth_user_id first
  let { data: staff } = await supabase
    .from('users')
    .select('id,email,name,role,status,auth_user_id')
    .eq('auth_user_id', uid)
    .maybeSingle<StaffUser>();

  // 2) Fallback: search by email (for legacy accounts)
  if (!staff && email) {
    const { data: byEmail } = await supabase
      .from('users')
      .select('id,email,name,role,status,auth_user_id')
      .ilike('email', email)
      .maybeSingle<StaffUser>();

    if (byEmail) {
      // Link auth_user_id if it's empty
      if (!byEmail.auth_user_id) {
        await supabase
          .from('users')
          .update({ auth_user_id: uid })
          .eq('id', byEmail.id);
        byEmail.auth_user_id = uid;
      }
      staff = byEmail;
    }
  }

  return { session: sessionData.session, staff };
}
