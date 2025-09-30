import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InventoryService } from '@/services/inventoryService';
import { mockUnits } from '@/services/mockData';

export default function InventoryAdmin() {
  const units = mockUnits;

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">
            Manage units, photos, and publishing workflow
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Units</CardTitle>
            <CardDescription>
              Full inventory CRUD coming in next phase. Current units are displayed below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {units.map((unit) => (
                <div key={unit.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">
                      {unit.year} {unit.make} {unit.model}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {unit.category} · {unit.type} · {unit.photos.length} photos
                    </p>
                  </div>
                  <Badge variant={unit.status === 'published' ? 'default' : 'secondary'}>
                    {unit.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
