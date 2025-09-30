import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCRMStore } from '@/services/crmStore';
import { Plus, Building2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Accounts() {
  const { t } = useTranslation();
  const { accounts } = useCRMStore();
  const navigate = useNavigate();

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">{t('crm.accounts')}</h2>
          <Button onClick={() => navigate('/backoffice/crm/accounts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('crm.addAccount')}
          </Button>
        </div>

        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => navigate(`/backoffice/crm/accounts/${account.id}`)}
            >
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <div className="flex items-center space-x-3 flex-1">
                  {account.kind === 'company' ? (
                    <Building2 className="h-5 w-5 text-primary" />
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t(`crm.${account.kind}`)}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  {account.email && <p>{account.email}</p>}
                  {account.phone && <p>{account.phone}</p>}
                </div>
              </CardHeader>
            </Card>
          ))}

          {accounts.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No accounts yet. Create your first account.</p>
                <Button className="mt-4" onClick={() => navigate('/backoffice/crm/accounts/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('crm.addAccount')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
