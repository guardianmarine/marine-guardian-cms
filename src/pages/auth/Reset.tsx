import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function Reset() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Handle both "code" and "hash token" styles
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch {}

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setHasValidSession(true);
        } else {
          setHasValidSession(false);
        }
      } catch (error) {
        console.error('Error verifying session:', error);
        setHasValidSession(false);
      } finally {
        setVerifying(false);
      }
    };

    verifySession();
  }, []);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length < 6) return { strength: 'weak', color: 'text-destructive' };
    if (pwd.length < 10) return { strength: 'medium', color: 'text-yellow-600' };
    return { strength: 'strong', color: 'text-green-600' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: t('common.error', 'Error'),
        description: t('auth.passwordMismatch', 'Passwords do not match'),
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('common.error', 'Error'),
        description: t('auth.passwordTooShort', 'Password must be at least 6 characters'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      // Self-provision / activate staff row
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from('users').upsert(
          {
            email: user.email,
            auth_user_id: user.id,
            name: user.user_metadata?.name || user.email,
            status: 'active',
          },
          { onConflict: 'email' }
        );
      }

      toast({
        title: t('common.success', 'Success'),
        description: t('auth.passwordUpdated', 'Your password has been updated'),
      });

      // Redirect to admin
      window.location.replace('/admin');
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('auth.passwordUpdateError', 'Failed to update password'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                {t('auth.verifyingLink', 'Verifying your link...')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src={logo} alt="Guardian Marine" className="h-16 mx-auto mb-4" />
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              {t('auth.invalidLink', 'Invalid Link')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {t(
                  'auth.invalidLinkDescription',
                  'This link is invalid or has expired. Please request a new password reset link.'
                )}
              </AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/forgot')}
            >
              {t('auth.goToForgot', 'Go to Forgot Password')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pwdStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="Guardian Marine" className="h-16 mx-auto mb-4" />
          <CardTitle className="text-2xl">
            {t('auth.setNewPassword', 'Set your new password')}
          </CardTitle>
          <CardDescription>
            {t('auth.setNewPasswordDescription', 'Create a strong password for your account')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.newPassword', 'New Password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {password && (
                <p className={`text-xs ${pwdStrength.color}`}>
                  {t('auth.passwordStrength', 'Strength')}: {t(`auth.${pwdStrength.strength}`, pwdStrength.strength)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t('auth.confirmPassword', 'Confirm Password')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {t('auth.passwordsMatch', 'Passwords match')}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.updatingPassword', 'Updating password...')}
                </>
              ) : (
                t('auth.updatePassword', 'Update password')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
