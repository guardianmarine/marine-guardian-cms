import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { Phone, Mail } from 'lucide-react';

export default function SellTrade() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-subtle py-16">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Sell or Trade Your Equipment</h1>
                <p className="text-xl text-muted-foreground">
                  Get top dollar for your trucks, trailers, and equipment
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Tell us about your equipment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Your Name *</Label>
                        <Input id="name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" type="email" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input id="phone" type="tel" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Input id="category" placeholder="Truck, Trailer, Equipment" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="year">Year</Label>
                        <Input id="year" placeholder="2020" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="make">Make</Label>
                        <Input id="make" placeholder="Freightliner" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Input id="model" placeholder="Cascadia" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        rows={4}
                        placeholder="Tell us about the condition, mileage, features, etc."
                        required
                      />
                    </div>

                    <Button type="submit" size="lg" className="w-full">
                      Submit Information
                    </Button>
                  </form>

                  <div className="mt-8 pt-8 border-t">
                    <h3 className="font-semibold mb-4">Prefer to speak with someone?</h3>
                    <div className="space-y-2">
                      <a
                        href={`tel:${t('common.phone')}`}
                        className="flex items-center text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {t('common.phone')}
                      </a>
                      <a
                        href="mailto:sales@guardianmarine.com"
                        className="flex items-center text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        sales@guardianmarine.com
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
