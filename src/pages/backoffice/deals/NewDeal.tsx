import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function NewDeal() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('lead_id');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [leadData, setLeadData] = useState<any>(null);

  useEffect(() => {
    if (leadId) {
      loadLeadData();
    } else {
      setLoading(false);
    }
  }, [leadId]);

  const loadLeadData = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          accounts(*),
          contacts(*),
          units(*),
          opportunities(*)
        `)
        .eq('id', leadId)
        .single();

      if (error) throw error;
      setLeadData(data);
    } catch (error: any) {
      console.error('Error loading lead:', error);
      toast.error('Failed to load lead data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeal = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setCreating(true);
    try {
      if (leadId && leadData) {
        // Create from lead
        const { createDealFromLead } = await import('@/services/crmFlow');
        const deal = await createDealFromLead(leadId, user.id);
        toast.success('Deal created from lead');
        navigate(`/backoffice/deals/${deal.id}/edit`);
      } else {
        // Create blank deal
        const { data: deal, error } = await supabase
          .from('deals')
          .insert({
            sales_rep_id: user.id,
            status: 'draft',
            currency: 'USD',
            subtotal: 0,
            discounts_total: 0,
            fees_total: 0,
            tax_total: 0,
            total_due: 0,
            commission_base: 0,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Deal created');
        navigate(`/backoffice/deals/${deal.id}/edit`);
      }
    } catch (error: any) {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <BackofficeLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Create New Deal</h2>
          <p className="text-muted-foreground">
            {leadId ? 'Creating deal from lead' : 'Create a blank deal'}
          </p>
        </div>

        {leadData && (
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Account</Label>
                <p className="font-medium">{leadData.accounts?.name || 'N/A'}</p>
              </div>
              <div>
                <Label>Contact</Label>
                <p className="font-medium">
                  {leadData.contacts?.first_name} {leadData.contacts?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{leadData.contacts?.email}</p>
              </div>
              {leadData.units && (
                <div>
                  <Label>Unit</Label>
                  <p className="font-medium">
                    {leadData.units.year} {leadData.units.make} {leadData.units.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    VIN: {leadData.units.vin}
                  </p>
                </div>
              )}
              {leadData.opportunities && leadData.opportunities.length > 0 && (
                <div>
                  <Label>Opportunity</Label>
                  <p className="font-medium">Stage: {leadData.opportunities[0].stage}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <Button
              type="button"
              onClick={handleCreateDeal}
              disabled={creating}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Deal...
                </>
              ) : (
                'Create Deal'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
