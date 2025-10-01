import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: `${window.location.origin}/auth/reset`,
        }
      );

      if (error) throw error;

      // Always show success message (security best practice)
      toast({
        title: t('common.success', 'Success'),
        description: t(
          'auth.resetLinkSent',
          'If that email exists, we sent a link to set a new password.'
        ),
      });

      // Clear email field
      setEmail('');
    } catch (error: any) {
      // Still show success message even on error (security)
      toast({
        title: t('common.success', 'Success'),
        description: t(
          'auth.resetLinkSent',
          'If that email exists, we sent a link to set a new password.'
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="Guardian Marine" className="h-16 mx-auto mb-4" />
          <CardTitle className="text-2xl">
            {t('auth.forgotPasswordTitle', 'Reset Password')}
          </CardTitle>
          <CardDescription>
            {t(
              'auth.forgotPasswordDescription',
              'Enter your email and we\'ll send you a link to reset your password'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.sendingLink', 'Sending link...')}
                </>
              ) : (
                t('auth.sendResetLink', 'Send reset link')
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => navigate('/login')}
              className="text-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('auth.backToLogin', 'Back to login')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
