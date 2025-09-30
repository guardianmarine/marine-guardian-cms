import { Link } from 'react-router-dom';
import { Unit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UnitCardProps {
  unit: Unit;
}

export function UnitCard({ unit }: UnitCardProps) {
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
      <Card className="overflow-hidden hover:shadow-medium transition-shadow h-full group">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={mainPhoto?.url}
            alt={`${unit.year} ${unit.make} ${unit.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {isNewArrival() && (
              <Badge className="bg-primary text-primary-foreground shadow-md">
                {t('inventory.newArrival')}
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Title */}
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">
              {unit.year} {unit.make} {unit.model}
            </h3>
            {unit.price && (
              <p className="text-2xl font-bold text-primary mt-1">
                ${unit.price.toLocaleString()}
              </p>
            )}
          </div>

          {/* Specs */}
          <div className="space-y-1 text-sm text-muted-foreground">
            {unit.mileage && (
              <p>
                <span className="font-medium">Mileage:</span> {unit.mileage.toLocaleString()} mi
              </p>
            )}
            {unit.engine && (
              <p>
                <span className="font-medium">Engine:</span> {unit.engine}
              </p>
            )}
            {unit.transmission && (
              <p>
                <span className="font-medium">Transmission:</span> {unit.transmission}
              </p>
            )}
            {unit.axles && (
              <p>
                <span className="font-medium">Axles:</span> {unit.axles}
              </p>
            )}
          </div>

          {/* Location */}
          {unit.location && (
            <div className="flex items-center text-sm text-muted-foreground pt-2 border-t">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{unit.location.name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
