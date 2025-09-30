import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HeroSection } from '@/components/home/HeroSection';
import { UnitCard } from '@/components/inventory/UnitCard';
import { UnitCardXL } from '@/components/inventory/UnitCardXL';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentService } from '@/services/contentService';
import { InventoryService } from '@/services/inventoryService';
import { FeaturedPick } from '@/types';
import { ArrowRight, Truck, Container, Wrench } from 'lucide-react';

export default function Home() {
  const { t, i18n } = useTranslation();
  const [featuredPicks, setFeaturedPicks] = useState<FeaturedPick[]>([]);
  const [categoryCounts, setCategoryCounts] = useState({ truck: 0, trailer: 0, equipment: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      const [homeContent, counts] = await Promise.all([
        ContentService.getHomeContent(i18n.language as any),
        Promise.resolve(InventoryService.getCategoryCounts()),
      ]);
      setFeaturedPicks(homeContent.featuredPicks);
      setCategoryCounts(counts as { truck: number; trailer: number; equipment: number });
      setLoading(false);
    };
    loadContent();
  }, [i18n.language]);

  // Filter out categories with zero stock
  const categories = [
    {
      name: t('categories.trucks'),
      count: categoryCounts.truck,
      icon: Truck,
      link: '/inventory?category=truck',
      key: 'truck',
    },
    {
      name: t('categories.trailers'),
      count: categoryCounts.trailer,
      icon: Container,
      link: '/inventory?category=trailer',
      key: 'trailer',
    },
    {
      name: t('categories.equipment'),
      count: categoryCounts.equipment,
      icon: Wrench,
      link: '/inventory?category=equipment',
      key: 'equipment',
    },
  ].filter((cat) => cat.count > 0); // Hide empty categories

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />

      {/* Featured Units */}
      <section className="py-16 bg-gradient-subtle">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">{t('featured.title')}</h2>
              <p className="text-muted-foreground">{t('featured.description')}</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/inventory">
                {t('common.viewAll')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
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
          ) : featuredPicks.length > 0 ? (
            featuredPicks.length < 4 ? (
              // XL Cards for small inventory
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {featuredPicks.map((pick) => pick.unit && <UnitCardXL key={pick.id} unit={pick.unit} />)}
              </div>
            ) : (
              // Regular grid for 4+ items
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredPicks.map((pick) => pick.unit && <UnitCard key={pick.id} unit={pick.unit} />)}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No featured units at this time. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Categories In Stock */}
      <section className="py-16">
        <div className="container px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">{t('categories.inStock')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link key={category.key} to={category.link}>
                  <Card className="hover:shadow-medium transition-shadow h-full group">
                    <CardContent className="p-8 text-center space-y-4">
                      <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{category.name}</h3>
                        <p className="text-muted-foreground mt-2">
                          {category.count} {category.count === 1 ? 'unit' : 'units'} available
                        </p>
                      </div>
                      <Button variant="ghost" className="group-hover:text-primary">
                        Browse {category.name}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Request Unit CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t('requestUnit.title')}</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">{t('requestUnit.description')}</p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/request-unit">{t('requestUnit.cta')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
