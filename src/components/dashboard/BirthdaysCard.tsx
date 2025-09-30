import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cake, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, getMonth, getDate } from 'date-fns';

interface UserWithBirthday {
  id: string;
  name: string;
  birthday?: string;
  birth_date?: string;
}

export function BirthdaysCard() {
  const { t } = useTranslation();

  // Mock users - in a real app, fetch from users table
  const users: UserWithBirthday[] = [];

  // Try to get birthdays from users (checking both birthday and birth_date fields)
  const currentMonth = getMonth(new Date());
  const birthdaysThisMonth = users
    .filter((user) => {
      const birthDate = user.birthday || user.birth_date;
      if (!birthDate) return false;
      return getMonth(new Date(birthDate)) === currentMonth;
    })
    .map((user) => {
      const birthDate = new Date(user.birthday || user.birth_date!);
      return {
        name: user.name,
        day: getDate(birthDate),
        date: format(birthDate, 'MMM d'),
      };
    })
    .sort((a, b) => a.day - b.day);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5" />
          {t('dashboard.birthdaysThisMonth', 'Birthdays This Month')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {birthdaysThisMonth.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {t(
                'dashboard.noBirthdaysSetup',
                'Add birthdays in Admin → Users & Roles to display them here.'
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {birthdaysThisMonth.map((birthday, index) => (
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

