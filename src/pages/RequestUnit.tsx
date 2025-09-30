import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePurchasingStore } from '@/services/purchasingStore';
import { BuyerRequest, UnitCategory } from '@/types';
import { getTruckTypes, getTrailerTypes } from '@/lib/i18n-helpers';
import { Search, CheckCircle } from 'lucide-react';

export default function RequestUnit() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { addBuyerRequest } = usePurchasingStore();
  const [submitted, setSubmitted] = useState(false);

  const truckTypes = getTruckTypes(t);
  const trailerTypes = getTrailerTypes(t);

  const [formData, setFormData] = useState({
    requester_name: '',
    email: '',
    phone: '',
    category: '' as UnitCategory | '',
    desired_make: '',
    desired_model: '',
    desired_type: '',
    year_min: '',
    year_max: '',
    mileage_min: '',
    mileage_max: '',
    budget_min: '',
    budget_max: '',
    location_pref: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.requester_name || !formData.email || !formData.phone || !formData.category) {
      toast({
        title: t('common.error'),
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const request: BuyerRequest = {
      id: Math.random().toString(36).substr(2, 9),
      locale: i18n.language as 'en' | 'es',
      requester_name: formData.requester_name,
      email: formData.email,
      phone: formData.phone,
      category: formData.category as UnitCategory,
      desired_make: formData.desired_make || undefined,
      desired_model: formData.desired_model || undefined,
      desired_type: formData.desired_type || undefined,
      year_min: formData.year_min ? Number(formData.year_min) : undefined,
      year_max: formData.year_max ? Number(formData.year_max) : undefined,
      mileage_min: formData.mileage_min ? Number(formData.mileage_min) : undefined,
      mileage_max: formData.mileage_max ? Number(formData.mileage_max) : undefined,
      budget_min: formData.budget_min ? Number(formData.budget_min) : undefined,
      budget_max: formData.budget_max ? Number(formData.budget_max) : undefined,
      location_pref: formData.location_pref || undefined,
      notes: formData.notes || undefined,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addBuyerRequest(request);
    setSubmitted(true);
    toast({
      title: 'Request submitted',
      description: 'We will contact you soon with matching inventory.',
    });
  };

  if (submitted) {
    return (
      <>
        <Helmet>
          <title>{t('requestUnit.title')} - Guardian Marine & Truck</title>
        </Helmet>
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <h2 className="text-2xl font-bold mb-2">Request Received!</h2>
              <p className="text-muted-foreground mb-6">
                Thank you for your request. Our team will review your requirements and contact you
                soon with matching inventory.
              </p>
              <Button onClick={() => (window.location.href = '/')}>
                Back to Home
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
        <title>{t('requestUnit.title')} - Guardian Marine & Truck</title>
        <meta
          name="description"
          content="Looking for specific trucks, trailers, or equipment? Submit a request and we'll help you find it."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-subtle py-12">
        <div className="container px-4 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center mb-4">
                <Search className="h-8 w-8 mr-3 text-primary" />
                <div>
                  <CardTitle className="text-3xl">{t('requestUnit.title')}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {t('requestUnit.description')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="requester_name">Your Name *</Label>
                      <Input
                        id="requester_name"
                        value={formData.requester_name}
                        onChange={(e) =>
                          setFormData({ ...formData, requester_name: e.target.value })
                        }
                        required
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
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Unit Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">What are you looking for?</h3>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v as UnitCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="truck">{t('search.trucks')}</SelectItem>
                        <SelectItem value="trailer">{t('search.trailers')}</SelectItem>
                        <SelectItem value="equipment">{t('search.equipment')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="desired_make">Desired Make</Label>
                      <Input
                        id="desired_make"
                        value={formData.desired_make}
                        onChange={(e) => setFormData({ ...formData, desired_make: e.target.value })}
                        placeholder="e.g., Freightliner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desired_model">Desired Model</Label>
                      <Input
                        id="desired_model"
                        value={formData.desired_model}
                        onChange={(e) => setFormData({ ...formData, desired_model: e.target.value })}
                        placeholder="e.g., Cascadia"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desired_type">Type</Label>
                      {formData.category === 'truck' ? (
                        <Select
                          value={formData.desired_type}
                          onValueChange={(v) => setFormData({ ...formData, desired_type: v })}
                        >
                          <SelectTrigger>
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
                      ) : formData.category === 'trailer' ? (
                        <Select
                          value={formData.desired_type}
                          onValueChange={(v) => setFormData({ ...formData, desired_type: v })}
                        >
                          <SelectTrigger>
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
                          id="desired_type"
                          value={formData.desired_type}
                          onChange={(e) => setFormData({ ...formData, desired_type: e.target.value })}
                          placeholder="Equipment type"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Year Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={formData.year_min}
                          onChange={(e) => setFormData({ ...formData, year_min: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={formData.year_max}
                          onChange={(e) => setFormData({ ...formData, year_max: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Mileage Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={formData.mileage_min}
                          onChange={(e) =>
                            setFormData({ ...formData, mileage_min: e.target.value })
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={formData.mileage_max}
                          onChange={(e) =>
                            setFormData({ ...formData, mileage_max: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Budget Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min budget"
                        value={formData.budget_min}
                        onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Max budget"
                        value={formData.budget_max}
                        onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location_pref">Preferred Location</Label>
                    <Input
                      id="location_pref"
                      value={formData.location_pref}
                      onChange={(e) => setFormData({ ...formData, location_pref: e.target.value })}
                      placeholder="City, State"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional requirements or information..."
                      rows={4}
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
