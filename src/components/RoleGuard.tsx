import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!user || !allowedRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-lg font-semibold mb-2">
            {t('common.notAuthorized', 'Not Authorized')}
          </AlertTitle>
          <AlertDescription className="space-y-4">
            <p>
              {t(
                'common.notAuthorizedMessage',
                'You do not have permission to access this resource. Contact your administrator.'
              )}
            </p>
            <Button onClick={() => navigate('/backoffice')} variant="outline" className="w-full">
              {t('common.backToDashboard', 'Back to Dashboard')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
