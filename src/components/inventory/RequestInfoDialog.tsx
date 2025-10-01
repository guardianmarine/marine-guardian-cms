import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Unit } from '@/types';
import { Phone, Mail, MessageCircle, CheckCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

interface RequestInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit;
}

const requestSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(100),
  email: z.string().trim().email({ message: 'Invalid email' }).max(255),
  phone: z.string().trim().max(50).optional(),
  preferred_contact: z.enum(['phone', 'email', 'whatsapp']).optional(),
  message: z.string().trim().max(1000).optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

// Helper: check if string is a valid UUID
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function RequestInfoDialog({ open, onOpenChange, unit }: RequestInfoDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<RequestFormData>({
    name: '',
    email: '',
    phone: '',
    preferred_contact: 'phone',
    message: `I'm interested in the ${unit.year} ${unit.make} ${unit.model}. Please contact me with more information.`,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    if (!formData.name?.trim() || !formData.email?.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('public.fillRequired', 'Please fill in all required fields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Normalize preferred_contact
      const preferred = (formData.preferred_contact || '').toString().trim().toLowerCase();
      const allowed = new Set(['phone', 'email', 'whatsapp']);
      const preferred_contact = allowed.has(preferred) ? preferred : null;

      // Build normalized payload
      const payload = {
        unit_id: unit?.id && isValidUUID(unit.id) ? unit.id : null, // Only send valid UUID
        request_type: 'info' as const,
        name: formData.name?.trim(),
        email: formData.email?.trim(),
        phone: formData.phone?.trim() || null,
        preferred_contact,
        message: formData.message?.trim() || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        // DO NOT send honey field - let it be null/empty
      };

      const { error } = await supabase.from('buyer_requests').insert(payload);

      setLoading(false);

      if (error) {
        console.error('buyer_requests insert error:', error);
        toast({
          title: t('common.error', 'Error'),
          description: error.message || (t('i18n.language') === 'es' 
            ? 'No se pudo enviar la solicitud.' 
            : 'Failed to submit request.'),
          variant: 'destructive',
        });
        return;
      }

      setSubmitted(true);
      toast({
        title: t('public.requestSent', 'Success!'),
        description: t('i18n.language') === 'es'
          ? '¡Gracias! Nuestro equipo te contactará en 1 día hábil.'
          : 'Thanks! Our team will contact you within 1 business day.',
      });
    } catch (error: any) {
      setLoading(false);
      console.error('Error submitting request:', error);
      toast({
        title: t('common.error', 'Error'),
        description: error?.message || (t('i18n.language') === 'es' 
          ? 'No se pudo enviar la solicitud.' 
          : 'Failed to submit request.'),
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    if (submitted) {
      setSubmitted(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        preferred_contact: 'phone',
        message: `I'm interested in the ${unit.year} ${unit.make} ${unit.model}. Please contact me with more information.`,
      });
    }
    onOpenChange(false);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <DialogTitle className="text-2xl mb-2">
              {t('public.requestSent', 'Request Sent!')}
            </DialogTitle>
            <DialogDescription className="text-base">
              {t(
                'public.requestSentDesc',
                'Thank you for your interest. Our team will contact you shortly.'
              )}
            </DialogDescription>
            <Button onClick={handleClose} className="mt-6" size="lg">
              {t('common.close', 'Close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('public.requestInfo', 'Request Information')}</DialogTitle>
          <DialogDescription>
            {unit.year} {unit.make} {unit.model}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('public.yourName', 'Your Name')} *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('public.namePlaceholder', 'John Doe')}
              required
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              {t('public.email', 'Email')} *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              required
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              {t('public.phone', 'Phone')}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(214) 613-8521"
              maxLength={50}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('public.preferredContact', 'Preferred Contact Method')}</Label>
            <RadioGroup
              value={formData.preferred_contact}
              onValueChange={(v: any) => setFormData({ ...formData, preferred_contact: v })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="phone" id="contact-phone" />
                <Label htmlFor="contact-phone" className="font-normal flex items-center cursor-pointer">
                  <Phone className="h-4 w-4 mr-1" />
                  {t('public.byPhone', 'Phone')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="contact-email" />
                <Label htmlFor="contact-email" className="font-normal flex items-center cursor-pointer">
                  <Mail className="h-4 w-4 mr-1" />
                  {t('public.byEmail', 'Email')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whatsapp" id="contact-whatsapp" />
                <Label htmlFor="contact-whatsapp" className="font-normal flex items-center cursor-pointer">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t('public.message', 'Message')} ({t('public.optional', 'Optional')})</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              maxLength={1000}
            />
            {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('public.sending', 'Sending...')}
                </>
              ) : (
                t('public.sendRequest', 'Send Request')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
