import { Deal, DealUnit, Account, Contact, Unit } from '@/types';

export interface InvoiceData {
  dealId: string;
  dealNumber: string;
  issuedAt: string;
  purchaser: {
    accountName: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
  };
  units: Array<{
    year: number;
    make: string;
    model: string;
    stockUnit: string;
    mileage?: number;
    vin: string;
    price: number;
    location?: string;
  }>;
  termsOfSale?: string;
  taxesSummary: {
    vehicleSubtotal: number;
    discountsTotal: number;
    taxesTotal: number;
    feesTotal: number;
    totalDue: number;
    balanceDue: number;
  };
}

export async function generateInvoice(
  deal: Deal,
  dealUnits: DealUnit[],
  account: Account,
  contact: Contact | null,
  units: Unit[]
): Promise<InvoiceData> {
  const invoiceData: InvoiceData = {
    dealId: deal.id,
    dealNumber: `DEAL-${deal.id.slice(-8).toUpperCase()}`,
    issuedAt: deal.issued_at || new Date().toISOString(),
    purchaser: {
      accountName: account.name,
      contactName: contact ? `${contact.first_name} ${contact.last_name}` : undefined,
      contactPhone: contact?.phone,
      contactEmail: contact?.email,
    },
    units: dealUnits.map(du => {
      const unit = units.find(u => u.id === du.unit_id);
      return {
        year: unit?.year || 0,
        make: unit?.make || '',
        model: unit?.model || '',
        stockUnit: unit?.id.slice(-6).toUpperCase() || '',
        mileage: unit?.mileage,
        vin: unit?.vin_or_serial || '',
        price: du.agreed_unit_price,
        location: unit?.location?.name,
      };
    }),
    termsOfSale: undefined, // Can be added from deal notes if needed
    taxesSummary: {
      vehicleSubtotal: deal.vehicle_subtotal,
      discountsTotal: deal.discounts_total,
      taxesTotal: deal.taxes_total,
      feesTotal: deal.fees_total,
      totalDue: deal.total_due,
      balanceDue: deal.balance_due,
    },
  };

  return invoiceData;
}

export function getMailtoLink(email: string, invoiceNumber: string, pdfUrl: string): string {
  const subject = encodeURIComponent(`Invoice ${invoiceNumber} - Guardian Marine`);
  const body = encodeURIComponent(
    `Dear Customer,\n\nPlease find your invoice attached.\n\nInvoice PDF: ${pdfUrl}\n\nThank you for your business!\n\nBest regards,\nGuardian Marine LLC`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function getWhatsAppLink(phone: string, invoiceNumber: string, pdfUrl: string): string {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  const message = encodeURIComponent(
    `Hello! Here is your invoice ${invoiceNumber} from Guardian Marine: ${pdfUrl}`
  );
  return `https://wa.me/${cleanPhone}?text=${message}`;
}
