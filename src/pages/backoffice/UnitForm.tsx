import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useUnitsSupabase, useUnitById } from '@/hooks/useUnitsSupabase';
import { useUnitPhotoUpload } from '@/hooks/useUnitPhotoUpload';
import { Unit, UnitCategory, UnitStatus, UnitPhoto } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getTruckTypes, getTrailerTypes } from '@/lib/i18n-helpers';
import { useVinDecode } from '@/hooks/useVinDecode';
import { VinDecodePanel } from '@/components/inventory/VinDecodePanel';
import { useAuth } from '@/contexts/AuthContext';
import { usePacLedger } from '@/hooks/usePacLedger';
import {
  Save,
  Upload,
  CheckCircle,
  XCircle,
  X,
  Star,
  GripVertical,
  Clock,
  AlertCircle,
  Scan,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function UnitForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { loading: vinLoading, error: vinError, result: vinResult, decodeVin, reset: resetVinDecode } = useVinDecode();

  // Supabase hooks
  const { unit: existingUnit, loading: loadingUnit } = useUnitById(id);
  const { addUnit, updateUnit, publishUnit, unpublishUnit } = useUnitsSupabase();
  const { uploading: uploadingPhotos, uploadMultiplePhotos, deletePhoto, getPathFromUrl } = useUnitPhotoUpload();
  const { recordPacChange } = usePacLedger({ autoFetch: false, showErrors: false });

  const isNew = !id;
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });

  // Get translated type options
  const truckTypes = getTruckTypes(t);
  const trailerTypes = getTrailerTypes(t);

  // Form state
  const [category, setCategory] = useState<UnitCategory>('truck');
  const [make, setMake] = useState('');
  const [year, setYear] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [mileage, setMileage] = useState('');
  const [engine, setEngine] = useState('');
  const [transmission, setTransmission] = useState('');
  const [vinOrSerial, setVinOrSerial] = useState('');
  const [axles, setAxles] = useState('');
  const [type, setType] = useState('');
  const [hours, setHours] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');
  const [costPurchase, setCostPurchase] = useState('');
  const [costTransportIn, setCostTransportIn] = useState('');
  const [costReconditioning, setCostReconditioning] = useState('');
  const [costPac, setCostPac] = useState('');
  const [previousCostPac, setPreviousCostPac] = useState(0);
  const [status, setStatus] = useState<UnitStatus>('draft');
  const [photos, setPhotos] = useState<UnitPhoto[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showVinPanel, setShowVinPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const currentYear = new Date().getFullYear();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Populate form from existing unit
  useEffect(() => {
    if (existingUnit) {
      setCategory(existingUnit.category || 'truck');
      setMake(existingUnit.make || '');
      setYear(existingUnit.year?.toString() || '');
      setModel(existingUnit.model || '');
      setColor(existingUnit.color || '');
      setMileage(existingUnit.mileage?.toString() || '');
      setEngine(existingUnit.engine || '');
      setTransmission(existingUnit.transmission || '');
      setVinOrSerial(existingUnit.vin_or_serial || '');
      setAxles(existingUnit.axles?.toString() || '');
      setType(existingUnit.type || '');
      setHours(existingUnit.hours?.toString() || '');
      setDisplayPrice(existingUnit.display_price?.toString() || '');
      setCostPurchase(existingUnit.cost_purchase?.toString() || '');
      setCostTransportIn(existingUnit.cost_transport_in?.toString() || '');
      setCostReconditioning(existingUnit.cost_reconditioning?.toString() || '');
      setCostPac(existingUnit.cost_pac?.toString() || '');
      setPreviousCostPac(existingUnit.cost_pac || 0);
      setStatus(existingUnit.status || 'draft');
      setPhotos(existingUnit.photos || []);
    }
  }, [existingUnit]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Year validation
    const yearNum = parseInt(year);
    if (!year || yearNum < 1980 || yearNum > currentYear + 1) {
      errors.year = `Year must be between 1980 and ${currentYear + 1}`;
    }

    // VIN validation for trucks
    if (category === 'truck' && vinOrSerial && vinOrSerial.length !== 17) {
      errors.vin = 'Truck VIN must be exactly 17 characters';
    }

    // Axles validation
    if (axles) {
      const axlesNum = parseInt(axles);
      if (axlesNum < 1 || axlesNum > 5) {
        errors.axles = 'Axles must be between 1 and 5';
      }
    }

    // Price validation
    const priceNum = parseFloat(displayPrice);
    if (!displayPrice || priceNum <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    // Required fields
    if (!make) errors.make = 'Make is required';
    if (!model) errors.model = 'Model is required';
    if (!type) errors.type = 'Type is required';
    if (!vinOrSerial) errors.vin = 'VIN/Serial is required';

    // Category-specific validation
    if (category === 'truck' || category === 'equipment') {
      if (!mileage) errors.mileage = 'Mileage is required';
      if (!engine) errors.engine = 'Engine is required';
      if (!transmission) errors.transmission = 'Transmission is required';
      if (!axles) errors.axles = 'Axles is required';
    }

    if (category === 'trailer' && !color) {
      errors.color = 'Color is required for trailers';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // For new units, we need to save first to get an ID for photo uploads
  const effectiveUnitId = id || 'temp-' + Date.now();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    disabled: uploadingPhotos,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      // Upload to Supabase Storage
      setUploadProgress({ completed: 0, total: acceptedFiles.length });
      
      const results = await uploadMultiplePhotos(
        acceptedFiles,
        effectiveUnitId,
        (completed, total) => setUploadProgress({ completed, total })
      );

      // Add uploaded photos to state
      const newPhotos: UnitPhoto[] = results.map((result, idx) => ({
        id: Math.random().toString(36).substr(2, 9),
        unit_id: id || 'new',
        url: result.url,
        is_main: photos.length === 0 && idx === 0,
        sort: photos.length + idx,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      setPhotos((prev) => [...prev, ...newPhotos]);
      setUploadProgress({ completed: 0, total: 0 });
    },
  });

  const handleSave = async () => {
    if (!validateForm()) {
      const errorMessages = Object.values(validationErrors).slice(0, 3);
      const remainingCount = Object.keys(validationErrors).length - 3;
      toast({
        title: 'Validation errors',
        description: errorMessages.join('. ') + (remainingCount > 0 ? ` (+${remainingCount} more)` : ''),
        variant: 'destructive',
      });
      // Switch to details tab if errors exist
      setActiveTab('details');
      return;
    }

    setSaving(true);

    const unitData: Partial<Unit> = {
      category,
      make,
      year: parseInt(year),
      model,
      color: color || undefined,
      mileage: mileage ? parseInt(mileage) : undefined,
      engine: engine || undefined,
      transmission: transmission || undefined,
      vin_or_serial: vinOrSerial,
      axles: axles ? parseInt(axles) : undefined,
      type,
      hours: hours ? parseInt(hours) : undefined,
      display_price: parseFloat(displayPrice) || 0,
      cost_purchase: costPurchase ? parseFloat(costPurchase) : undefined,
      cost_transport_in: costTransportIn ? parseFloat(costTransportIn) : undefined,
      cost_reconditioning: costReconditioning ? parseFloat(costReconditioning) : undefined,
      cost_pac: user?.role === 'admin' && costPac ? parseFloat(costPac) : existingUnit?.cost_pac,
      status,
      photos,
      received_at: existingUnit?.received_at || new Date().toISOString().split('T')[0],
    };

    try {
      if (isNew) {
        const result = await addUnit(unitData);
        if (result) {
          // Record PAC ledger entry for new unit if PAC was set
          const newPac = parseFloat(costPac) || 0;
          if (user?.role === 'admin' && newPac > 0) {
            await recordPacChange(result.id, newPac, 0);
          }
          toast({ title: 'Unit created', description: 'Unit has been saved to database' });
          navigate(`/backoffice/inventory/${result.id}`);
        }
      } else if (id) {
        const result = await updateUnit(id, unitData);
        if (result) {
          // Record PAC ledger entry if PAC changed
          const newPac = parseFloat(costPac) || 0;
          if (user?.role === 'admin' && newPac !== previousCostPac) {
            await recordPacChange(id, newPac, previousCostPac);
            setPreviousCostPac(newPac);
          }
          toast({ title: 'Unit updated', description: 'Changes saved successfully' });
          // Update local state with DB response
          setStatus(result.status);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id) {
      toast({
        title: 'Cannot publish',
        description: 'Please save the unit first',
        variant: 'destructive',
      });
      return;
    }

    // Basic validation for publishing
    const errors: string[] = [];
    if (photos.length < 4) errors.push('At least 4 photos required');
    if (!make) errors.push('Make is required');
    if (!model) errors.push('Model is required');
    if (!displayPrice || parseFloat(displayPrice) <= 0) errors.push('Valid price required');

    if (errors.length > 0) {
      toast({
        title: 'Cannot publish',
        description: errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const success = await publishUnit(id);
      if (success) {
        setStatus('published');
        toast({ title: 'Unit published', description: 'Unit is now live on the website' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!id) return;

    setSaving(true);
    try {
      const success = await unpublishUnit(id);
      if (success) {
        setStatus('draft');
        toast({ title: 'Unit unpublished', description: 'Unit moved back to draft' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (photo && photo.url.includes('supabase')) {
      // Delete from storage if it's a Supabase URL
      const path = getPathFromUrl(photo.url);
      if (path) {
        await deletePhoto(path);
      }
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleSetMainPhoto = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) => ({ ...p, is_main: p.id === photoId }))
    );
  };

  const handlePhotoDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setPhotos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
          ...item,
          sort: idx,
        }));
      });
    }
  };

  const handleDecodeVin = async () => {
    if (category === 'truck' && vinOrSerial.length !== 17) {
      toast({
        title: t('vinDecode.error'),
        description: t('vinDecode.truckVinLength'),
        variant: 'destructive',
      });
      return;
    }

    if (!vinOrSerial) {
      toast({
        title: t('vinDecode.error'),
        description: t('vinDecode.vinRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await decodeVin(vinOrSerial, year || undefined);
      setShowVinPanel(true);
    } catch (error) {
      toast({
        title: t('vinDecode.error'),
        description: vinError || t('vinDecode.decodeFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleApplyVinFields = (selectedFields: any) => {
    if (!vinResult) return;

    const updates: string[] = [];

    if (selectedFields.make && vinResult.make) {
      setMake(vinResult.make);
      updates.push('make');
    }
    if (selectedFields.model && vinResult.model) {
      setModel(vinResult.model);
      updates.push('model');
    }
    if (selectedFields.year && vinResult.year) {
      setYear(vinResult.year);
      updates.push('year');
    }
    if (selectedFields.engine && vinResult.engine) {
      setEngine(vinResult.engine);
      updates.push('engine');
    }
    if (selectedFields.transmission && vinResult.transmission) {
      setTransmission(vinResult.transmission);
      updates.push('transmission');
    }
    if (selectedFields.axles && vinResult.axles) {
      setAxles(vinResult.axles);
      updates.push('axles');
    }

    toast({
      title: t('vinDecode.success'),
      description: t('vinDecode.fieldsApplied', { count: updates.length }),
    });

    resetVinDecode();
  };

  const canDecodeVin = user?.role === 'inventory' || user?.role === 'admin';

  // Loading state for edit mode
  if (!isNew && loadingUnit) {
    return (
      <BackofficeLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">{isNew ? 'Add New Unit' : 'Edit Unit'}</h2>
            <p className="text-muted-foreground">
              {isNew ? 'Create a new inventory unit' : 'Update unit information'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => navigate('/backoffice/inventory')}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
            {!isNew && status === 'published' && (
              <Button onClick={handleUnpublish} variant="outline" disabled={saving}>
                <XCircle className="h-4 w-4 mr-2" />
                Unpublish
              </Button>
            )}
            {!isNew && status !== 'published' && (
              <Button onClick={handlePublish} variant="default" disabled={saving}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* Validation Status */}
        {!isNew && photos.length < 4 && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Cannot publish - issues found:</p>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                    {photos.length < 4 && <li>Unit must have at least 4 photos</li>}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Unit Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Category & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as UnitCategory)} disabled={!isNew}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="trailer">Trailer</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as UnitStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year * (1980-{currentYear + 1})</Label>
                    <Input
                      id="year"
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="2020"
                      className={validationErrors.year ? 'border-destructive' : ''}
                    />
                    {validationErrors.year && (
                      <p className="text-xs text-destructive">{validationErrors.year}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="make">Make *</Label>
                    <Input
                      id="make"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      placeholder="Freightliner"
                      className={validationErrors.make ? 'border-destructive' : ''}
                    />
                    {validationErrors.make && (
                      <p className="text-xs text-destructive">{validationErrors.make}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Cascadia"
                      className={validationErrors.model ? 'border-destructive' : ''}
                    />
                    {validationErrors.model && (
                      <p className="text-xs text-destructive">{validationErrors.model}</p>
                    )}
                  </div>
                </div>

                {/* Type & Color */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    {category === 'truck' ? (
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger className={validationErrors.type ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {truckTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : category === 'trailer' ? (
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger className={validationErrors.type ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {trailerTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        placeholder="Telehandler, Forklift, etc."
                        className={validationErrors.type ? 'border-destructive' : ''}
                      />
                    )}
                    {validationErrors.type && (
                      <p className="text-xs text-destructive">{validationErrors.type}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color {category === 'trailer' && '*'}</Label>
                    <Input
                      id="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="White"
                      className={validationErrors.color ? 'border-destructive' : ''}
                    />
                    {validationErrors.color && (
                      <p className="text-xs text-destructive">{validationErrors.color}</p>
                    )}
                  </div>
                </div>

                {/* Truck/Equipment specific fields */}
                {(category === 'truck' || category === 'equipment') && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="engine">Engine *</Label>
                        <Input
                          id="engine"
                          value={engine}
                          onChange={(e) => setEngine(e.target.value)}
                          placeholder="Detroit DD15"
                          className={validationErrors.engine ? 'border-destructive' : ''}
                        />
                        {validationErrors.engine && (
                          <p className="text-xs text-destructive">{validationErrors.engine}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transmission">Transmission *</Label>
                        <Input
                          id="transmission"
                          value={transmission}
                          onChange={(e) => setTransmission(e.target.value)}
                          placeholder="Automated Manual"
                          className={validationErrors.transmission ? 'border-destructive' : ''}
                        />
                        {validationErrors.transmission && (
                          <p className="text-xs text-destructive">{validationErrors.transmission}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mileage">Mileage *</Label>
                        <Input
                          id="mileage"
                          type="number"
                          value={mileage}
                          onChange={(e) => setMileage(e.target.value)}
                          placeholder="285000"
                          min="0"
                          className={validationErrors.mileage ? 'border-destructive' : ''}
                        />
                        {validationErrors.mileage && (
                          <p className="text-xs text-destructive">{validationErrors.mileage}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="axles">Number of Axles * (1-5)</Label>
                        <Input
                          id="axles"
                          type="number"
                          value={axles}
                          onChange={(e) => setAxles(e.target.value)}
                          placeholder="3"
                          min="1"
                          max="5"
                          className={validationErrors.axles ? 'border-destructive' : ''}
                        />
                        {validationErrors.axles && (
                          <p className="text-xs text-destructive">{validationErrors.axles}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* VIN, Hours, Price */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vin">
                      VIN/Serial * {category === 'truck' && '(17 chars)'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="vin"
                        value={vinOrSerial}
                        onChange={(e) => setVinOrSerial(e.target.value)}
                        placeholder="1FUJGEDV8LLBX1234"
                        className={`font-mono ${validationErrors.vin ? 'border-destructive' : ''}`}
                        maxLength={category === 'truck' ? 17 : undefined}
                      />
                      {canDecodeVin && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleDecodeVin}
                          disabled={vinLoading || !vinOrSerial}
                          title={t('vinDecode.decodeButton')}
                        >
                          {vinLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Scan className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    {validationErrors.vin && (
                      <p className="text-xs text-destructive">{validationErrors.vin}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours">
                      Hours <Badge variant="secondary">Internal Only</Badge>
                    </Label>
                    <Input
                      id="hours"
                      type="number"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="12500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Display Price * (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={displayPrice}
                      className={validationErrors.price ? 'border-destructive' : ''}
                      onChange={(e) => setDisplayPrice(e.target.value)}
                      placeholder="89500"
                      min="0"
                      step="0.01"
                    />
                    {validationErrors.price && (
                      <p className="text-xs text-destructive">{validationErrors.price}</p>
                    )}
                  </div>
                </div>

                {/* Cost Tracking (Internal) */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    Cost Tracking <Badge variant="secondary">Internal Only</Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost_purchase">Purchase Cost (USD)</Label>
                      <Input
                        id="cost_purchase"
                        type="number"
                        value={costPurchase}
                        onChange={(e) => setCostPurchase(e.target.value)}
                        placeholder="75000"
                        min="0"
                        step="0.01"
                      />
                      <p className="text-xs text-muted-foreground">
                        Initial purchase/acquisition cost
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost_transport_in">Transport In (USD)</Label>
                      <Input
                        id="cost_transport_in"
                        type="number"
                        value={costTransportIn}
                        onChange={(e) => setCostTransportIn(e.target.value)}
                        placeholder="2500"
                        min="0"
                        step="0.01"
                      />
                      <p className="text-xs text-muted-foreground">
                        Inbound shipping/transport cost
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost_reconditioning">Reconditioning (USD)</Label>
                      <Input
                        id="cost_reconditioning"
                        type="number"
                        value={costReconditioning}
                        onChange={(e) => setCostReconditioning(e.target.value)}
                        placeholder="5000"
                        min="0"
                        step="0.01"
                      />
                      <p className="text-xs text-muted-foreground">
                        Parts, labor, and repairs
                      </p>
                    </div>
                    {/* PAC Field - Admin Only */}
                    {user?.role === 'admin' && (
                      <div className="space-y-2">
                        <Label htmlFor="cost_pac" className="flex items-center gap-2">
                          PAC <Badge variant="outline" className="text-xs">Admin Only</Badge>
                        </Label>
                        <Input
                          id="cost_pac"
                          type="number"
                          value={costPac}
                          onChange={(e) => setCostPac(e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                        <p className="text-xs text-muted-foreground">
                          Variable PAC cost
                        </p>
                      </div>
                    )}
                  </div>
                  {(costPurchase || costTransportIn || costReconditioning || costPac) && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Acquisition Cost:</span>
                        <span className="text-xl font-bold">
                          ${(
                            (parseFloat(costPurchase) || 0) +
                            (parseFloat(costTransportIn) || 0) +
                            (parseFloat(costReconditioning) || 0) +
                            (parseFloat(costPac) || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                      {user?.role === 'admin' && parseFloat(costPac) > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Includes PAC: ${(parseFloat(costPac) || 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle>Photos (Min. 4 required to publish)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Progress */}
                {uploadingPhotos && uploadProgress.total > 0 && (
                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading photos...
                      </span>
                      <span>{uploadProgress.completed} / {uploadProgress.total}</span>
                    </div>
                    <Progress value={(uploadProgress.completed / uploadProgress.total) * 100} />
                  </div>
                )}

                {/* Upload Area */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    uploadingPhotos ? 'opacity-50 pointer-events-none' : ''
                  } ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                >
                  <input {...getInputProps()} />
                  {uploadingPhotos ? (
                    <Loader2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
                  ) : (
                    <ImageIcon className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium mb-1">
                    {uploadingPhotos
                      ? 'Uploading...'
                      : isDragActive
                      ? 'Drop files here'
                      : 'Drag & drop photos or click to browse'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WebP up to 10MB • Photos are uploaded to cloud storage
                  </p>
                </div>

                {/* Photo Grid */}
                {photos.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handlePhotoDragEnd}
                  >
                    <SortableContext items={photos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {photos.map((photo) => (
                          <SortablePhotoItem
                            key={photo.id}
                            photo={photo}
                            onRemove={handleRemovePhoto}
                            onSetMain={handleSetMainPhoto}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* VIN Decode Panel */}
      <VinDecodePanel
        open={showVinPanel}
        onOpenChange={setShowVinPanel}
        result={vinResult}
        onApplySelected={handleApplyVinFields}
      />
    </BackofficeLayout>
  );
}

function SortablePhotoItem({
  photo,
  onRemove,
  onSetMain,
}: {
  photo: UnitPhoto;
  onRemove: (id: string) => void;
  onSetMain: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
        <img src={photo.url} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
        <button
          {...attributes}
          {...listeners}
          className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors cursor-grab"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-white" />
        </button>
        <button
          onClick={() => onSetMain(photo.id)}
          className={`p-2 rounded-lg transition-colors ${
            photo.is_main ? 'bg-yellow-500' : 'bg-white/20 hover:bg-white/30'
          }`}
          title={photo.is_main ? 'Main photo' : 'Set as main'}
        >
          <Star className={`h-4 w-4 ${photo.is_main ? 'text-white fill-white' : 'text-white'}`} />
        </button>
        <button
          onClick={() => onRemove(photo.id)}
          className="p-2 bg-red-500/80 rounded-lg hover:bg-red-600 transition-colors"
          title="Remove photo"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      {photo.is_main && (
        <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">Main</Badge>
      )}
    </div>
  );
}
