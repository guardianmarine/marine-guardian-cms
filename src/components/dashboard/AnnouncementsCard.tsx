import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'info' | 'warning' | 'urgent';
  created_at: string;
  expires_at?: string;
}

export function AnnouncementsCard() {
  const { t } = useTranslation();

  // Mock announcements - in a real app, fetch from Supabase
  const announcements: Announcement[] = [
    {
      id: '1',
      title: 'Company Holiday - Christmas',
      message: 'Office will be closed on December 25th for Christmas.',
      priority: 'info',
      created_at: new Date().toISOString(),
      expires_at: new Date('2025-12-25').toISOString(),
    },
  ];

  const getPriorityColor = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-destructive bg-destructive/5';
      case 'warning':
        return 'border-l-4 border-yellow-500 bg-yellow-500/5';
      default:
        return 'border-l-4 border-primary bg-primary/5';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          {t('dashboard.announcements', 'Announcements')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('dashboard.noAnnouncements', 'No announcements at this time.')}
          </p>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`p-3 rounded-lg transition-all duration-200 ${getPriorityColor(announcement.priority)}`}
            >
              <h4 className="font-semibold text-sm mb-1">{announcement.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">{announcement.message}</p>
              {announcement.expires_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {t('dashboard.until', 'Until')}{' '}
                    {format(new Date(announcement.expires_at), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
