import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { AnnouncementsCard } from '@/components/dashboard/AnnouncementsCard';
import { CompanyCalendarCard } from '@/components/dashboard/CompanyCalendarCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { BirthdaysCard } from '@/components/dashboard/BirthdaysCard';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold">
            {t('dashboard.welcomeBack', 'Welcome back')}, {user?.name}
          </h2>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle', 'Stay updated with company news and your tasks')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <AnnouncementsCard />
            <QuickActionsCard />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <CompanyCalendarCard />
            <BirthdaysCard />
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
