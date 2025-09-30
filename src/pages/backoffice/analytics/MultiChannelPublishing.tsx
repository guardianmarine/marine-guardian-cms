import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Globe,
  FileDown,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Channel {
  id: string;
  name: string;
  icon: string;
  status: 'active' | 'pending' | 'disabled';
  lastSync?: string;
  unitCount: number;
}

const CHANNELS: Channel[] = [
  { id: 'truckpaper', name: 'Truck Paper', icon: '🚛', status: 'pending', unitCount: 0 },
  { id: 'commercialtrucktrader', name: 'Commercial Truck Trader', icon: '📰', status: 'pending', unitCount: 0 },
  { id: 'trucksales', name: 'Truck Sales', icon: '💼', status: 'pending', unitCount: 0 },
  { id: 'facebook', name: 'Facebook Marketplace', icon: '👥', status: 'pending', unitCount: 0 },
  { id: 'custom', name: 'Custom Export', icon: '📦', status: 'active', unitCount: 0 },
];

export default function MultiChannelPublishing() {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Channel[]>(CHANNELS);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');

  const handleExport = (format: 'csv' | 'xml' | 'json') => {
    if (selectedUnits.length === 0) {
      toast.error('Please select at least one unit to export');
      return;
    }

    // TODO: Implement actual export logic
    toast.success(`Exporting ${selectedUnits.length} units as ${format.toUpperCase()}`);
    console.log('Export:', { format, units: selectedUnits, channel: selectedChannel });
  };

  const handleSync = (channelId: string) => {
    // TODO: Implement actual sync logic
    toast.info('Sync functionality coming soon');
    console.log('Sync channel:', channelId);
  };

  return (
    <PermissionGuard allowedRoles={['admin', 'sales']}>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Multi-Channel Publishing
          </h1>
          <p className="text-muted-foreground mt-2">
            Export and sync inventory to external marketplaces (Manual exports now; API sync coming soon)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Channels List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Channels</CardTitle>
                <CardDescription>Connected marketplaces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {channels.map(channel => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedChannel(channel.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{channel.icon}</span>
                      <div>
                        <div className="font-medium text-sm">{channel.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {channel.unitCount} units
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant={
                          channel.status === 'active' ? 'default' : 
                          channel.status === 'pending' ? 'secondary' : 
                          'outline'
                        }
                        className="text-xs"
                      >
                        {channel.status}
                      </Badge>
                      {channel.lastSync && (
                        <span className="text-xs text-muted-foreground">
                          {channel.lastSync}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" />
                  <p>
                    Manual exports are available now. API sync integrations coming in future updates.
                  </p>
                </div>
                <Separator />
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                  <p>
                    All exports maintain data privacy and never expose internal hours or acquisition costs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Export Inventory</CardTitle>
                <CardDescription>
                  Select units and format to export for external listings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Channel Selection */}
                <div className="space-y-2">
                  <Label>Target Channel</Label>
                  <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map(channel => (
                        <SelectItem key={channel.id} value={channel.id}>
                          <span className="flex items-center gap-2">
                            <span>{channel.icon}</span>
                            <span>{channel.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Units Selection (Placeholder) */}
                <div className="space-y-2">
                  <Label>Select Units</Label>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Select units from your inventory to include in the export
                    </p>
                    
                    {/* Placeholder table */}
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Unit selection interface coming soon</p>
                      <p className="text-xs mt-2">
                        For now, all published units will be included in exports
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Export Format */}
                <div className="space-y-3">
                  <Label>Export Format</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => handleExport('csv')}
                      disabled={!selectedChannel}
                    >
                      <FileDown className="h-6 w-6" />
                      <span className="text-sm font-medium">CSV</span>
                      <span className="text-xs text-muted-foreground">
                        Excel compatible
                      </span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => handleExport('xml')}
                      disabled={!selectedChannel}
                    >
                      <FileDown className="h-6 w-6" />
                      <span className="text-sm font-medium">XML</span>
                      <span className="text-xs text-muted-foreground">
                        Industry standard
                      </span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => handleExport('json')}
                      disabled={!selectedChannel}
                    >
                      <FileDown className="h-6 w-6" />
                      <span className="text-sm font-medium">JSON</span>
                      <span className="text-xs text-muted-foreground">
                        API ready
                      </span>
                    </Button>
                  </div>
                </div>

                {selectedChannel && (
                  <>
                    <Separator />
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Export Preview</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Channel:</span> {channels.find(c => c.id === selectedChannel)?.name}</p>
                        <p><span className="text-muted-foreground">Units:</span> All published units</p>
                        <p><span className="text-muted-foreground">Fields included:</span> VIN, Make, Model, Year, Category, Type, Specs, Photos</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          ⚠️ Internal data (hours, costs, acquisition info) will NOT be included
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Coming Soon Features */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Coming Soon: Automated Sync
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Future updates will include:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Real-time inventory sync to marketplaces</li>
                    <li>Automatic price updates across channels</li>
                    <li>Lead capture from external platforms</li>
                    <li>Sync history and error logging</li>
                    <li>Custom field mapping per channel</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
