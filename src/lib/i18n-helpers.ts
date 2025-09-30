import { TFunction } from 'i18next';
import { TruckType, TrailerType } from '@/types';

/**
 * Get translated label for truck type
 * Always stores canonical English values in DB
 */
export function getTruckTypeLabel(type: TruckType, t: TFunction): string {
  return t(`truckTypes.${type}`);
}

/**
 * Get translated label for trailer type
 * Always stores canonical English values in DB
 */
export function getTrailerTypeLabel(type: TrailerType, t: TFunction): string {
  return t(`trailerTypes.${type}`);
}

/**
 * Get all truck types with their translations
 */
export function getTruckTypes(t: TFunction): Array<{ value: TruckType; label: string }> {
  const types: TruckType[] = ['Sleeper', 'Daycab', 'Yard Mule', 'Box Truck'];
  return types.map(type => ({
    value: type,
    label: getTruckTypeLabel(type, t),
  }));
}

/**
 * Get all trailer types with their translations
 */
export function getTrailerTypes(t: TFunction): Array<{ value: TrailerType; label: string }> {
  const types: TrailerType[] = ['Dry Van', 'Reefer', 'Low Boy', 'Flat Bed', 'Pneumatic'];
  return types.map(type => ({
    value: type,
    label: getTrailerTypeLabel(type, t),
  }));
}

/**
 * Get translated type label for any unit (auto-detect category)
 */
export function getUnitTypeLabel(type: string, category: 'truck' | 'trailer' | 'equipment', t: TFunction): string {
  if (category === 'truck') {
    return getTruckTypeLabel(type as TruckType, t);
  } else if (category === 'trailer') {
    return getTrailerTypeLabel(type as TrailerType, t);
  }
  // Equipment types are free text, no translation
  return type;
}
