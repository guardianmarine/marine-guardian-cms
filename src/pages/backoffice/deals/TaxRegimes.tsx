import { useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDealsStore } from '@/services/dealsStore';
import { Plus, Settings } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function TaxRegimes() {
  const { taxRegimes, taxRules, taxRuleLines, getTaxRuleLines } = useDealsStore();
  const [selectedRegime, setSelectedRegime] = useState<string | null>(null);

  const getActiveRule = (regimeId: string) => {
    return taxRules.find((r) => r.tax_regime_id === regimeId && r.is_active);
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tax Regimes & Rules</h1>
            <p className="text-muted-foreground mt-1">
              Manage versioned tax and fee calculation rules
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Tax Regime
          </Button>
        </div>

        {/* Tax Regimes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {taxRegimes.map((regime) => {
            const activeRule = getActiveRule(regime.id);
            const isSelected = selectedRegime === regime.id;

            return (
              <Card
                key={regime.id}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'border-primary' : 'hover:bg-accent/50'
                }`}
                onClick={() => setSelectedRegime(regime.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{regime.name}</CardTitle>
                    <Badge variant={regime.active ? 'default' : 'secondary'}>
                      {regime.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Jurisdiction</p>
                      <p className="font-medium">{regime.jurisdiction}</p>
                    </div>
                    {activeRule && (
                      <div>
                        <p className="text-muted-foreground">Active Version</p>
                        <p className="font-medium">v{activeRule.version}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Regime Details */}
        {selectedRegime && (
          <>
            {taxRules
              .filter((rule) => rule.tax_regime_id === selectedRegime)
              .map((rule) => {
                const lines = getTaxRuleLines(rule.id);
                const regime = taxRegimes.find((r) => r.id === rule.tax_regime_id);

                return (
                  <Card key={rule.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>
                            {regime?.name} - Version {rule.version}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Effective from: {new Date(rule.effective_from).toLocaleDateString()}
                            {rule.effective_to &&
                              ` to ${new Date(rule.effective_to).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rule Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Base</TableHead>
                            <TableHead>Rate/Amount</TableHead>
                            <TableHead>Conditions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                No rules defined
                              </TableCell>
                            </TableRow>
                          ) : (
                            lines.map((line) => (
                              <TableRow key={line.id}>
                                <TableCell className="font-medium">{line.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {line.calc_type === 'percent' ? 'Percentage' : 'Fixed'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="capitalize">{line.base.replace('_', ' ')}</TableCell>
                                <TableCell>
                                  {line.calc_type === 'percent'
                                    ? `${line.rate_or_amount}%`
                                    : `$${line.rate_or_amount.toFixed(2)}`}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {line.conditions
                                    ? JSON.stringify(line.conditions)
                                    : 'None'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
          </>
        )}

        {!selectedRegime && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Select a tax regime to view its rules
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </BackofficeLayout>
  );
}
