import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface VINDecodePanelProps {
  vin: string;
  modelYear?: number;
  category: string;
  onApply: (fields: {
    make?: string;
    model?: string;
    year?: number;
    engine?: string;
    transmission?: string;
    axles?: number;
  }) => void;
  onDecodeSuccess?: (metadata: any) => void;
}

interface NormalizedData {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  transmission?: string;
  axles?: number;
  gvwr_class?: string;
  additional_notes?: string;
}

export function VINDecodePanel({ vin, modelYear, category, onApply, onDecodeSuccess }: VINDecodePanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [decoded, setDecoded] = useState<{
    normalized: NormalizedData;
    raw: any;
    cached: boolean;
    fetched_at: string;
  } | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleDecode = async (refresh = false) => {
    if (!vin || vin.length < 11) {
      toast({
        title: 'Invalid VIN',
        description: 'VIN must be at least 11 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('decode-vin', {
        body: { vin, modelYear, refresh },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setDecoded(data);
      setOpen(true);

      // Pre-select all available fields
      const preselect: Record<string, boolean> = {};
      Object.keys(data.normalized).forEach(key => {
        if (data.normalized[key]) preselect[key] = true;
      });
      setSelectedFields(preselect);

      if (onDecodeSuccess) {
        onDecodeSuccess({
          vin_decode_source: 'nhtsa',
          vin_decode_cached: data.cached,
          vin_decode_fetched_at: data.fetched_at,
          vin_decode_notes: data.normalized.additional_notes,
          vin_decode_gvwr: data.normalized.gvwr_class,
        });
      }

      toast({
        title: data.cached ? 'VIN decoded (cached)' : 'VIN decoded',
        description: `Successfully decoded VIN from NHTSA${data.cached ? ' (from cache)' : ''}`,
      });
    } catch (error) {
      console.error('VIN decode error:', error);
      toast({
        title: 'Decode failed',
        description: error instanceof Error ? error.message : 'Failed to decode VIN',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplySelected = () => {
    if (!decoded) return;

    const fieldsToApply: any = {};
    if (selectedFields.make && decoded.normalized.make) fieldsToApply.make = decoded.normalized.make;
    if (selectedFields.model && decoded.normalized.model) fieldsToApply.model = decoded.normalized.model;
    if (selectedFields.year && decoded.normalized.year) fieldsToApply.year = decoded.normalized.year;
    if (selectedFields.engine && decoded.normalized.engine) fieldsToApply.engine = decoded.normalized.engine;
    if (selectedFields.transmission && decoded.normalized.transmission) fieldsToApply.transmission = decoded.normalized.transmission;
    if (selectedFields.axles && decoded.normalized.axles) fieldsToApply.axles = decoded.normalized.axles;

    onApply(fieldsToApply);
    setOpen(false);
    toast({
      title: 'Fields applied',
      description: `Applied ${Object.keys(fieldsToApply).length} field(s) from VIN decode`,
    });
  };

  const warningText = category === 'truck' && vin.length !== 17
    ? 'Truck VIN should be 17 characters'
    : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleDecode(false)}
        disabled={loading || !vin || vin.length < 11}
        className="whitespace-nowrap"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Decoding...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Decode VIN (NHTSA)
          </>
        )}
      </Button>

      {warningText && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {warningText}
        </p>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              VIN Decoded: {vin}
            </SheetTitle>
          </SheetHeader>

          {decoded && (
            <div className="space-y-6 mt-6">
              {/* Status badges */}
              <div className="flex items-center gap-2">
                <Badge variant={decoded.cached ? 'secondary' : 'default'}>
                  {decoded.cached ? 'Cached' : 'Fresh'}
                </Badge>
                <Badge variant="outline">NHTSA</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(decoded.fetched_at).toLocaleString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDecode(true)}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Normalized fields */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Apply Fields to Form</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(decoded.normalized).map(([key, value]) => {
                    if (!value || key === 'additional_notes' || key === 'gvwr_class') return null;

                    return (
                      <div key={key} className="flex items-start space-x-3 p-2 rounded border">
                        <Checkbox
                          id={`field-${key}`}
                          checked={!!selectedFields[key]}
                          onCheckedChange={(checked) =>
                            setSelectedFields(prev => ({ ...prev, [key]: !!checked }))
                          }
                        />
                        <div className="flex-1">
                          <Label htmlFor={`field-${key}`} className="font-semibold capitalize cursor-pointer">
                            {key.replace(/_/g, ' ')}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-0.5">{String(value)}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Additional info */}
              {(decoded.normalized.gvwr_class || decoded.normalized.additional_notes) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {decoded.normalized.gvwr_class && (
                      <div>
                        <span className="font-semibold">GVWR Class: </span>
                        {decoded.normalized.gvwr_class}
                      </div>
                    )}
                    {decoded.normalized.additional_notes && (
                      <div>
                        <span className="font-semibold">Notes: </span>
                        {decoded.normalized.additional_notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Raw data preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Raw NHTSA Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto">
                    <pre className="text-xs bg-muted p-3 rounded">
                      {JSON.stringify(decoded.raw, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* Apply button */}
              <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApplySelected}>
                  Apply Selected Fields
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
