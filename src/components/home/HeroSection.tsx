import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnitCategory, TruckType, TrailerType } from '@/types';
import { InventoryService } from '@/services/inventoryService';
import { supabase } from '@/integrations/supabase/client';
import { Search } from 'lucide-react';

type HeroContent = {
  hero_title: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_cta_url: string;
  hero_image_desktop_url: string;
  hero_image_mobile_url: string;
  hero_overlay_opacity: number;
  hero_alignment: 'left' | 'center' | 'right';
  hero_show_search: boolean;
  updated_at?: string;
};

const truckTypes: TruckType[] = ['Sleeper', 'Daycab', 'Yard Mule', 'Box Truck'];
const trailerTypes: TrailerType[] = ['Dry Van', 'Reefer', 'Low Boy', 'Flat Bed', 'Pneumatic'];

export function HeroSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<UnitCategory>('truck');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [heroContent, setHeroContent] = useState<HeroContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [makes, setMakes] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  // Load makes and types when tab changes
  useEffect(() => {
    const loadFilters = async () => {
      const [makesData, typesData] = await Promise.all([
        InventoryService.getUniqueMakes(activeTab),
        InventoryService.getUniqueTypes(activeTab),
      ]);
      setMakes(makesData);
      setTypes(typesData);
    };
    loadFilters();
  }, [activeTab]);

  // Default fallback content
  const defaultContent: HeroContent = {
    hero_title: t('hero.title'),
    hero_subtitle: t('hero.subtitle'),
    hero_cta_label: '',
    hero_cta_url: '',
    hero_image_desktop_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&q=80',
    hero_image_mobile_url: '',
    hero_overlay_opacity: 0.5,
    hero_alignment: 'center',
    hero_show_search: true,
  };

  useEffect(() => {
    loadHeroContent();
  }, [i18n.language]);

  const loadHeroContent = async () => {
    try {
      setLoading(true);
      const currentLocale = i18n.language === 'es' ? 'es' : 'en';
      
      // Try to fetch published settings for current locale
      const { data, error } = await supabase
        .from('site_settings_published')
        .select('*')
        .eq('locale', currentLocale)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setHeroContent(data as HeroContent);
      } else {
        // Try other locale
        const otherLocale = currentLocale === 'en' ? 'es' : 'en';
        const { data: otherData } = await supabase
          .from('site_settings_published')
          .select('*')
          .eq('locale', otherLocale)
          .maybeSingle();

        if (otherData) {
          setHeroContent(otherData as HeroContent);
        } else {
          // Use default fallback
          setHeroContent(defaultContent);
        }
      }
    } catch (error) {
      console.error('Error loading hero content:', error);
      setHeroContent(defaultContent);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set('category', activeTab);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    navigate(`/inventory?${params.toString()}`);
  };

  const content = heroContent || defaultContent;
  const alignmentClass = 
    content.hero_alignment === 'left' ? 'items-start text-left' :
    content.hero_alignment === 'right' ? 'items-end text-right' :
    'items-center text-center';

  // Cache-busting: append timestamp to image URLs
  const cacheBustParam = heroContent?.updated_at 
    ? `?v=${new Date(heroContent.updated_at).getTime()}`
    : '';
  const desktopImageUrl = `${content.hero_image_desktop_url}${cacheBustParam}`;
  const mobileImageUrl = content.hero_image_mobile_url 
    ? `${content.hero_image_mobile_url}${cacheBustParam}`
    : '';

  if (loading) {
    return (
      <section className="relative h-[600px] flex items-center bg-muted animate-pulse">
        <div className="container relative z-10 px-4">
          <div className="max-w-4xl space-y-4">
            <div className="h-12 bg-muted-foreground/20 rounded w-3/4" />
            <div className="h-6 bg-muted-foreground/20 rounded w-1/2" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-[600px] flex items-center">
      {/* Background Image with Overlay - Responsive */}
      <div className="absolute inset-0 z-0">
        <picture>
          {mobileImageUrl && (
            <source
              media="(max-width: 768px)"
              srcSet={mobileImageUrl}
            />
          )}
          <img
            src={desktopImageUrl}
            alt={content.hero_title}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </picture>
        <div
          className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"
          style={{
            opacity: content.hero_overlay_opacity,
          }}
        />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4">
        <div className={`max-w-4xl flex flex-col ${alignmentClass}`}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {content.hero_title}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            {content.hero_subtitle}
          </p>

          {content.hero_cta_label && content.hero_cta_url && (
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mb-6 self-start"
            >
              <a href={content.hero_cta_url}>{content.hero_cta_label}</a>
            </Button>
          )}

          {/* Search Card */}
          {content.hero_show_search && (
            <Card className="p-6 shadow-strong w-full">
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
          )}
        </div>
      </div>
    </section>
  );
}
