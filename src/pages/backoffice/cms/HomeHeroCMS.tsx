import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Send, Upload, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type HeroSettings = {
  id?: string;
  locale: 'en' | 'es';
  hero_title: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_cta_url: string;
  hero_image_desktop_url: string;
  hero_image_mobile_url: string;
  hero_overlay_opacity: number;
  hero_alignment: 'left' | 'center' | 'right';
  hero_show_search: boolean;
  is_published: boolean;
  published_at?: string;
  updated_at?: string;
};

export default function HomeHeroCMS() {
  const { t, i18n } = useTranslation();
  const [activeLocale, setActiveLocale] = useState<'en' | 'es'>('en');
  const [settings, setSettings] = useState<Record<'en' | 'es', HeroSettings>>({
    en: getDefaultSettings('en'),
    es: getDefaultSettings('es'),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [useSameImage, setUseSameImage] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  function getDefaultSettings(locale: 'en' | 'es'): HeroSettings {
    return {
      locale,
      hero_title: locale === 'en' 
        ? 'Premium Heavy-Duty Trucks & Trailers'
        : 'Camiones y Remolques Premium de Servicio Pesado',
      hero_subtitle: locale === 'en'
        ? 'Quality commercial vehicles for your business needs'
        : 'Vehículos comerciales de calidad para las necesidades de su negocio',
      hero_cta_label: locale === 'en' ? 'Browse Inventory' : 'Ver Inventario',
      hero_cta_url: '/inventory',
      hero_image_desktop_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&q=80',
      hero_image_mobile_url: '',
      hero_overlay_opacity: 0.5,
      hero_alignment: 'center',
      hero_show_search: true,
      is_published: false,
    };
  }

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch latest settings for both locales
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const enSettings = data?.find(s => s.locale === 'en') || getDefaultSettings('en');
      const esSettings = data?.find(s => s.locale === 'es') || getDefaultSettings('es');

      setSettings({
        en: enSettings as HeroSettings,
        es: esSettings as HeroSettings,
      });

      // Check if mobile images are the same as desktop to set useSameImage
      if (enSettings.hero_image_mobile_url === enSettings.hero_image_desktop_url ||
          !enSettings.hero_image_mobile_url) {
        setUseSameImage(true);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast.error(error?.message ?? 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async (
    file: File,
    type: 'desktop' | 'mobile',
    locale: 'en' | 'es'
  ) => {
    try {
      const setUploading = type === 'desktop' ? setUploadingDesktop : setUploadingMobile;
      setUploading(true);

      // Generate a unique filename
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filename = `hero/hero-${locale}-${type}-${timestamp}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filename);

      // Update local state
      setSettings(prev => ({
        ...prev,
        [locale]: {
          ...prev[locale],
          [type === 'desktop' ? 'hero_image_desktop_url' : 'hero_image_mobile_url']: publicUrl,
        },
      }));

      toast.success(`${type === 'desktop' ? 'Desktop' : 'Mobile'} image uploaded successfully`);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error?.message ?? 'Failed to upload image');
    } finally {
      const setUploading = type === 'desktop' ? setUploadingDesktop : setUploadingMobile;
      setUploading(false);
    }
  };

  const handleSave = async (publish: boolean = false) => {
    try {
      setSaving(true);
      const currentSettings = settings[activeLocale];

      // Validate required fields
      if (!currentSettings.hero_title || !currentSettings.hero_subtitle) {
        toast.error('Title and subtitle are required');
        return;
      }

      // If using same image, copy desktop to mobile
      const mobileUrl = useSameImage 
        ? currentSettings.hero_image_desktop_url 
        : currentSettings.hero_image_mobile_url;

      const payload = {
        locale: activeLocale,
        hero_title: currentSettings.hero_title,
        hero_subtitle: currentSettings.hero_subtitle,
        hero_cta_label: currentSettings.hero_cta_label,
        hero_cta_url: currentSettings.hero_cta_url,
        hero_image_desktop_url: currentSettings.hero_image_desktop_url,
        hero_image_mobile_url: mobileUrl,
        hero_overlay_opacity: currentSettings.hero_overlay_opacity,
        hero_alignment: currentSettings.hero_alignment,
        hero_show_search: currentSettings.hero_show_search,
        is_published: publish,
        published_at: publish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      // If we have an ID, update; otherwise insert
      if (currentSettings.id) {
        const { error } = await supabase
          .from('site_settings')
          .update(payload)
          .eq('id', currentSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert([payload]);

        if (error) throw error;
      }

      toast.success(publish ? 'Settings published successfully!' : 'Draft saved successfully!');
      
      // Reload settings to get updated data
      await loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof HeroSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [activeLocale]: {
        ...prev[activeLocale],
        [key]: value,
      },
    }));
  };

  const currentSettings = settings[activeLocale];

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6">
          <h2 className="text-3xl font-bold mb-6">
            {i18n.language === 'es' ? 'CMS - Hero Home' : 'CMS - Home Hero'}
          </h2>
          <p className="text-muted-foreground">
            {i18n.language === 'es' ? 'Cargando...' : 'Loading...'}
          </p>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">
              {i18n.language === 'es' ? 'CMS - Hero Home' : 'CMS - Home Hero'}
            </h2>
            <p className="text-muted-foreground">
              {i18n.language === 'es'
                ? 'Gestionar el hero de la página principal con soporte multiidioma'
                : 'Manage the home page hero with multi-language support'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentSettings.is_published && (
              <Badge variant="outline" className="text-green-600">
                {i18n.language === 'es' ? 'Publicado' : 'Published'}
                {currentSettings.published_at && (
                  <span className="ml-1 text-xs">
                    ({formatDistanceToNow(new Date(currentSettings.published_at), { addSuffix: true })})
                  </span>
                )}
              </Badge>
            )}
            {!currentSettings.is_published && (
              <Badge variant="secondary">
                {i18n.language === 'es' ? 'Borrador' : 'Draft'}
              </Badge>
            )}
          </div>
        </div>

        {/* Language Tabs */}
        <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as 'en' | 'es')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="en">
              English {settings.en.is_published && '✓'}
            </TabsTrigger>
            <TabsTrigger value="es">
              Español {settings.es.is_published && '✓'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeLocale} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Form */}
              <div className="space-y-6">
                {/* Images */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {i18n.language === 'es' ? 'Imágenes' : 'Images'}
                    </CardTitle>
                    <CardDescription>
                      {i18n.language === 'es'
                        ? 'Sube imágenes para escritorio y móvil'
                        : 'Upload images for desktop and mobile'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Desktop Image */}
                    <div className="space-y-2">
                      <Label>
                        {i18n.language === 'es' ? 'Imagen de Escritorio' : 'Desktop Image'}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadImage(file, 'desktop', activeLocale);
                          }}
                          disabled={uploadingDesktop}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={uploadingDesktop}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                      {currentSettings.hero_image_desktop_url && (
                        <img
                          src={currentSettings.hero_image_desktop_url}
                          alt="Desktop preview"
                          className="w-full h-32 object-cover rounded border"
                        />
                      )}
                    </div>

                    {/* Use same image toggle */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use-same-image"
                        checked={useSameImage}
                        onCheckedChange={setUseSameImage}
                      />
                      <Label htmlFor="use-same-image">
                        {i18n.language === 'es'
                          ? 'Usar imagen de escritorio en móvil'
                          : 'Use desktop image on mobile'}
                      </Label>
                    </div>

                    {/* Mobile Image */}
                    {!useSameImage && (
                      <div className="space-y-2">
                        <Label>
                          {i18n.language === 'es' ? 'Imagen Móvil' : 'Mobile Image'}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadImage(file, 'mobile', activeLocale);
                            }}
                            disabled={uploadingMobile}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={uploadingMobile}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                        {currentSettings.hero_image_mobile_url && (
                          <img
                            src={currentSettings.hero_image_mobile_url}
                            alt="Mobile preview"
                            className="w-full h-32 object-cover rounded border"
                          />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Text Content */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {i18n.language === 'es' ? 'Contenido' : 'Content'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        {i18n.language === 'es' ? 'Título' : 'Title'}
                      </Label>
                      <Input
                        id="title"
                        value={currentSettings.hero_title}
                        onChange={(e) => updateSetting('hero_title', e.target.value)}
                        placeholder="Enter hero title"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subtitle">
                        {i18n.language === 'es' ? 'Subtítulo' : 'Subtitle'}
                      </Label>
                      <Textarea
                        id="subtitle"
                        value={currentSettings.hero_subtitle}
                        onChange={(e) => updateSetting('hero_subtitle', e.target.value)}
                        placeholder="Enter hero subtitle"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cta-label">
                        {i18n.language === 'es' ? 'Etiqueta CTA' : 'CTA Label'}
                      </Label>
                      <Input
                        id="cta-label"
                        value={currentSettings.hero_cta_label}
                        onChange={(e) => updateSetting('hero_cta_label', e.target.value)}
                        placeholder="Browse Inventory"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cta-url">
                        {i18n.language === 'es' ? 'URL CTA' : 'CTA URL'}
                      </Label>
                      <Input
                        id="cta-url"
                        value={currentSettings.hero_cta_url}
                        onChange={(e) => updateSetting('hero_cta_url', e.target.value)}
                        placeholder="/inventory"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Layout Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {i18n.language === 'es' ? 'Diseño' : 'Layout'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>
                        {i18n.language === 'es' ? 'Opacidad del Overlay' : 'Overlay Opacity'}
                        {' '}({Math.round(currentSettings.hero_overlay_opacity * 100)}%)
                      </Label>
                      <Slider
                        value={[currentSettings.hero_overlay_opacity * 100]}
                        onValueChange={(v) => updateSetting('hero_overlay_opacity', v[0] / 100)}
                        min={0}
                        max={80}
                        step={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {i18n.language === 'es' ? 'Alineación' : 'Alignment'}
                      </Label>
                      <Select
                        value={currentSettings.hero_alignment}
                        onValueChange={(v) => updateSetting('hero_alignment', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">
                            {i18n.language === 'es' ? 'Izquierda' : 'Left'}
                          </SelectItem>
                          <SelectItem value="center">
                            {i18n.language === 'es' ? 'Centro' : 'Center'}
                          </SelectItem>
                          <SelectItem value="right">
                            {i18n.language === 'es' ? 'Derecha' : 'Right'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-search"
                        checked={currentSettings.hero_show_search}
                        onCheckedChange={(v) => updateSetting('hero_show_search', v)}
                      />
                      <Label htmlFor="show-search">
                        {i18n.language === 'es'
                          ? 'Mostrar caja de búsqueda'
                          : 'Show search box'}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Preview */}
              <div>
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      {i18n.language === 'es' ? 'Vista Previa' : 'Preview'}
                    </CardTitle>
                    <CardDescription>
                      {i18n.language === 'es'
                        ? 'Cómo se verá el hero en el sitio público'
                        : 'How the hero will look on the public site'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative aspect-video rounded-lg overflow-hidden border">
                      <img
                        src={currentSettings.hero_image_desktop_url}
                        alt="Hero preview"
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(to right, rgba(0,0,0,${currentSettings.hero_overlay_opacity}), rgba(0,0,0,${currentSettings.hero_overlay_opacity * 0.7}), transparent)`,
                        }}
                      />
                      <div
                        className={`absolute inset-0 flex flex-col justify-center p-8 text-white ${
                          currentSettings.hero_alignment === 'left'
                            ? 'items-start text-left'
                            : currentSettings.hero_alignment === 'right'
                            ? 'items-end text-right'
                            : 'items-center text-center'
                        }`}
                      >
                        <h1 className="text-2xl font-bold mb-2">
                          {currentSettings.hero_title}
                        </h1>
                        <p className="text-sm mb-4 opacity-90 max-w-md">
                          {currentSettings.hero_subtitle}
                        </p>
                        {currentSettings.hero_cta_label && (
                          <Button size="sm" variant="secondary">
                            {currentSettings.hero_cta_label}
                          </Button>
                        )}
                        {currentSettings.hero_show_search && (
                          <div className="mt-4 p-3 bg-white/10 backdrop-blur rounded text-xs">
                            {i18n.language === 'es' ? '🔍 Búsqueda aquí' : '🔍 Search box here'}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {i18n.language === 'es' ? 'Guardar Borrador' : 'Save Draft'}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <Send className="h-4 w-4 mr-2" />
                {i18n.language === 'es' ? 'Publicar' : 'Publish'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}
