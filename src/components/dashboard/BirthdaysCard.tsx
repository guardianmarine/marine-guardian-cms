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
  birth_date: string;
}

export function BirthdaysCard() {
  const { t } = useTranslation();
  const [birthdays, setBirthdays] = useState<Array<{ name: string; date: string; day: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [hasBirthdayColumn, setHasBirthdayColumn] = useState(false);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        // Try fetching with birth_date column
        let { data, error } = await supabase
          .from('users')
          .select('id,name,birth_date')
          .not('birth_date', 'is', null);

        if (error && error.message.includes('birth_date')) {
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
            const birthDate = user.birth_date;
            if (!birthDate) return false;
            return getMonth(new Date(birthDate)) === currentMonth;
          })
          .map((user: any) => {
            const birthDate = new Date(user.birth_date);
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
    <Card className="rounded-2xl border-slate-200/70 shadow-sm" aria-labelledby="birthdays-title">
      <CardHeader className="pb-3">
        <CardTitle id="birthdays-title" className="flex items-center gap-2 text-lg">
          <Cake className="h-5 w-5 text-primary" />
          {t('dashboard.birthdaysThisMonth', 'Birthdays this month')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !hasBirthdayColumn || birthdays.length === 0 ? (
          <Alert className="border-slate-200 dark:border-slate-700">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm text-slate-600 dark:text-slate-400">
              {t(
                'dashboard.noBirthdaysSetup',
                'Add birthdays in Admin → Users & Roles to display them here.'
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-wrap gap-2">
            {birthdays.slice(0, 6).map((birthday, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <Cake className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                  {birthday.name}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {birthday.date}
                </span>
              </div>
            ))}
            {birthdays.length > 6 && (
              <div className="inline-flex items-center px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  +{birthdays.length - 6}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


