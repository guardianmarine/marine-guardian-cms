import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, CheckCircle, Loader2 } from 'lucide-react';

export default function RequestAUnit() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    honey: '', // honeypot
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name?.trim() || !formData.email?.trim()) {
      toast.error(
        i18n.language === 'es'
          ? 'Por favor completa todos los campos requeridos'
          : 'Please fill in all required fields'
      );
      return;
    }

    // Honeypot check
    if (formData.honey && formData.honey.trim() !== '') {
      console.warn('Honeypot triggered');
      setSubmitted(true); // Fake success
      return;
    }

    setLoading(true);

    try {
      // Build normalized payload
      const payload = {
        unit_id: null, // wish requests don't have a unit
        request_type: 'wish' as const,
        name: formData.name?.trim(),
        email: formData.email?.trim(),
        phone: formData.phone?.trim() || null,
        preferred_contact: null, // not collected in this form
        message: formData.message?.trim() || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        // DO NOT send honey field
      };

      const { error } = await supabase.from('buyer_requests').insert(payload);

      setLoading(false);

      if (error) {
        console.error('buyer_requests insert error:', error);
        toast.error(
          error.message || (i18n.language === 'es'
            ? 'No se pudo enviar la solicitud.'
            : 'Failed to submit request.')
        );
        return;
      }

      toast.success(
        i18n.language === 'es'
          ? '¡Gracias! Nuestro equipo te contactará en 1 día hábil.'
          : 'Thanks! Our team will contact you within 1 business day.'
      );
      setSubmitted(true);
    } catch (error: any) {
      setLoading(false);
      console.error('Error submitting request:', error);
      toast.error(
        error?.message || (i18n.language === 'es'
          ? 'No se pudo enviar la solicitud.'
          : 'Failed to submit request.')
      );
    }
  };

  if (submitted) {
    return (
      <>
        <Helmet>
          <title>
            {i18n.language === 'es' ? 'Solicitar una Unidad' : 'Request a Unit'} - Guardian Marine & Truck
          </title>
        </Helmet>
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <h2 className="text-2xl font-bold mb-2">
                {i18n.language === 'es' ? '¡Solicitud Recibida!' : 'Request Received!'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {i18n.language === 'es'
                  ? 'Nuestro equipo te contactará en 1 día hábil.'
                  : 'Our team will contact you within 1 business day.'}
              </p>
              <Button onClick={() => (window.location.href = '/')}>
                {i18n.language === 'es' ? 'Volver al Inicio' : 'Back to Home'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {i18n.language === 'es' ? 'Solicitar una Unidad' : 'Request a Unit'} - Guardian Marine & Truck
        </title>
        <meta
          name="description"
          content={
            i18n.language === 'es'
              ? 'No encuentras lo que buscas? Cuéntanos qué necesitas y te ayudaremos a encontrarlo.'
              : "Can't find what you need? Tell us what you're looking for and we'll help you find it."
          }
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-subtle py-12">
        <div className="container px-4 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center mb-4">
                <Search className="h-8 w-8 mr-3 text-primary" />
                <div>
                  <CardTitle className="text-3xl">
                    {i18n.language === 'es' ? '¿Buscas algo específico?' : 'Looking for something specific?'}
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    {i18n.language === 'es'
                      ? 'No encuentras lo que necesitas? Cuéntanos y te ayudaremos a encontrarlo.'
                      : "Can't find what you need? Let us know and we'll help you find it."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Honeypot field (hidden) */}
                <input
                  type="text"
                  name="honey"
                  value={formData.honey}
                  onChange={(e) => setFormData({ ...formData, honey: e.target.value })}
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {i18n.language === 'es' ? 'Nombre' : 'Name'} *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      {i18n.language === 'es' ? 'Teléfono' : 'Phone'}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">
                      {i18n.language === 'es' ? 'Mensaje' : 'Message'}
                    </Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder={
                        i18n.language === 'es'
                          ? 'Describe qué tipo de unidad estás buscando...'
                          : 'Describe what type of unit you are looking for...'
                      }
                      rows={4}
                      maxLength={1000}
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {i18n.language === 'es' ? 'Enviando...' : 'Submitting...'}
                    </>
                  ) : (
                    i18n.language === 'es' ? 'Enviar Solicitud' : 'Submit Request'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
