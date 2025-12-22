import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeNhtsa, VinNormalized, NhtsaRow } from '@/lib/vin-normalizer';

export interface VinDecodeResult extends VinNormalized {
  rawData: NhtsaRow;
}

export interface VinDecodeState {
  loading: boolean;
  error: string | null;
  result: VinDecodeResult | null;
}

export function useVinDecode() {
  const [state, setState] = useState<VinDecodeState>({
    loading: false,
    error: null,
    result: null,
  });

  const decodeVin = async (vin: string, modelYear?: string) => {
    setState({ loading: true, error: null, result: null });

    try {
      let url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`;
      if (modelYear) {
        url += `&modelyear=${modelYear}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to decode VIN');
      }

      const data = await response.json();
      const results = data.Results?.[0];

      // NHTSA returns comma-separated error codes
      // Code 0 = success, other codes may be warnings (e.g., 12 = model year mismatch, 14 = partial data)
      const errorCodes = (results?.ErrorCode || '').split(',').map(c => c.trim());
      const hasSuccessCode = errorCodes.includes('0');

      if (!results || !hasSuccessCode) {
        throw new Error(results?.ErrorText || 'Invalid VIN');
      }

      // Log warnings for debugging but don't fail
      if (errorCodes.length > 1) {
        console.debug('VIN decode warnings:', results.ErrorText);
      }

      // Normalize using utility
      const normalized = normalizeNhtsa(results);

      const result: VinDecodeResult = {
        ...normalized,
        rawData: results,
      };

      // Best-effort cache: try to insert but don't fail if table doesn't exist
      try {
        await supabase.from('vin_decode_cache').insert({
          vin: vin.toUpperCase(),
          model_year: modelYear || normalized.year || null,
          provider: 'nhtsa',
          raw: results,
          normalized,
        });
      } catch (cacheError) {
        // Silently ignore cache errors (table may not exist yet)
        console.debug('VIN decode cache insert skipped:', cacheError);
      }

      setState({ loading: false, error: null, result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to decode VIN';
      setState({ loading: false, error: errorMessage, result: null });
      throw error;
    }
  };

  const reset = () => {
    setState({ loading: false, error: null, result: null });
  };

  return {
    ...state,
    decodeVin,
    reset,
  };
}
