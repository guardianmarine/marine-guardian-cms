import { useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePurchasingStore } from '@/services/purchasingStore';
import { PurchaseIntake, PipelineStage, Appraisal } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Eye,
  Calculator,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PurchaseIntakes() {
  const { toast } = useToast();
  const {
    purchaseIntakes,
    updatePurchaseIntake,
    appraisals,
    addAppraisal,
    getAppraisalByIntake,
  } = usePurchasingStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all');
  const [selectedIntake, setSelectedIntake] = useState<PurchaseIntake | null>(null);
  const [appraisalDialogOpen, setAppraisalDialogOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const [appraisalForm, setAppraisalForm] = useState({
    condition_grade: '' as '' | 'A' | 'B' | 'C' | 'D',
    est_reconditioning_parts: '',
    est_reconditioning_labor: '',
    est_transport_in: '',
    target_buy_price: '',
    comments: '',
  });

  const [offerPrice, setOfferPrice] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const filteredIntakes = purchaseIntakes.filter((intake) => {
    const matchesSearch =
      intake.seller_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      intake.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      intake.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      intake.vin_or_serial.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'all' || intake.pipeline_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getStageColor = (stage: PipelineStage) => {
    switch (stage) {
      case 'new':
        return 'bg-blue-500';
      case 'review':
        return 'bg-yellow-500';
      case 'appraised':
        return 'bg-purple-500';
      case 'offer_made':
        return 'bg-orange-500';
      case 'accepted':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleOpenAppraisalDialog = (intake: PurchaseIntake) => {
    setSelectedIntake(intake);
    const existingAppraisal = getAppraisalByIntake(intake.id);
    
    if (existingAppraisal) {
      setAppraisalForm({
        condition_grade: existingAppraisal.condition_grade || '',
        est_reconditioning_parts: existingAppraisal.est_reconditioning_parts.toString(),
        est_reconditioning_labor: existingAppraisal.est_reconditioning_labor.toString(),
        est_transport_in: existingAppraisal.est_transport_in.toString(),
        target_buy_price: existingAppraisal.target_buy_price.toString(),
        comments: existingAppraisal.comments || '',
      });
    } else {
      setAppraisalForm({
        condition_grade: '',
        est_reconditioning_parts: '',
        est_reconditioning_labor: '',
        est_transport_in: '',
        target_buy_price: '',
        comments: '',
      });
    }
    setAppraisalDialogOpen(true);
  };

  const handleSaveAppraisal = () => {
    if (!selectedIntake) return;

    const newAppraisal: Appraisal = {
      id: Math.random().toString(36).substr(2, 9),
      purchase_intake_id: selectedIntake.id,
      condition_grade: appraisalForm.condition_grade || undefined,
      valuation_inputs: {},
      est_reconditioning_parts: parseFloat(appraisalForm.est_reconditioning_parts) || 0,
      est_reconditioning_labor: parseFloat(appraisalForm.est_reconditioning_labor) || 0,
      est_transport_in: parseFloat(appraisalForm.est_transport_in) || 0,
      target_buy_price: parseFloat(appraisalForm.target_buy_price) || 0,
      comments: appraisalForm.comments,
      created_by: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addAppraisal(newAppraisal);
    updatePurchaseIntake(selectedIntake.id, { pipeline_stage: 'appraised' });

    toast({
      title: 'Appraisal saved',
      description: 'Unit has been appraised successfully',
    });

    setAppraisalDialogOpen(false);
  };

  const handleMakeOffer = () => {
    if (!selectedIntake || !offerPrice) return;

    updatePurchaseIntake(selectedIntake.id, {
      pipeline_stage: 'offer_made',
    });

    toast({
      title: 'Offer made',
      description: `Offer of $${parseFloat(offerPrice).toLocaleString()} has been recorded`,
    });

    setOfferDialogOpen(false);
    setOfferPrice('');
  };

  const handleAccept = (intake: PurchaseIntake) => {
    updatePurchaseIntake(intake.id, { pipeline_stage: 'accepted' });
    toast({
      title: 'Intake accepted',
      description: 'Unit can now be added to a batch or PO',
    });
  };

  const handleReject = () => {
    if (!selectedIntake || !rejectReason) return;

    updatePurchaseIntake(selectedIntake.id, {
      pipeline_stage: 'rejected',
      reason_rejected: rejectReason,
    });

    toast({
      title: 'Intake rejected',
      description: 'Rejection reason has been recorded',
    });

    setRejectDialogOpen(false);
    setRejectReason('');
  };

  const calculateTotalAcquisition = () => {
    const parts = parseFloat(appraisalForm.est_reconditioning_parts) || 0;
    const labor = parseFloat(appraisalForm.est_reconditioning_labor) || 0;
    const transport = parseFloat(appraisalForm.est_transport_in) || 0;
    const buyPrice = parseFloat(appraisalForm.target_buy_price) || 0;
    return parts + labor + transport + buyPrice;
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold">Purchase Intakes</h2>
          <p className="text-muted-foreground">Manage incoming unit offers from sellers</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by seller, make, model, or VIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={stageFilter}
            onValueChange={(v) => setStageFilter(v as PipelineStage | 'all')}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="appraised">Appraised</SelectItem>
              <SelectItem value="offer_made">Offer Made</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Intakes Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIntakes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No purchase intakes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIntakes.map((intake) => (
                    <TableRow key={intake.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{intake.seller_name}</div>
                          {intake.seller_company && (
                            <div className="text-sm text-muted-foreground">
                              {intake.seller_company}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {intake.year} {intake.make} {intake.model}
                          </div>
                          <Badge variant="outline">{intake.category}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>Type: {intake.type}</div>
                          {intake.mileage && <div>Mileage: {intake.mileage.toLocaleString()}</div>}
                          <div className="text-muted-foreground">
                            VIN: {intake.vin_or_serial.slice(-6)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{intake.source.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStageColor(intake.pipeline_stage)}>
                          {intake.pipeline_stage.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(intake.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedIntake(intake)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {intake.pipeline_stage === 'review' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenAppraisalDialog(intake)}
                            >
                              <Calculator className="h-4 w-4" />
                            </Button>
                          )}
                          {intake.pipeline_stage === 'appraised' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedIntake(intake);
                                const appraisal = getAppraisalByIntake(intake.id);
                                setOfferPrice(appraisal?.target_buy_price.toString() || '');
                                setOfferDialogOpen(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          {intake.pipeline_stage === 'offer_made' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAccept(intake)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {['new', 'review', 'appraised'].includes(intake.pipeline_stage) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedIntake(intake);
                                setRejectDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedIntake && !appraisalDialogOpen && !offerDialogOpen && !rejectDialogOpen} onOpenChange={() => setSelectedIntake(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Intake Details</DialogTitle>
              <DialogDescription>Full information about the seller's offer</DialogDescription>
            </DialogHeader>
            {selectedIntake && (
              <Tabs defaultValue="unit">
                <TabsList>
                  <TabsTrigger value="unit">Unit Info</TabsTrigger>
                  <TabsTrigger value="seller">Seller Info</TabsTrigger>
                  <TabsTrigger value="appraisal">Appraisal</TabsTrigger>
                </TabsList>

                <TabsContent value="unit" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <p>{selectedIntake.category}</p>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <p>{selectedIntake.type}</p>
                    </div>
                    <div>
                      <Label>Make</Label>
                      <p>{selectedIntake.make}</p>
                    </div>
                    <div>
                      <Label>Model</Label>
                      <p>{selectedIntake.model}</p>
                    </div>
                    <div>
                      <Label>Year</Label>
                      <p>{selectedIntake.year}</p>
                    </div>
                    {selectedIntake.color && (
                      <div>
                        <Label>Color</Label>
                        <p>{selectedIntake.color}</p>
                      </div>
                    )}
                    {selectedIntake.mileage && (
                      <div>
                        <Label>Mileage</Label>
                        <p>{selectedIntake.mileage.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedIntake.hours && (
                      <div>
                        <Label>Hours</Label>
                        <p>{selectedIntake.hours.toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <Label>VIN/Serial</Label>
                      <p>{selectedIntake.vin_or_serial}</p>
                    </div>
                    {selectedIntake.engine && (
                      <div>
                        <Label>Engine</Label>
                        <p>{selectedIntake.engine}</p>
                      </div>
                    )}
                    {selectedIntake.transmission && (
                      <div>
                        <Label>Transmission</Label>
                        <p>{selectedIntake.transmission}</p>
                      </div>
                    )}
                    {selectedIntake.axles && (
                      <div>
                        <Label>Axles</Label>
                        <p>{selectedIntake.axles}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="seller" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Seller Name</Label>
                      <p>{selectedIntake.seller_name}</p>
                    </div>
                    {selectedIntake.seller_company && (
                      <div>
                        <Label>Company</Label>
                        <p>{selectedIntake.seller_company}</p>
                      </div>
                    )}
                    {selectedIntake.email && (
                      <div>
                        <Label>Email</Label>
                        <p>{selectedIntake.email}</p>
                      </div>
                    )}
                    {selectedIntake.phone && (
                      <div>
                        <Label>Phone</Label>
                        <p>{selectedIntake.phone}</p>
                      </div>
                    )}
                    <div>
                      <Label>Source</Label>
                      <Badge>{selectedIntake.source}</Badge>
                    </div>
                    <div>
                      <Label>Pipeline Stage</Label>
                      <Badge className={getStageColor(selectedIntake.pipeline_stage)}>
                        {selectedIntake.pipeline_stage.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  {selectedIntake.reason_rejected && (
                    <div>
                      <Label>Rejection Reason</Label>
                      <p className="text-destructive">{selectedIntake.reason_rejected}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="appraisal">
                  {(() => {
                    const appraisal = getAppraisalByIntake(selectedIntake.id);
                    if (!appraisal) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          No appraisal created yet
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {appraisal.condition_grade && (
                            <div>
                              <Label>Condition Grade</Label>
                              <p className="text-2xl font-bold">{appraisal.condition_grade}</p>
                            </div>
                          )}
                          <div>
                            <Label>Target Buy Price</Label>
                            <p className="text-2xl font-bold">
                              ${appraisal.target_buy_price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Cost Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex justify-between">
                              <span>Reconditioning (Parts)</span>
                              <span>${appraisal.est_reconditioning_parts.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Reconditioning (Labor)</span>
                              <span>${appraisal.est_reconditioning_labor.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Transport In</span>
                              <span>${appraisal.est_transport_in.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-2">
                              <span>Total Estimated Acquisition</span>
                              <span>
                                $
                                {(
                                  appraisal.target_buy_price +
                                  appraisal.est_reconditioning_parts +
                                  appraisal.est_reconditioning_labor +
                                  appraisal.est_transport_in
                                ).toLocaleString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                        {appraisal.comments && (
                          <div>
                            <Label>Comments</Label>
                            <p className="text-muted-foreground">{appraisal.comments}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Appraisal Dialog */}
        <Dialog open={appraisalDialogOpen} onOpenChange={setAppraisalDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Appraisal</DialogTitle>
              <DialogDescription>Evaluate the unit and determine target buy price</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Condition Grade</Label>
                <Select
                  value={appraisalForm.condition_grade}
                  onValueChange={(v) =>
                    setAppraisalForm({ ...appraisalForm, condition_grade: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - Excellent</SelectItem>
                    <SelectItem value="B">B - Good</SelectItem>
                    <SelectItem value="C">C - Fair</SelectItem>
                    <SelectItem value="D">D - Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reconditioning (Parts)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={appraisalForm.est_reconditioning_parts}
                    onChange={(e) =>
                      setAppraisalForm({
                        ...appraisalForm,
                        est_reconditioning_parts: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reconditioning (Labor)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={appraisalForm.est_reconditioning_labor}
                    onChange={(e) =>
                      setAppraisalForm({
                        ...appraisalForm,
                        est_reconditioning_labor: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Transport In</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={appraisalForm.est_transport_in}
                    onChange={(e) =>
                      setAppraisalForm({ ...appraisalForm, est_transport_in: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Buy Price</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={appraisalForm.target_buy_price}
                    onChange={(e) =>
                      setAppraisalForm({ ...appraisalForm, target_buy_price: e.target.value })
                    }
                  />
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Estimated Acquisition Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">${calculateTotalAcquisition().toLocaleString()}</p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Comments</Label>
                <Textarea
                  value={appraisalForm.comments}
                  onChange={(e) =>
                    setAppraisalForm({ ...appraisalForm, comments: e.target.value })
                  }
                  rows={3}
                  placeholder="Appraisal notes and observations..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAppraisalDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAppraisal}>Save Appraisal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Make Offer Dialog */}
        <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Make Offer</DialogTitle>
              <DialogDescription>Enter the offer price for this unit</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Offer Price</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleMakeOffer}>Submit Offer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Intake</DialogTitle>
              <DialogDescription>Provide a reason for rejection</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this intake is being rejected..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Reject Intake
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BackofficeLayout>
  );
}
