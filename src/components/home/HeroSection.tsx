import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnitCategory, TruckType, TrailerType } from '@/types';
import { InventoryService } from '@/services/inventoryService';
import { Search } from 'lucide-react';

const truckTypes: TruckType[] = ['Sleeper', 'Daycab', 'Yard Mule', 'Box Truck'];
const trailerTypes: TrailerType[] = ['Dry Van', 'Reefer', 'Low Boy', 'Flat Bed', 'Pneumatic'];

export function HeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<UnitCategory>('truck');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [makes, setMakes] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [makesData, typesData] = await Promise.all([
          InventoryService.getUniqueMakes(activeTab),
          InventoryService.getUniqueTypes(activeTab),
        ]);
        setMakes(Array.isArray(makesData) ? makesData : []);
        setTypes(Array.isArray(typesData) ? typesData : []);
      } catch (error) {
        console.error('Error loading filter options:', error);
        setMakes([]);
        setTypes([]);
      }
    };
    loadFilters();
  }, [activeTab]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set('category', activeTab);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    navigate(`/inventory?${params.toString()}`);
  };

  return (
    <section className="relative h-[600px] flex items-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&q=80"
          alt="Heavy-duty trucks"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4">
        <div className="max-w-4xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            {t('hero.subtitle')}
          </p>

          {/* Search Card */}
          <Card className="p-6 shadow-strong">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UnitCategory)}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="truck">{t('search.trucks')}</TabsTrigger>
                <TabsTrigger value="trailer">{t('search.trailers')}</TabsTrigger>
                <TabsTrigger value="equipment">{t('search.equipment')}</TabsTrigger>
              </TabsList>

              {/* Trucks Search */}
              <TabsContent value="truck" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select onValueChange={(v) => setFilters({ ...filters, type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('search.type')} />
                    </SelectTrigger>
                    <SelectContent>
                      {truckTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={(v) => setFilters({ ...filters, make: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('search.make')} />
                    </SelectTrigger>
                    <SelectContent>
                      {makes.map((make) => (
                        <SelectItem key={make} value={make}>
                          {make}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={(v) => setFilters({ ...filters, year_min: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('search.yearRange')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}+
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={handleSearch} className="w-full">
                    <Search className="h-4 w-4 mr-2" />
                    {t('search.search')}
                  </Button>
                </div>
              </TabsContent>

              {/* Trailers Search */}
              <TabsContent value="trailer" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select onValueChange={(v) => setFilters({ ...filters, type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('search.type')} />
                    </SelectTrigger>
                    <SelectContent>
                      {trailerTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={(v) => setFilters({ ...filters, make: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('search.make')} />
                    </SelectTrigger>
                    <SelectContent>
                      {makes.map((make) => (
                        <SelectItem key={make} value={make}>
                          {make}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={(v) => setFilters({ ...filters, year_min: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('search.yearRange')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}+
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={handleSearch} className="w-full">
                    <Search className="h-4 w-4 mr-2" />
                    {t('search.search')}
                  </Button>
                </div>
              </TabsContent>

              {/* Equipment Search */}
              <TabsContent value="equipment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select onValueChange={(v) => setFilters({ ...filters, type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('search.type')} />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={(v) => setFilters({ ...filters, make: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('search.make')} />
                    </SelectTrigger>
                    <SelectContent>
                      {makes.map((make) => (
                        <SelectItem key={make} value={make}>
                          {make}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={(v) => setFilters({ ...filters, year_min: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('search.yearRange')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}+
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={handleSearch} className="w-full">
                    <Search className="h-4 w-4 mr-2" />
                    {t('search.search')}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </section>
  );
}
