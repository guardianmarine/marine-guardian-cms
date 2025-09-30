import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cake, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function BirthdaysCard() {
  const { t } = useTranslation();

  // Mock birthdays - in a real app, fetch from user profiles
  const birthdays: Array<{ name: string; date: string }> = [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5" />
          {t('dashboard.birthdaysThisMonth', 'Birthdays This Month')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {birthdays.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {t(
                'dashboard.noBirthdaysSetup',
                'No birthdays available. Add birthday information to user profiles to see celebrations here.'
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {birthdays.map((birthday, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-3"
              >
                <Cake className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">{birthday.name}</p>
                  <p className="text-xs text-muted-foreground">{birthday.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
