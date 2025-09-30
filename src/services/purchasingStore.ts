import { create } from 'zustand';
import {
  Supplier,
  AcquisitionBatch,
  PurchaseIntake,
  Appraisal,
  PurchaseOrder,
  ReceivingItem,
  BuyerRequest,
} from '@/types';

interface PurchasingStore {
  suppliers: Supplier[];
  acquisitionBatches: AcquisitionBatch[];
  purchaseIntakes: PurchaseIntake[];
  appraisals: Appraisal[];
  purchaseOrders: PurchaseOrder[];
  receivingItems: ReceivingItem[];
  buyerRequests: BuyerRequest[];

  // Suppliers
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Acquisition Batches
  addAcquisitionBatch: (batch: AcquisitionBatch) => void;
  updateAcquisitionBatch: (id: string, data: Partial<AcquisitionBatch>) => void;
  deleteAcquisitionBatch: (id: string) => void;

  // Purchase Intakes
  addPurchaseIntake: (intake: PurchaseIntake) => void;
  updatePurchaseIntake: (id: string, data: Partial<PurchaseIntake>) => void;
  deletePurchaseIntake: (id: string) => void;
  importPurchaseIntakes: (intakes: PurchaseIntake[]) => void;

  // Appraisals
  addAppraisal: (appraisal: Appraisal) => void;
  updateAppraisal: (id: string, data: Partial<Appraisal>) => void;
  deleteAppraisal: (id: string) => void;
  getAppraisalByIntake: (intakeId: string) => Appraisal | undefined;

  // Purchase Orders
  addPurchaseOrder: (po: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, data: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;

  // Receiving Items
  addReceivingItem: (item: ReceivingItem) => void;
  updateReceivingItem: (id: string, data: Partial<ReceivingItem>) => void;
  deleteReceivingItem: (id: string) => void;

  // Buyer Requests
  addBuyerRequest: (request: BuyerRequest) => void;
  updateBuyerRequest: (id: string, data: Partial<BuyerRequest>) => void;
  deleteBuyerRequest: (id: string) => void;
}

export const usePurchasingStore = create<PurchasingStore>((set, get) => ({
  suppliers: [],
  acquisitionBatches: [],
  purchaseIntakes: [],
  appraisals: [],
  purchaseOrders: [],
  receivingItems: [],
  buyerRequests: [],

  // Suppliers
  addSupplier: (supplier) =>
    set((state) => ({ suppliers: [...state.suppliers, supplier] })),

  updateSupplier: (id, data) =>
    set((state) => ({
      suppliers: state.suppliers.map((s) =>
        s.id === id ? { ...s, ...data, updated_at: new Date().toISOString() } : s
      ),
    })),

  deleteSupplier: (id) =>
    set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) })),

  // Acquisition Batches
  addAcquisitionBatch: (batch) =>
    set((state) => ({ acquisitionBatches: [...state.acquisitionBatches, batch] })),

  updateAcquisitionBatch: (id, data) =>
    set((state) => ({
      acquisitionBatches: state.acquisitionBatches.map((b) =>
        b.id === id ? { ...b, ...data, updated_at: new Date().toISOString() } : b
      ),
    })),

  deleteAcquisitionBatch: (id) =>
    set((state) => ({
      acquisitionBatches: state.acquisitionBatches.filter((b) => b.id !== id),
    })),

  // Purchase Intakes
  addPurchaseIntake: (intake) =>
    set((state) => ({ purchaseIntakes: [...state.purchaseIntakes, intake] })),

  updatePurchaseIntake: (id, data) =>
    set((state) => ({
      purchaseIntakes: state.purchaseIntakes.map((i) =>
        i.id === id ? { ...i, ...data, updated_at: new Date().toISOString() } : i
      ),
    })),

  deletePurchaseIntake: (id) =>
    set((state) => ({
      purchaseIntakes: state.purchaseIntakes.filter((i) => i.id !== id),
    })),

  importPurchaseIntakes: (intakes) =>
    set((state) => ({ purchaseIntakes: [...state.purchaseIntakes, ...intakes] })),

  // Appraisals
  addAppraisal: (appraisal) =>
    set((state) => ({ appraisals: [...state.appraisals, appraisal] })),

  updateAppraisal: (id, data) =>
    set((state) => ({
      appraisals: state.appraisals.map((a) =>
        a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a
      ),
    })),

  deleteAppraisal: (id) =>
    set((state) => ({ appraisals: state.appraisals.filter((a) => a.id !== id) })),

  getAppraisalByIntake: (intakeId) =>
    get().appraisals.find((a) => a.purchase_intake_id === intakeId),

  // Purchase Orders
  addPurchaseOrder: (po) =>
    set((state) => ({ purchaseOrders: [...state.purchaseOrders, po] })),

  updatePurchaseOrder: (id, data) =>
    set((state) => ({
      purchaseOrders: state.purchaseOrders.map((po) =>
        po.id === id ? { ...po, ...data, updated_at: new Date().toISOString() } : po
      ),
    })),

  deletePurchaseOrder: (id) =>
    set((state) => ({
      purchaseOrders: state.purchaseOrders.filter((po) => po.id !== id),
    })),

  // Receiving Items
  addReceivingItem: (item) =>
    set((state) => ({ receivingItems: [...state.receivingItems, item] })),

  updateReceivingItem: (id, data) =>
    set((state) => ({
      receivingItems: state.receivingItems.map((item) =>
        item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item
      ),
    })),

  deleteReceivingItem: (id) =>
    set((state) => ({
      receivingItems: state.receivingItems.filter((item) => item.id !== id),
    })),

  // Buyer Requests
  addBuyerRequest: (request) =>
    set((state) => ({ buyerRequests: [...state.buyerRequests, request] })),

  updateBuyerRequest: (id, data) =>
    set((state) => ({
      buyerRequests: state.buyerRequests.map((r) =>
        r.id === id ? { ...r, ...data, updated_at: new Date().toISOString() } : r
      ),
    })),

  deleteBuyerRequest: (id) =>
    set((state) => ({
      buyerRequests: state.buyerRequests.filter((r) => r.id !== id),
    })),
}));
