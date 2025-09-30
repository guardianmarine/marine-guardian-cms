import { Unit } from '@/types';

export function generateUnitSlug(unit: Unit): string {
  // Generate SEO-friendly slug but keep the ID for routing
  // Format: /inventory/category/year-make-model-id
  const slug = `${unit.category}/${unit.year}-${unit.make}-${unit.model}-${unit.id}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-/]/g, '');
  return `/inventory/${slug}`;
}

// Extract ID from slug
export function extractIdFromSlug(slug: string): string {
  // The ID is the last segment after the last hyphen
  const parts = slug.split('/');
  const lastPart = parts[parts.length - 1];
  const segments = lastPart.split('-');
  return segments[segments.length - 1];
}

export function generateVehicleSchema(unit: Unit) {
  const mainPhoto = unit.photos.find(p => p.is_main) || unit.photos[0];
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: `${unit.year} ${unit.make} ${unit.model}`,
    brand: {
      '@type': 'Brand',
      name: unit.make,
    },
    model: unit.model,
    vehicleModelDate: unit.year,
    vehicleIdentificationNumber: unit.vin_or_serial.slice(-6), // Last 6 only for privacy
    vehicleEngine: unit.engine,
    vehicleTransmission: unit.transmission,
    color: unit.color,
    mileageFromOdometer: unit.mileage ? {
      '@type': 'QuantitativeValue',
      value: unit.mileage,
      unitCode: 'SMI', // Miles
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: unit.display_price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'Guardian Marine & Truck',
      },
    },
    image: mainPhoto?.url,
    url: `${window.location.origin}${generateUnitSlug(unit)}`,
  };
}

export function getUnitBadges(unit: Unit, events?: any[]): string[] {
  const badges: string[] = [];
  
  // New Arrival: listed within 14 days
  if (unit.listed_at) {
    const listedDate = new Date(unit.listed_at);
    const daysSinceListed = Math.floor((Date.now() - listedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceListed <= 14) {
      badges.push('New Arrival');
    }
  }
  
  // Reduced: price lowered (detect from events)
  if (events) {
    const priceChanges = events.filter(
      e => e.event_type === 'updated' && 
      e.data.changes?.display_price !== undefined &&
      e.data.changes.display_price < unit.display_price
    );
    if (priceChanges.length > 0) {
      badges.push('Reduced');
    }
  }
  
  return badges;
}

export function shortenVin(vin: string): string {
  return vin.slice(-6).toUpperCase();
}
