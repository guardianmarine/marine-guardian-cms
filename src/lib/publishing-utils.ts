import { Unit } from '@/types';

/**
 * Determines if a unit is published and should be visible on the public website.
 * 
 * Supports multiple schema patterns:
 * 1. status === 'published' (current default)
 * 2. status IN ('available', 'reserved') AND published_at/listed_at IS NOT NULL
 * 3. is_published === true (if field exists)
 * 
 * This defensive approach works with different database schemas.
 */
export function isUnitPublished(unit: any): boolean {
  // Pattern 1: Explicit 'published' status (current schema)
  if (unit.status === 'published') {
    return true;
  }

  // Pattern 2: Alternative statuses with timestamp (e.g., 'available' or 'reserved' + published_at)
  // Some schemas use 'available' instead of 'published'
  if (
    (unit.status === 'available' || unit.status === 'reserved') &&
    (unit.published_at || unit.listed_at)
  ) {
    return true;
  }

  // Pattern 3: Boolean flag (if exists in schema)
  if (unit.is_published === true) {
    return true;
  }

  return false;
}

/**
 * Gets the primary photo for a unit.
 * 
 * Tries multiple approaches:
 * 1. Main photo from photos array (is_main: true)
 * 2. First photo in photos array
 * 3. main_photo_url field (if exists)
 * 4. Returns null for placeholder handling
 */
export function getUnitMainPhoto(unit: any): string | null {
  // Try photos array
  if (unit.photos && Array.isArray(unit.photos) && unit.photos.length > 0) {
    // Find main photo
    const mainPhoto = unit.photos.find((p: any) => p.is_main);
    if (mainPhoto?.url) {
      return mainPhoto.url;
    }
    
    // Use first photo
    if (unit.photos[0]?.url) {
      return unit.photos[0].url;
    }
  }

  // Try direct field
  if (unit.main_photo_url) {
    return unit.main_photo_url;
  }

  // No photo available
  return null;
}

/**
 * Gets all photos for a unit.
 * Returns empty array if no photos available.
 */
export function getUnitPhotos(unit: any): Array<{ id: string; url: string }> {
  if (unit.photos && Array.isArray(unit.photos)) {
    return unit.photos
      .filter((p: any) => p.url)
      .map((p: any) => ({
        id: p.id || String(Math.random()),
        url: p.url,
      }));
  }

  if (unit.main_photo_url) {
    return [{ id: '1', url: unit.main_photo_url }];
  }

  return [];
}

/**
 * Checks if a unit can be published.
 * Returns validation result with errors.
 */
export function validatePublishing(unit: Unit): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!unit.display_price || unit.display_price <= 0) {
    errors.push('Price is required');
  }

  if (!unit.vin_or_serial) {
    errors.push('VIN/Serial is required');
  }

  if (!unit.make || !unit.model || !unit.year) {
    errors.push('Make, model, and year are required');
  }

  if (!unit.photos || unit.photos.length === 0) {
    errors.push('At least one photo is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
