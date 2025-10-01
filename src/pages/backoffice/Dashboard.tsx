import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { AnnouncementsCard } from '@/components/dashboard/AnnouncementsCard';
import { CompanyCalendarCard } from '@/components/dashboard/CompanyCalendarCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { BirthdaysCard } from '@/components/dashboard/BirthdaysCard';
import { UpcomingDeliveriesCard } from '@/components/dashboard/UpcomingDeliveriesCard';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            {t('dashboard.companyDashboard', 'Company Dashboard')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('dashboard.welcomeBack', 'Welcome back')}, {user?.name}
          </p>
        </div>

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Content - Announcements & Birthdays */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6">
            <AnnouncementsCard />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BirthdaysCard />
              <UpcomingDeliveriesCard />
            </div>
          </div>

          {/* Right Rail - Calendar & Quick Actions */}
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <CompanyCalendarCard />
            <QuickActionsCard />
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}

