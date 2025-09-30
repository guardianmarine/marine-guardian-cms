import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Calendar, Loader2 } from 'lucide-react';
import { format, addDays, isBefore, isAfter } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface Deal {
  id: string;
  account_id: string;
  delivered_at: string;
  status: string;
}

export function UpcomingDeliveriesCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasDeliveredAtColumn, setHasDeliveredAtColumn] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString();
        const { data, error } = await supabase
          .from('deals')
          .select('id,account_id,delivered_at,status')
          .gte('delivered_at', new Date().toISOString())
          .lte('delivered_at', twoWeeks)
          .in('status', ['issued', 'partially_paid', 'paid']);

        if (error) {
          // Check if error is due to missing column
          if (error.message.includes('delivered_at')) {
            setHasDeliveredAtColumn(false);
          }
          throw error;
        }
        setDeals(data || []);
      } catch (error) {
        console.error('Error fetching upcoming deliveries:', error);
        setDeals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

  // Don't render if column doesn't exist or no data
  if (!hasDeliveredAtColumn || (!loading && deals.length === 0)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          {t('dashboard.upcomingDeliveries', 'Upcoming Deliveries')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          deals.map((deal) => (
            <div
              key={deal.id}
              onClick={() => navigate(`/backoffice/deals/${deal.id}`)}
              className="p-3 rounded-lg border bg-card hover:bg-accent transition-all duration-200 cursor-pointer hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">
                    {t('deals.dealId', 'Deal')} #{deal.id.slice(0, 8)}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t('common.status', 'Status')}: {deal.status}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(deal.delivered_at), 'MMM d')}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

