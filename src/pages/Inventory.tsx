import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UnitCard } from '@/components/inventory/UnitCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryService } from '@/services/inventoryService';
import { Unit, InventoryFilters } from '@/types';
import { Filter } from 'lucide-react';

export default function Inventory() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<InventoryFilters>({});

  useEffect(() => {
    const category = searchParams.get('category') as any;
    const make = searchParams.get('make') || undefined;
    const type = searchParams.get('type') || undefined;
    const year_min = searchParams.get('year_min') ? Number(searchParams.get('year_min')) : undefined;

    setFilters({ category, make, type, year_min });
  }, [searchParams]);

  useEffect(() => {
    const loadUnits = async () => {
      setLoading(true);
      const data = await InventoryService.getPublicUnits(filters);
      setUnits(data);
      setLoading(false);
    };
    loadUnits();
  }, [filters]);

  const makes = InventoryService.getUniqueMakes(filters.category);
  const types = InventoryService.getUniqueTypes(filters.category);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('inventory.title')}</h1>
          <p className="text-muted-foreground">
            {t('inventory.results', { count: units.length })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    {t('common.filter')}
                  </h2>
                  {Object.keys(filters).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchParams({})}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select
                      value={filters.category || undefined}
                      onValueChange={(v) => updateFilter('category', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="truck">{t('search.trucks')}</SelectItem>
                        <SelectItem value="trailer">{t('search.trailers')}</SelectItem>
                        <SelectItem value="equipment">{t('search.equipment')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('search.make')}</label>
                    <Select
                      value={filters.make || undefined}
                      onValueChange={(v) => updateFilter('make', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('search.any')} />
                      </SelectTrigger>
                      <SelectContent>
                        {makes.map((make) => (
                          <SelectItem key={make} value={make}>
                            {make}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('search.type')}</label>
                    <Select
                      value={filters.type || undefined}
                      onValueChange={(v) => updateFilter('type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('search.any')} />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('search.yearRange')}</label>
                    <Select
                      value={filters.year_min?.toString() || undefined}
                      onValueChange={(v) => updateFilter('year_min', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('search.any')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}+
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Units Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-[4/3] w-full" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : units.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {units.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <h3 className="text-xl font-semibold mb-2">{t('inventory.emptyTitle')}</h3>
                  <p className="text-muted-foreground mb-6">{t('inventory.emptyDescription')}</p>
                  <Button onClick={() => setSearchParams({})}>Clear Filters</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
