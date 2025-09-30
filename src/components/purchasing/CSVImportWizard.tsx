import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { usePurchasingStore } from '@/services/purchasingStore';
import { useInventoryStore } from '@/services/inventoryStore';
import { AcquisitionBatch, ReceivingItem, UnitCategory } from '@/types';
import { Upload, Download, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface CSVImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: AcquisitionBatch;
}

interface ParsedRow {
  rowIndex: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

const SYSTEM_FIELDS = [
  'category',
  'make',
  'year',
  'model',
  'mileage',
  'engine',
  'transmission',
  'vin_or_serial',
  'axles',
  'type',
  'color',
  'hours',
  'cost_purchase',
  'cost_transport_in',
];

export function CSVImportWizard({ open, onOpenChange, batch }: CSVImportWizardProps) {
  const { toast } = useToast();
  const { addReceivingItem, receivingItems } = usePurchasingStore();
  const { units } = useInventoryStore();

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [defaultCategory, setDefaultCategory] = useState<UnitCategory>('truck');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [allowOverride, setAllowOverride] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.trim().split('\n');
      
      if (lines.length < 2) {
        toast({
          title: 'Invalid file',
          description: 'CSV must have headers and at least one data row',
          variant: 'destructive',
        });
        return;
      }

      const parsedHeaders = lines[0].split(',').map((h) => h.trim());
      const parsedData = lines.slice(1, 51).map((line) => {
        // Simple CSV parsing (for production, use a proper CSV parser library)
        return line.split(',').map((cell) => cell.trim());
      });

      setHeaders(parsedHeaders);
      setCsvData(parsedData);
      
      // Auto-map obvious columns
      const autoMapping: Record<string, string> = {};
      parsedHeaders.forEach((header) => {
        const normalized = header.toLowerCase().replace(/[_\s]/g, '');
        SYSTEM_FIELDS.forEach((field) => {
          const normalizedField = field.toLowerCase().replace(/[_\s]/g, '');
          if (normalized === normalizedField || normalized.includes(normalizedField)) {
            autoMapping[field] = header;
          }
        });
      });
      setColumnMapping(autoMapping);
      setStep('mapping');
    };

    reader.readAsText(file);
  };

  const handleValidateAndPreview = () => {
    const validated: ParsedRow[] = [];
    const existingVins = new Set(
      [...units, ...receivingItems]
        .map((u) => u.vin_or_serial?.toLowerCase())
        .filter(Boolean)
    );

    csvData.forEach((row, idx) => {
      const rowData: Record<string, string> = {};
      const errors: string[] = [];
      const warnings: string[] = [];

      // Map columns
      Object.entries(columnMapping).forEach(([systemField, csvHeader]) => {
        const colIndex = headers.indexOf(csvHeader);
        if (colIndex !== -1) {
          rowData[systemField] = row[colIndex];
        }
      });

      // Add default category if not mapped
      if (!rowData.category) {
        rowData.category = defaultCategory;
      }

      // Validations
      if (!rowData.make) errors.push('Make is required');
      if (!rowData.model) errors.push('Model is required');
      if (!rowData.type) errors.push('Type is required');
      
      if (rowData.year) {
        const year = parseInt(rowData.year);
        if (isNaN(year) || year < 1980 || year > currentYear + 1) {
          errors.push(`Year must be between 1980 and ${currentYear + 1}`);
        }
      } else {
        errors.push('Year is required');
      }

      if (rowData.vin_or_serial) {
        if (rowData.category === 'truck' && rowData.vin_or_serial.length !== 17) {
          warnings.push('Truck VIN should be exactly 17 characters');
        }
      } else {
        warnings.push('VIN/Serial is recommended');
      }

      if (rowData.mileage && isNaN(parseFloat(rowData.mileage))) {
        errors.push('Mileage must be a number');
      }

      if (rowData.axles && isNaN(parseInt(rowData.axles))) {
        errors.push('Axles must be a number');
      }

      // Duplicate check
      const isDuplicate = rowData.vin_or_serial
        ? existingVins.has(rowData.vin_or_serial.toLowerCase())
        : false;

      if (isDuplicate) {
        warnings.push('Duplicate VIN/Serial detected');
      }

      validated.push({
        rowIndex: idx,
        data: rowData,
        errors,
        warnings,
        isDuplicate,
      });
    });

    setParsedRows(validated);
    setStep('preview');
  };

  const handleImport = () => {
    let imported = 0;
    let skipped = 0;

    parsedRows.forEach((row) => {
      // Skip rows with errors, or duplicates if override not allowed
      if (row.errors.length > 0 || (row.isDuplicate && !allowOverride)) {
        skipped++;
        return;
      }

      const newItem: ReceivingItem = {
        id: Math.random().toString(36).substr(2, 9),
        acquisition_batch_id: batch.id,
        category: (row.data.category as UnitCategory) || defaultCategory,
        make: row.data.make || '',
        year: parseInt(row.data.year) || currentYear,
        model: row.data.model || '',
        color: row.data.color || undefined,
        mileage: row.data.mileage ? parseInt(row.data.mileage) : undefined,
        engine: row.data.engine || undefined,
        transmission: row.data.transmission || undefined,
        vin_or_serial: row.data.vin_or_serial || '',
        axles: row.data.axles ? parseInt(row.data.axles) : undefined,
        type: row.data.type || '',
        hours: row.data.hours ? parseInt(row.data.hours) : undefined,
        condition_report: {},
        cost_purchase: row.data.cost_purchase ? parseFloat(row.data.cost_purchase) : 0,
        cost_transport_in: row.data.cost_transport_in ? parseFloat(row.data.cost_transport_in) : 0,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addReceivingItem(newItem);
      imported++;
    });

    toast({
      title: 'Import complete',
      description: `Imported ${imported} units, skipped ${skipped} rows`,
    });

    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setColumnMapping({});
    setParsedRows([]);
    setAllowOverride(false);
    onOpenChange(false);
  };

  const downloadTemplate = (category: UnitCategory) => {
    let headers: string[];
    
    if (category === 'truck' || category === 'equipment') {
      headers = [
        'category',
        'make',
        'year',
        'model',
        'mileage',
        'engine',
        'transmission',
        'vin_or_serial',
        'axles',
        'type',
        'hours',
        'color',
        'cost_purchase',
        'cost_transport_in',
      ];
    } else {
      headers = [
        'category',
        'make',
        'year',
        'model',
        'color',
        'type',
        'hours',
        'vin_or_serial',
        'cost_purchase',
        'cost_transport_in',
      ];
    }

    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0 && (!r.isDuplicate || allowOverride));
  const errorRows = parsedRows.filter((r) => r.errors.length > 0);
  const duplicateRows = parsedRows.filter((r) => r.isDuplicate && r.errors.length === 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV Import Wizard</DialogTitle>
          <DialogDescription>
            Import units in bulk from CSV or Excel files
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            {/* Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Download Templates</CardTitle>
                <CardDescription>
                  Start with our recommended CSV templates for each category
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadTemplate('truck')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Trucks/Equipment Template
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadTemplate('trailer')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Trailers Template
                </Button>
              </CardContent>
            </Card>

            {/* Upload */}
            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Click to upload or drag and drop your CSV file
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Button asChild>
                  <label htmlFor="csv-upload">Choose File</label>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum 50 rows will be previewed. CSV must include headers.
              </p>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-6">
            {/* Default Category */}
            <div className="space-y-2">
              <Label>Default Category (if not in CSV)</Label>
              <Select value={defaultCategory} onValueChange={(v) => setDefaultCategory(v as UnitCategory)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="trailer">Trailer</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Column Mapping */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Map Columns</CardTitle>
                <CardDescription>
                  Map your CSV columns to system fields. Found {headers.length} columns in your file.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {SYSTEM_FIELDS.map((field) => (
                    <div key={field} className="space-y-2">
                      <Label>
                        {field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        {['make', 'year', 'model', 'type'].includes(field) && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      <Select
                        value={columnMapping[field] || ''}
                        onValueChange={(v) =>
                          setColumnMapping({ ...columnMapping, [field]: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Not mapped</SelectItem>
                          {headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Data Preview (First 5 Rows)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell key={cellIdx} className="text-sm">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleValidateAndPreview}>
                Validate & Preview
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{parsedRows.length}</div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
                  <div className="text-sm text-muted-foreground">Valid</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{errorRows.length}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{duplicateRows.length}</div>
                  <div className="text-sm text-muted-foreground">Duplicates</div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts */}
            {errorRows.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {errorRows.length} rows have errors and will be skipped during import
                </AlertDescription>
              </Alert>
            )}

            {duplicateRows.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    {duplicateRows.length} rows have duplicate VINs already in the system
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAllowOverride(!allowOverride)}
                  >
                    {allowOverride ? 'Prevent' : 'Allow'} Override
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Validation Results</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>VIN/Serial</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row) => (
                        <TableRow key={row.rowIndex}>
                          <TableCell>{row.rowIndex + 2}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {row.data.year} {row.data.make} {row.data.model}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.data.vin_or_serial || '-'}
                          </TableCell>
                          <TableCell>
                            {row.errors.length > 0 ? (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                <X className="h-3 w-3" />
                                Error
                              </Badge>
                            ) : row.isDuplicate ? (
                              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Duplicate
                              </Badge>
                            ) : (
                              <Badge className="flex items-center gap-1 w-fit bg-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Valid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {row.errors.map((error, idx) => (
                                <div key={idx} className="text-xs text-destructive">
                                  {error}
                                </div>
                              ))}
                              {row.warnings.map((warning, idx) => (
                                <div key={idx} className="text-xs text-orange-600">
                                  ⚠ {warning}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <Button onClick={handleImport} disabled={validRows.length === 0}>
                Import {validRows.length} Valid Units
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
