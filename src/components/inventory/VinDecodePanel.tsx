import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VinDecodeResult } from '@/hooks/useVinDecode';
import { CheckCircle, Info } from 'lucide-react';

interface VinDecodePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: VinDecodeResult | null;
  onApplySelected: (selectedFields: Partial<Record<keyof VinDecodeResult, boolean>>) => void;
}

export function VinDecodePanel({
  open,
  onOpenChange,
  result,
  onApplySelected,
}: VinDecodePanelProps) {
  const { t } = useTranslation();
  const [selectedFields, setSelectedFields] = useState<
    Partial<Record<keyof VinDecodeResult, boolean>>
  >({});

  if (!result) return null;

  const suggestions: Array<{
    key: keyof VinDecodeResult;
    label: string;
    value: string | undefined;
  }> = ([
    { key: 'make' as const, label: t('vinDecode.make'), value: result.make },
    { key: 'model' as const, label: t('vinDecode.model'), value: result.model },
    { key: 'year' as const, label: t('vinDecode.year'), value: result.year },
    { key: 'engine' as const, label: t('vinDecode.engine'), value: result.engine },
    { key: 'transmission' as const, label: t('vinDecode.transmission'), value: result.transmission },
    { key: 'axles' as const, label: t('vinDecode.axles'), value: result.axles },
    { key: 'typeHint' as const, label: t('vinDecode.typeHint'), value: result.typeHint },
  ] as const).filter((s) => s.value) as Array<{
    key: keyof VinDecodeResult;
    label: string;
    value: string | undefined;
  }>;

  const handleApply = () => {
    onApplySelected(selectedFields);
    setSelectedFields({});
    onOpenChange(false);
  };

  const handleToggle = (key: keyof VinDecodeResult) => {
    setSelectedFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = suggestions.reduce(
      (acc, s) => ({ ...acc, [s.key]: true }),
      {}
    );
    setSelectedFields(allSelected);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('vinDecode.suggestions')}</SheetTitle>
          <SheetDescription>{t('vinDecode.selectFieldsToApply')}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-6">
          <div className="space-y-4">
            {/* Suggestions Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {t('vinDecode.suggestedFields')}
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {t('vinDecode.selectAll')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.key}
                    className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`field-${suggestion.key}`}
                      checked={selectedFields[suggestion.key] || false}
                      onCheckedChange={() => handleToggle(suggestion.key)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={`field-${suggestion.key}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {suggestion.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.value}
                      </p>
                      {suggestion.key === 'typeHint' && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          {t('vinDecode.typeHintNote')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Raw Data Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {t('vinDecode.rawData')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 text-xs font-mono">
                    {Object.entries(result.rawData)
                      .filter(([_, value]) => value && value !== 'Not Applicable')
                      .map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-muted-foreground">{key}:</span>
                          <span>{value}</span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t">
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleApply}
              disabled={Object.keys(selectedFields).length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('vinDecode.applySelected')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
