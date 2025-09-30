import { Link } from 'react-router-dom';
import { Unit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface UnitCardXLProps {
  unit: Unit;
}

export function UnitCardXL({ unit }: UnitCardXLProps) {
  const { t } = useTranslation();
  const mainPhoto = unit.photos.find((p) => p.is_main) || unit.photos[0];

  const isNewArrival = () => {
    if (!unit.listed_at) return false;
    const listedDate = new Date(unit.listed_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return listedDate > thirtyDaysAgo;
  };

  return (
    <Link to={`/inventory/${unit.id}`}>
      <Card className="overflow-hidden hover:shadow-strong transition-all h-full group">
        {/* Image with Gradient Overlay */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={mainPhoto?.url}
            alt={`${unit.year} ${unit.make} ${unit.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {isNewArrival() && (
              <Badge className="bg-primary text-primary-foreground shadow-md">
                {t('inventory.newArrival')}
              </Badge>
            )}
          </div>

          {/* Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h3 className="font-bold text-2xl mb-2">
              {unit.year} {unit.make} {unit.model}
            </h3>
            {unit.price && (
              <p className="text-3xl font-bold mb-3">${unit.price.toLocaleString()}</p>
            )}
            
            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              {unit.mileage && (
                <div>
                  <span className="opacity-80">Mileage:</span>{' '}
                  <span className="font-semibold">{unit.mileage.toLocaleString()} mi</span>
                </div>
              )}
              {unit.engine && (
                <div>
                  <span className="opacity-80">Engine:</span>{' '}
                  <span className="font-semibold">{unit.engine}</span>
                </div>
              )}
              {unit.transmission && (
                <div>
                  <span className="opacity-80">Transmission:</span>{' '}
                  <span className="font-semibold">{unit.transmission}</span>
                </div>
              )}
              {unit.axles && (
                <div>
                  <span className="opacity-80">Axles:</span>{' '}
                  <span className="font-semibold">{unit.axles}</span>
                </div>
              )}
            </div>

            {/* Location & CTA */}
            <div className="flex items-center justify-between">
              {unit.location && (
                <div className="flex items-center text-sm opacity-90">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{unit.location.name}</span>
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {t('inventory.viewDetails')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
