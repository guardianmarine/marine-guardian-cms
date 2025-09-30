import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NHTSAResponse {
  Results: Array<{
    Variable: string;
    Value: string | null;
    ValueId: string | null;
  }>;
}

interface NormalizedVINData {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  transmission?: string;
  axles?: number;
  gvwr_class?: string;
  additional_notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { vin, modelYear, refresh = false } = await req.json();

    if (!vin || vin.length < 11) {
      return new Response(
        JSON.stringify({ error: 'VIN must be at least 11 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache unless refresh requested
    if (!refresh) {
      const { data: cached } = await supabase
        .from('vin_decode_cache')
        .select('*')
        .eq('vin', vin.toUpperCase())
        .eq('model_year', modelYear || null)
        .gte('fetched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        console.log('VIN decode cache hit:', vin);
        return new Response(
          JSON.stringify({
            cached: true,
            raw: cached.raw,
            normalized: cached.normalized,
            fetched_at: cached.fetched_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Call NHTSA API
    console.log('Calling NHTSA API for VIN:', vin, 'modelYear:', modelYear);
    const nhtsaUrl = modelYear
      ? `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json&modelyear=${modelYear}`
      : `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let nhtsaResponse: Response;
    try {
      nhtsaResponse = await fetch(nhtsaUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'TruckDealershipApp/1.0' },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'NHTSA API timeout' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }
    clearTimeout(timeoutId);

    if (!nhtsaResponse.ok) {
      console.error('NHTSA API error:', nhtsaResponse.status, nhtsaResponse.statusText);
      return new Response(
        JSON.stringify({ error: `NHTSA API returned ${nhtsaResponse.status}` }),
        { status: nhtsaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nhtsaData: NHTSAResponse = await nhtsaResponse.json();
    console.log('NHTSA response received, results count:', nhtsaData.Results?.length || 0);

    // Normalize the response
    const normalized: NormalizedVINData = {};
    const resultMap = new Map(nhtsaData.Results.map(r => [r.Variable, r.Value]));

    // Map key fields
    if (resultMap.get('Make')) normalized.make = resultMap.get('Make')!;
    if (resultMap.get('Model')) normalized.model = resultMap.get('Model')!;
    if (resultMap.get('Model Year')) normalized.year = parseInt(resultMap.get('Model Year')!, 10);

    // Engine
    const engineMfr = resultMap.get('Engine Manufacturer');
    const engineModel = resultMap.get('Engine Model');
    const displacement = resultMap.get('Displacement (L)');
    const hp = resultMap.get('Engine Brake (hp) From');
    if (engineMfr || engineModel || displacement || hp) {
      const parts = [engineMfr, engineModel, displacement ? `${displacement}L` : null, hp ? `${hp}hp` : null].filter(Boolean);
      normalized.engine = parts.join(' ');
    }

    // Transmission
    const transMfr = resultMap.get('Transmission Manufacturer');
    const transModel = resultMap.get('Transmission Model');
    const transSpeeds = resultMap.get('Transmission Speeds');
    if (transMfr || transModel || transSpeeds) {
      const parts = [transMfr, transModel, transSpeeds ? `${transSpeeds}-speed` : null].filter(Boolean);
      normalized.transmission = parts.join(' ');
    }

    // Axles
    const axlesStr = resultMap.get('Number of Axles');
    if (axlesStr) {
      const axlesNum = parseInt(axlesStr, 10);
      if (!isNaN(axlesNum)) normalized.axles = axlesNum;
    }

    // GVWR
    if (resultMap.get('Gross Vehicle Weight Rating From')) {
      normalized.gvwr_class = resultMap.get('Gross Vehicle Weight Rating From')!;
    }

    // Additional notes
    const additionalFields = ['Body Class', 'Fuel Type - Primary', 'Cab Type', 'Series'];
    const notes = additionalFields
      .map(field => {
        const val = resultMap.get(field);
        return val ? `${field}: ${val}` : null;
      })
      .filter(Boolean)
      .join('; ');
    if (notes) normalized.additional_notes = notes;

    // Store in cache
    const { error: insertError } = await supabase.from('vin_decode_cache').insert({
      vin: vin.toUpperCase(),
      model_year: modelYear || null,
      provider: 'nhtsa',
      raw: nhtsaData,
      normalized,
      fetched_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Failed to cache VIN decode:', insertError);
    } else {
      console.log('VIN decode cached successfully');
    }

    return new Response(
      JSON.stringify({
        cached: false,
        raw: nhtsaData,
        normalized,
        fetched_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in decode-vin function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
