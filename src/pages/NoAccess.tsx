import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';
import { AlertCircle, LogOut, ArrowLeft } from 'lucide-react';

export default function NoAccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const email = searchParams.get('email') || '';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="Guardian Marine" className="h-16 mx-auto mb-4" />
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            {t('auth.noAccess', 'No Access')}
          </CardTitle>
          <CardDescription>
            {t('auth.noAccessDescription', 'Your account is not activated')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              {t(
                'auth.noAccessMessage',
                'Your account is not activated. Ask an administrator to enable your access.'
              )}
            </AlertDescription>
          </Alert>

          {email && (
            <div className="text-sm text-muted-foreground text-center">
              <p className="font-medium">{email}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center pt-2">
            {t(
              'auth.adminCanActivate',
              'Admin can activate this user in Admin → Users & Roles'
            )}
          </div>

          <div className="space-y-2 pt-4">
            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('auth.goToLogin', 'Go to login')}
            </Button>
            <Button
              onClick={handleSignOut}
              variant="secondary"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('auth.signOut', 'Sign out')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
