import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Calendar } from 'lucide-react';
import { format, addDays, isBefore, isAfter } from 'date-fns';
import { useDealsStore } from '@/services/dealsStore';

export function UpcomingDeliveriesCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deals } = useDealsStore();

  // Get deals with deliveries in the next 14 days
  const now = new Date();
  const fourteenDaysFromNow = addDays(now, 14);

  const upcomingDeliveries = deals.filter((deal) => {
    if (!deal.delivered_at) return false;
    const deliveryDate = new Date(deal.delivered_at);
    return isAfter(deliveryDate, now) && isBefore(deliveryDate, fourteenDaysFromNow);
  });

  // If no delivered_at field or no upcoming deliveries, don't render
  if (upcomingDeliveries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          {t('dashboard.upcomingDeliveries', 'Upcoming Deliveries')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingDeliveries.map((deal) => (
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
                  {deal.account?.name || t('common.unknown', 'Unknown')}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(deal.delivered_at!), 'MMM d')}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
