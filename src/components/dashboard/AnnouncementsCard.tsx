import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Calendar as CalendarIcon, ExternalLink, Loader2 } from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { AnnouncementAudience } from '@/services/announcementsStore';

interface Announcement {
  id: string;
  title: string;
  body: string;
  start_at?: string;
  end_at?: string;
  audience: AnnouncementAudience[];
  status: string;
  media_url?: string;
}

export function AnnouncementsCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const nowIso = new Date().toISOString();
        const { data, error } = await supabase
          .from('announcements')
          .select('id,title,body,start_at,end_at,audience,status,media_url')
          .eq('status', 'published')
          .lte('start_at', nowIso)
          .gte('end_at', nowIso)
          .order('start_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setAnnouncements(data || []);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        // Gracefully handle error - show empty state
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Filter announcements visible to the current user
  const visibleAnnouncements = announcements.filter((announcement) => {
    if (!Array.isArray(announcement.audience)) return false;
    if (announcement.audience.includes('all')) return true;
    if (user?.role && announcement.audience.includes(user.role as any)) return true;
    return false;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-destructive bg-destructive/5';
      case 'warning':
        return 'border-l-4 border-yellow-500 bg-yellow-500/5';
      default:
        return 'border-l-4 border-primary bg-primary/5';
    }
  };

  const getAudienceBadge = (audience: string[]) => {
    if (!Array.isArray(audience)) return '';
    if (audience.includes('all')) return t('dashboard.audienceAll', 'All');
    return audience.map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(', ');
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          {t('dashboard.announcements', 'Announcements')}
        </CardTitle>
        <Link to="/backoffice/settings/announcements">
          <Button variant="ghost" size="sm" className="gap-2">
            {t('dashboard.seeAll', 'See all')}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleAnnouncements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('dashboard.noAnnouncements', 'No announcements at this time.')}
          </p>
        ) : (
          visibleAnnouncements.slice(0, 3).map((announcement) => (
            <div
              key={announcement.id}
              className="p-4 rounded-lg transition-all duration-200 border-l-4 border-primary bg-primary/5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="font-semibold text-sm">{announcement.title}</h4>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {getAudienceBadge(announcement.audience)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{announcement.body}</p>
              {announcement.media_url && (
                <img
                  src={announcement.media_url}
                  alt={announcement.title}
                  className="w-full h-32 object-cover rounded-md mb-3"
                />
              )}
              {(announcement.start_at || announcement.end_at) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3" />
                  <span>
                    {announcement.start_at && format(new Date(announcement.start_at), 'MMM d')}
                    {announcement.start_at && announcement.end_at && ' - '}
                    {announcement.end_at && format(new Date(announcement.end_at), 'MMM d, yyyy')}
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


