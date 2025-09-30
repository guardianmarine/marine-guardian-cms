import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-4xl font-bold">404</CardTitle>
          <CardDescription className="text-lg">
            {t('common.pageNotFound', 'Page Not Found')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {t(
              'common.pageNotFoundMessage',
              'The page you are looking for does not exist or has been moved.'
            )}
          </p>
          <div className="flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Button onClick={() => navigate('/backoffice')} className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  {t('common.backToDashboard', 'Back to Dashboard')}
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  {t('common.backToHome', 'Back to Home')}
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate('/')} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                {t('common.backToHome', 'Back to Home')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
