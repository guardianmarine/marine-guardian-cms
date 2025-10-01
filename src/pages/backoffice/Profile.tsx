import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail, Shield, Calendar, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'es' ? 'es' : 'en';
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, role, birthday')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUserProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        // Fallback to user from auth context
        setUserProfile({
          name: user.name,
          email: user.email,
          role: user.role,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  const handleResetPassword = async () => {
    if (!userProfile?.email) return;
    
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userProfile.email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });

      if (error) throw error;

      toast.success(
        locale === 'es'
          ? 'Email de restablecimiento enviado. Revisa tu bandeja de entrada.'
          : 'Password reset email sent. Check your inbox.'
      );
    } catch (err: any) {
      console.error('Reset password error:', err);
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <BackofficeLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            {locale === 'es' ? 'Mi Perfil' : 'My Profile'}
          </h1>
          {user?.role === 'admin' && (
            <Button
              variant="outline"
              onClick={() => navigate('/admin/settings/users')}
            >
              <Settings className="mr-2 h-4 w-4" />
              {locale === 'es' ? 'Usuarios y Roles' : 'Users & Roles'}
            </Button>
          )}
        </div>

        <Card className="rounded-2xl shadow-sm border-slate-200/70">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {locale === 'es' ? 'Información Personal' : 'Personal Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </>
            ) : (
              <>
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="h-12 w-12 rounded-full bg-brand flex items-center justify-center text-white text-lg font-semibold shrink-0">
                    {userProfile?.name
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-slate-900 truncate">
                      {userProfile?.name || locale === 'es' ? 'Usuario' : 'User'}
                    </div>
                    <div className="text-sm text-slate-600 truncate">
                      {userProfile?.email || user?.email}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                    <Mail className="h-5 w-5 text-slate-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-500 uppercase tracking-wide">
                        {locale === 'es' ? 'Correo' : 'Email'}
                      </div>
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {userProfile?.email || user?.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                    <Shield className="h-5 w-5 text-slate-500 shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 uppercase tracking-wide">
                        {locale === 'es' ? 'Rol' : 'Role'}
                      </div>
                      <div className="text-sm font-medium text-slate-900 capitalize">
                        {userProfile?.role || user?.role || 'viewer'}
                      </div>
                    </div>
                  </div>

                  {userProfile?.birthday && (
                    <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                      <Calendar className="h-5 w-5 text-slate-500 shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs text-slate-500 uppercase tracking-wide">
                          {locale === 'es' ? 'Cumpleaños' : 'Birthday'}
                        </div>
                        <div className="text-sm font-medium text-slate-900">
                          {new Date(userProfile.birthday).toLocaleDateString(
                            locale === 'es' ? 'es-ES' : 'en-US',
                            { year: 'numeric', month: 'long', day: 'numeric' }
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button
                    onClick={handleResetPassword}
                    disabled={sendingReset}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {sendingReset
                      ? locale === 'es'
                        ? 'Enviando...'
                        : 'Sending...'
                      : locale === 'es'
                      ? 'Restablecer Contraseña'
                      : 'Reset Password'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
