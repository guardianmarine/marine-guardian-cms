import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDealsStore } from '@/services/dealsStore';
import { useInventoryStore } from '@/services/inventoryStore';
import { DealUnit } from '@/types';
import { Edit2, Check, X } from 'lucide-react';

interface DealUnitsGridProps {
  dealId: string;
  onPriceChange: () => void;
}

export function DealUnitsGrid({ dealId, onPriceChange }: DealUnitsGridProps) {
  const { getDealUnits, updateDealUnit } = useDealsStore();
  const { units } = useInventoryStore();
  
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const dealUnits = getDealUnits(dealId);

  const handleStartEdit = (dealUnit: DealUnit) => {
    setEditingUnitId(dealUnit.unit_id);
    setEditPrice(dealUnit.agreed_unit_price.toString());
  };

  const handleSaveEdit = (unitId: string) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) return;

    updateDealUnit(dealId, unitId, { agreed_unit_price: price });
    setEditingUnitId(null);
    onPriceChange();
  };

  const handleCancelEdit = () => {
    setEditingUnitId(null);
    setEditPrice('');
  };

  if (dealUnits.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No units in this deal
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {dealUnits.map((dealUnit) => {
        const unit = units.find((u) => u.id === dealUnit.unit_id);
        if (!unit) return null;

        const isEditing = editingUnitId === unit.id;
        const mainPhoto = unit.photos.find((p) => p.is_main) || unit.photos[0];
        const vinLast6 = unit.vin_or_serial.slice(-6);

        return (
          <Card key={unit.id}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Unit Photo */}
                <div className="w-32 h-24 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                  {mainPhoto ? (
                    <img
                      src={mainPhoto.url}
                      alt={`${unit.year} ${unit.make} ${unit.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No Image
                    </div>
                  )}
                </div>

                {/* Unit Details */}
                <div className="flex-1 space-y-2">
                  <div>
                    <h4 className="font-semibold">
                      {unit.year} {unit.make} {unit.model}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      VIN: ...{vinLast6}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {unit.type} • {unit.category}
                    </p>
                  </div>

                  {/* Agreed Price */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Agreed Price:</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="h-8 w-32"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(unit.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">
                          ${dealUnit.agreed_unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(dealUnit)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Display Price Reference */}
                  <p className="text-xs text-muted-foreground">
                    Display Price: ${unit.display_price.toLocaleString('en-US')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
