import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cake, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, getMonth, getDate } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface UserWithBirthday {
  id: string;
  name: string;
  birthday?: string;
  birth_date?: string;
}

export function BirthdaysCard() {
  const { t } = useTranslation();
  const [birthdays, setBirthdays] = useState<Array<{ name: string; date: string; day: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [hasBirthdayColumn, setHasBirthdayColumn] = useState(false);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        // Try fetching with birthday column first
        let { data, error } = await supabase
          .from('users')
          .select('id,name,birthday')
          .not('birthday', 'is', null);

        // If birthday column doesn't exist, try birth_date
        if (error && error.message.includes('birthday')) {
          const result = await supabase
            .from('users')
            .select('id,name,birth_date')
            .not('birth_date', 'is', null);
          
          data = result.data as any;
          error = result.error;
        }

        if (error && (error.message.includes('birthday') || error.message.includes('birth_date'))) {
          // Column doesn't exist, show setup message
          setHasBirthdayColumn(false);
          setLoading(false);
          return;
        }

        if (error) throw error;

        setHasBirthdayColumn(true);

        // Filter and format birthdays for current month
        const currentMonth = getMonth(new Date());
        const birthdaysThisMonth = (data || [])
          .filter((user: any) => {
            const birthDate = user.birthday || user.birth_date;
            if (!birthDate) return false;
            return getMonth(new Date(birthDate)) === currentMonth;
          })
          .map((user: any) => {
            const birthDate = new Date(user.birthday || user.birth_date);
            return {
              name: user.name,
              day: getDate(birthDate),
              date: format(birthDate, 'MMM d'),
            };
          })
          .sort((a, b) => a.day - b.day);

        setBirthdays(birthdaysThisMonth);
      } catch (error) {
        console.error('Error fetching birthdays:', error);
        setBirthdays([]);
        setHasBirthdayColumn(false);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5" />
          {t('dashboard.birthdaysThisMonth', 'Birthdays this month')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasBirthdayColumn || birthdays.length === 0 ? (
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
            {birthdays.map((birthday, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-3"
              >
                <Cake className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">
                    {birthday.date} — {birthday.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


