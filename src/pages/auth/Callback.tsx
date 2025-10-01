import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Callback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange code for session
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch {}

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Self-provision staff row
          await supabase.from('users').upsert(
            {
              email: user.email,
              auth_user_id: user.id,
              name: user.user_metadata?.name || user.email,
              status: 'active',
            },
            { onConflict: 'email' }
          );

          // Redirect to admin
          window.location.replace('/admin');
        } else {
          setError(t('auth.callbackError', 'Authentication failed. Please try again.'));
        }
      } catch (error: any) {
        console.error('Callback error:', error);
        setError(error.message || t('auth.callbackError', 'Authentication failed. Please try again.'));
      }
    };

    handleCallback();
  }, [t]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <img src={logo} alt="Guardian Marine" className="h-16 mx-auto" />
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                {t('auth.backToLogin', 'Back to login')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <img src={logo} alt="Guardian Marine" className="h-16 mx-auto" />
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {t('auth.signingIn', 'Signing you in...')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
