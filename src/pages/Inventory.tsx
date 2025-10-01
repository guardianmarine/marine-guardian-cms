import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { UnitCard } from '@/components/inventory/UnitCard';
import { UnitCardXL } from '@/components/inventory/UnitCardXL';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { InventoryService } from '@/services/inventoryService';
import { ContentService } from '@/services/contentService';
import { Unit, InventoryFilters } from '@/types';
import { Filter, SlidersHorizontal, Truck } from 'lucide-react';
import { getUnitTypeLabel } from '@/lib/i18n-helpers';

const ITEMS_PER_PAGE = 12;

type SortOption = 'newest' | 'year' | 'mileage' | 'price';

export default function Inventory() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [units, setUnits] = useState<Unit[]>([]);
  const [displayedUnits, setDisplayedUnits] = useState<Unit[]>([]);
  const [featuredPicks, setFeaturedPicks] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState<InventoryFilters>({});

  useEffect(() => {
    const category = searchParams.get('category') as any;
    const make = searchParams.get('make') || undefined;
    const type = searchParams.get('type') || undefined;
    const year_min = searchParams.get('year_min') ? Number(searchParams.get('year_min')) : undefined;
    const year_max = searchParams.get('year_max') ? Number(searchParams.get('year_max')) : undefined;
    const mileage_min = searchParams.get('mileage_min') ? Number(searchParams.get('mileage_min')) : undefined;
    const mileage_max = searchParams.get('mileage_max') ? Number(searchParams.get('mileage_max')) : undefined;

    setFilters({ category, make, type, year_min, year_max, mileage_min, mileage_max });
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    const loadUnits = async () => {
      setLoading(true);
      const data = await InventoryService.getPublicUnits(filters, i18n.language as any);
      
      // Sort units
      const sorted = sortUnits(data, sortBy);
      setUnits(sorted);
      setDisplayedUnits(sorted.slice(0, ITEMS_PER_PAGE));
      setLoading(false);
    };
    loadUnits();
  }, [filters, sortBy, i18n.language]);

  useEffect(() => {
    setDisplayedUnits(units.slice(0, page * ITEMS_PER_PAGE));
  }, [page, units]);

  useEffect(() => {
    // Load featured picks for empty state
    const loadFeatured = async () => {
      const content = await ContentService.getHomeContent(i18n.language as any);
      const picks = content.featuredPicks.map(fp => fp.unit).filter(Boolean) as Unit[];
      setFeaturedPicks(picks);
    };
    loadFeatured();
  }, [i18n.language]);

  const sortUnits = (unitsList: Unit[], sort: SortOption): Unit[] => {
    const sorted = [...unitsList];
    switch (sort) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.listed_at || b.created_at).getTime() - new Date(a.listed_at || a.created_at).getTime()
        );
      case 'year':
        return sorted.sort((a, b) => b.year - a.year);
      case 'mileage':
        return sorted.sort((a, b) => (a.mileage || 0) - (b.mileage || 0));
      case 'price':
        return sorted.sort((a, b) => a.display_price - b.display_price);
      default:
        return sorted;
    }
  };

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

  const clearFilters = () => {
    setSearchParams({});
    setSortBy('newest');
  };

  const hasMoreUnits = displayedUnits.length < units.length;
  const hasActiveFilters = Object.keys(filters).some(k => filters[k as keyof InventoryFilters]);

  const renderFilters = () => (
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
                {filters.category ? getUnitTypeLabel(type, filters.category, t) : type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">{t('search.yearRange')}</label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.year_min || ''}
            onChange={(e) => updateFilter('year_min', e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.year_max || ''}
            onChange={(e) => updateFilter('year_max', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Mileage Range</label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.mileage_min || ''}
            onChange={(e) => updateFilter('mileage_min', e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.mileage_max || ''}
            onChange={(e) => updateFilter('mileage_max', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Inventory - Guardian Marine & Truck</title>
        <meta 
          name="description" 
          content="Browse our inventory of quality trucks, trailers, and equipment at competitive prices." 
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-subtle">
        <div className="container px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">{t('inventory.title')}</h1>
            <p className="text-muted-foreground">
              {units.length > 0 ? t('inventory.results', { count: units.length }) : 'Quality trucks, trailers, and equipment'}
            </p>
          </div>

          {/* Sort & Mobile Filter */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium hidden sm:block">Sort by:</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="mileage">Mileage</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center justify-between">
                    <span>Filters</span>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear All
                      </Button>
                    )}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  {renderFilters()}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Desktop Filters Sidebar */}
            <aside className="hidden lg:block lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      {t('common.filter')}
                    </h2>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear
                      </Button>
                    )}
                  </div>
                  {renderFilters()}
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
              ) : displayedUnits.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                    {displayedUnits.map((unit) => (
                      <UnitCard key={unit.id} unit={unit} />
                    ))}
                  </div>
                  
                  {/* Load More */}
                  {hasMoreUnits && (
                    <div className="flex justify-center">
                      <Button
                        onClick={() => setPage(p => p + 1)}
                        size="lg"
                        variant="outline"
                      >
                        Load More Units
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-8">
                  {/* Empty State */}
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-2xl font-semibold mb-2">
                        {i18n.language === 'es' ? 'No se encontraron unidades' : 'No Units Found'}
                      </h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        {i18n.language === 'es' 
                          ? 'No hay unidades disponibles en este momento que coincidan con sus criterios. Intente ajustar sus filtros o solicite una unidad específica.'
                          : 'No units available at the moment matching your criteria. Try adjusting your filters or request a specific unit.'}
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        {hasActiveFilters && (
                          <Button onClick={clearFilters} variant="outline">
                            {i18n.language === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
                          </Button>
                        )}
                        <Button asChild>
                          <a href="/request-unit">
                            {i18n.language === 'es' ? 'Solicitar una Unidad' : 'Request a Unit'}
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Featured Picks Fallback */}
                  {featuredPicks.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold mb-6">You Might Like These</h2>
                      {featuredPicks.length < 4 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {featuredPicks.map((unit) => (
                            <UnitCardXL key={unit.id} unit={unit} />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {featuredPicks.map((unit) => (
                            <UnitCard key={unit.id} unit={unit} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
