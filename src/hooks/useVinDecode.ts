import { useState } from 'react';

export interface VinDecodeResult {
  make?: string;
  model?: string;
  year?: string;
  engine?: string;
  transmission?: string;
  axles?: string;
  typeHint?: string;
  rawData: Record<string, string>;
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

      if (!results || results.ErrorCode !== '0') {
        throw new Error(results?.ErrorText || 'Invalid VIN');
      }

      // Normalize the response
      const engine = [
        results.EngineManufacturer,
        results.EngineModel,
        results.DisplacementL ? `${results.DisplacementL}L` : '',
        results.EngineHP ? `${results.EngineHP}HP` : '',
      ]
        .filter(Boolean)
        .join(' ');

      const transmission = [
        results.TransmissionManufacturer,
        results.TransmissionStyle,
        results.TransmissionSpeeds ? `${results.TransmissionSpeeds}-speed` : '',
      ]
        .filter(Boolean)
        .join(' ');

      const axles = results.NumberOfAxles || results.Axles || '';
      
      // Best-effort type hint from BodyClass or VehicleType
      const typeHint = results.BodyClass || results.VehicleType || '';

      const result: VinDecodeResult = {
        make: results.Make || undefined,
        model: results.Model || undefined,
        year: results.ModelYear || undefined,
        engine: engine || undefined,
        transmission: transmission || undefined,
        axles: axles ? String(parseInt(axles)) : undefined,
        typeHint: typeHint || undefined,
        rawData: results,
      };

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
