import { Link } from 'react-router-dom';
import { Unit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Gauge, Cog, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateUnitSlug, getUnitBadges, shortenVin } from '@/lib/seo';
import { getUnitTypeLabel } from '@/lib/i18n-helpers';

interface UnitCardProps {
  unit: Unit;
}

export function UnitCard({ unit }: UnitCardProps) {
  const { t } = useTranslation();
  const mainPhoto = unit.photos.find((p) => p.is_main) || unit.photos[0];
  const badges = getUnitBadges(unit);
  const slug = generateUnitSlug(unit);
  const typeLabel = getUnitTypeLabel(unit.type, unit.category, t);

  const href = unit.slug ? `/unit/${unit.slug}` : `/unit/${unit.id}`;

  return (
    <Link to={href}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={mainPhoto?.url || '/placeholder.svg'}
            alt={`${unit.year} ${unit.make} ${unit.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          
          {/* Badges */}
          {badges.length > 0 && (
            <div className="absolute top-3 left-3 flex gap-2">
              {badges.map((badge) => (
                <Badge 
                  key={badge}
                  variant={badge === 'New Arrival' ? 'default' : 'destructive'}
                  className="shadow-lg"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Category Badge */}
          <Badge 
            variant="secondary" 
            className="absolute top-3 right-3 capitalize"
          >
            {unit.category}
          </Badge>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Title */}
          <div>
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
              {unit.year} {unit.make} {unit.model}
            </h3>
            <p className="text-sm text-muted-foreground">{typeLabel}</p>
          </div>

          {/* Specs */}
          <div className="space-y-1 text-sm">
            {unit.engine && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Cog className="h-4 w-4" />
                <span>{unit.engine}</span>
              </div>
            )}
            {unit.transmission && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Settings className="h-4 w-4" />
                <span>{unit.transmission}</span>
              </div>
            )}
            {unit.mileage && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gauge className="h-4 w-4" />
                <span>{unit.mileage.toLocaleString()} miles</span>
              </div>
            )}
          </div>

          {/* VIN & Location */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{unit.location?.name || 'Red Oak, TX'}</span>
            </div>
            <span className="font-mono">VIN: {shortenVin(unit.vin_or_serial)}</span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-2xl font-bold text-primary">
              ${unit.display_price.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">USD</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
