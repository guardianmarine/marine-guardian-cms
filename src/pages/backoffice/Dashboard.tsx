import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { InventoryService } from '@/services/inventoryService';
import { usePurchasingStore } from '@/services/purchasingStore';
import { Package, Truck, Container, Wrench, Users } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const counts = InventoryService.getCategoryCounts();
  const { buyerRequests } = usePurchasingStore();
  const newBuyerRequests = buyerRequests.filter((r) => r.status === 'new').length;

  const stats = [
    {
      title: 'Total Units',
      value: counts.truck + counts.trailer + counts.equipment,
      icon: Package,
      color: 'text-primary',
    },
    {
      title: 'Trucks',
      value: counts.truck,
      icon: Truck,
      color: 'text-blue-600',
    },
    {
      title: 'Trailers',
      value: counts.trailer,
      icon: Container,
      color: 'text-green-600',
    },
    {
      title: 'Equipment',
      value: counts.equipment,
      icon: Wrench,
      color: 'text-orange-600',
    },
    {
      title: 'New Buyer Requests',
      value: newBuyerRequests,
      icon: Users,
      color: 'text-purple-600',
    },
  ];

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Welcome back, {user?.name}</h2>
          <p className="text-muted-foreground">
            Here is an overview of your inventory and content
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Use the sidebar to navigate to different sections:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>Content:</strong> Edit hero, carousels, featured picks for the home page
              </li>
              <li>
                <strong>Media Library:</strong> Upload and manage images
              </li>
              <li>
                <strong>Inventory:</strong> Manage units, photos, and publishing workflow
              </li>
              <li>
                <strong>Buyer Requests:</strong> Review and manage incoming unit requests from customers
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
