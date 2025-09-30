import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCRMStore } from '@/services/crmStore';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { AccountKind } from '@/types';

export default function AccountForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { addAccount, updateAccount, getAccount } = useCRMStore();

  const [formData, setFormData] = useState({
    name: '',
    kind: 'company' as AccountKind,
    tax_id: '',
    billing_address: '',
    billing_state: '',
    billing_country: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
    is_tax_exempt: false,
    resale_cert: false,
  });

  useEffect(() => {
    if (id) {
      const account = getAccount(id);
      if (account) {
        setFormData({
          name: account.name,
          kind: account.kind,
          tax_id: account.tax_id || '',
          billing_address: account.billing_address || '',
          billing_state: account.billing_state || '',
          billing_country: account.billing_country || '',
          phone: account.phone || '',
          email: account.email || '',
          website: account.website || '',
          notes: account.notes || '',
          is_tax_exempt: account.is_tax_exempt,
          resale_cert: account.resale_cert,
        });
      }
    }
  }, [id, getAccount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      updateAccount(id, formData);
      toast.success('Account updated successfully');
    } else {
      addAccount(formData);
      toast.success('Account created successfully');
    }
    navigate('/backoffice/crm/accounts');
  };

  return (
    <BackofficeLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold">
            {id ? t('common.edit') : t('crm.addAccount')}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>{t('crm.overview')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kind">Type *</Label>
                  <Select
                    value={formData.kind}
                    onValueChange={(value: AccountKind) => setFormData({ ...formData, kind: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">{t('crm.company')}</SelectItem>
                      <SelectItem value="individual">{t('crm.individual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t('crm.billingInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_address">Address</Label>
                <Input
                  id="billing_address"
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_state">State</Label>
                  <Input
                    id="billing_state"
                    value={formData.billing_state}
                    onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_country">Country</Label>
                  <Input
                    id="billing_country"
                    value={formData.billing_country}
                    onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_tax_exempt"
                    checked={formData.is_tax_exempt}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_tax_exempt: checked })}
                  />
                  <Label htmlFor="is_tax_exempt">{t('crm.taxExempt')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="resale_cert"
                    checked={formData.resale_cert}
                    onCheckedChange={(checked) => setFormData({ ...formData, resale_cert: checked })}
                  />
                  <Label htmlFor="resale_cert">{t('crm.resaleCert')}</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate('/backoffice/crm/accounts')}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      </div>
    </BackofficeLayout>
  );
}
