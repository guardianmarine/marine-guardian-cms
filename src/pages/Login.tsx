import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('auth.loginSuccess', 'Successfully logged in'),
      });
      navigate('/admin');
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('auth.loginError', 'Invalid email or password'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast({
        title: t('common.error', 'Error'),
        description: t('auth.emailRequired', 'Please enter your email'),
        variant: 'destructive',
      });
      return;
    }

    setMagicLinkLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('auth.magicLinkSent', 'Check your email for the login link'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('auth.magicLinkError', 'Failed to send magic link'),
        variant: 'destructive',
      });
    } finally {
      setMagicLinkLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="Guardian Marine" className="h-16 mx-auto mb-4" />
          <CardTitle className="text-2xl">
            {t('dashboard.companyDashboard', 'Company Dashboard')}
          </CardTitle>
          <CardDescription>
            {t('auth.loginDescription', 'Enter your credentials to access the dashboard')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder', 'your@email.com')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password', 'Password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.loggingIn', 'Logging in...')}
                </>
              ) : (
                t('auth.login', 'Login')
              )}
            </Button>
          </form>

          <div className="mt-4 space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleMagicLink}
              disabled={magicLinkLoading}
            >
              {magicLinkLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.sendingLink', 'Sending link...')}
                </>
              ) : (
                t('auth.useEmailLink', 'Use email link')
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t('auth.magicLinkHelper', 'You\'ll be asked to set a password on first sign-in.')}
            </p>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/forgot')}
                className="text-sm"
              >
                {t('auth.forgotPassword', 'Forgot password?')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
