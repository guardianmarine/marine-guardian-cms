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
  phone: z.string().trim().min(10, { message: 'Phone number is required' }).max(20),
  preferred_contact: z.enum(['phone', 'email', 'whatsapp']),
  message: z.string().trim().max(1000).optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

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

    try {
      requestSchema.parse(formData);
      setLoading(true);

      // Insert into Supabase
      const { error } = await supabase.from('buyer_requests').insert({
        unit_id: unit.id,
        request_type: 'info',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        preferred_contact: formData.preferred_contact,
        message: formData.message || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        honey: '', // honeypot (empty)
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: t('public.requestSent', 'Request Sent'),
        description: t('public.requestSentDesc', 'We will contact you shortly'),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('Error submitting request:', error);
        toast({
          title: t('common.error'),
          description: 'Failed to submit request. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
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
              {t('public.phone', 'Phone')} *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(214) 613-8521"
              required
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
