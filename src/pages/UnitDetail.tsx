import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UnitCard } from '@/components/inventory/UnitCard';
import { InventoryService } from '@/services/inventoryService';
import { Unit } from '@/types';
import { Phone, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { generateVehicleSchema, shortenVin } from '@/lib/seo';

export default function UnitDetail() {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const { t } = useTranslation();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [similarUnits, setSimilarUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Extract ID from slug if using slug-based route
  const unitId = id || (slug ? slug.split('-').pop() : null);

  useEffect(() => {
    const loadUnit = async () => {
      if (!unitId) return;
      setLoading(true);
      const data = await InventoryService.getPublicUnit(unitId);
      if (data) {
        setUnit(data);
        const similar = await InventoryService.getSimilarUnits(data);
        setSimilarUnits(similar);
      }
      setLoading(false);
    };
    loadUnit();
  }, [unitId]);

  if (loading) {
    return (
      <div className="container px-4 py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-[4/3]" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="container px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Unit not found</h1>
        <Button asChild>
          <Link to="/inventory">Back to Inventory</Link>
        </Button>
      </div>
    );
  }

  const mainPhoto = unit.photos[currentPhotoIndex] || unit.photos[0];

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % unit.photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + unit.photos.length) % unit.photos.length);
  };

  const schema = generateVehicleSchema(unit);

  return (
    <>
      <Helmet>
        <title>{`${unit.year} ${unit.make} ${unit.model} - Guardian Marine & Truck`}</title>
        <meta 
          name="description" 
          content={`${unit.year} ${unit.make} ${unit.model} ${unit.type}. ${unit.engine ? `Engine: ${unit.engine}. ` : ''}${unit.transmission ? `Transmission: ${unit.transmission}. ` : ''}$${unit.display_price.toLocaleString()} USD`}
        />
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link to="/inventory" className="text-primary hover:underline">
              ← Back to Inventory
            </Link>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Gallery */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-muted group">
                <TransformWrapper>
                  <TransformComponent>
                    <img
                      src={mainPhoto.url}
                      alt={`${unit.year} ${unit.make} ${unit.model}`}
                      className="w-full h-full object-cover"
                    />
                  </TransformComponent>
                </TransformWrapper>

                {unit.photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            </Card>

            {/* Thumbnails */}
            {unit.photos.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {unit.photos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === currentPhotoIndex ? 'border-primary' : 'border-transparent hover:border-border'
                    }`}
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {unit.year} {unit.make} {unit.model}
              </h1>
              {unit.display_price && (
                <p className="text-3xl font-bold text-primary">${unit.display_price.toLocaleString()}</p>
              )}
            </div>

            {/* Specs */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">{t('inventory.specifications')}</h2>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Year</dt>
                    <dd className="font-medium">{unit.year}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Make</dt>
                    <dd className="font-medium">{unit.make}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Model</dt>
                    <dd className="font-medium">{unit.model}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Type</dt>
                    <dd className="font-medium">{unit.type}</dd>
                  </div>
                  {unit.color && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Color</dt>
                      <dd className="font-medium">{unit.color}</dd>
                    </div>
                  )}
                  {unit.mileage && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Mileage</dt>
                      <dd className="font-medium">{unit.mileage.toLocaleString()} mi</dd>
                    </div>
                  )}
                  {unit.engine && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Engine</dt>
                      <dd className="font-medium">{unit.engine}</dd>
                    </div>
                  )}
                  {unit.transmission && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Transmission</dt>
                      <dd className="font-medium">{unit.transmission}</dd>
                    </div>
                  )}
                  {unit.axles && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Axles</dt>
                      <dd className="font-medium">{unit.axles}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-muted-foreground">VIN/Serial (Last 6)</dt>
                    <dd className="font-medium font-mono text-sm">{shortenVin(unit.vin_or_serial)}</dd>
                  </div>
                  {unit.location && (
                    <div className="col-span-2">
                      <dt className="text-sm text-muted-foreground">Location</dt>
                      <dd className="font-medium">{unit.location.name}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Contact CTAs */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold mb-3">Interested in this unit?</h3>
                <Button className="w-full" size="lg">
                  <Phone className="h-5 w-5 mr-2" />
                  {t('inventory.requestInfo')}
                </Button>
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <a href={`tel:${t('common.phone')}`}>
                    <Phone className="h-5 w-5 mr-2" />
                    Call {t('common.phone')}
                  </a>
                </Button>
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <a href={`https://wa.me/12146138521`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Similar Units */}
        {similarUnits.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">{t('inventory.similarUnits')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarUnits.map((similarUnit) => (
                <UnitCard key={similarUnit.id} unit={similarUnit} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
    </>
  );
}
