import jsPDF from 'jspdf';

const DEALER_INFO = {
  name: "Guardian Marine LLC",
  address: "123 Marine Drive, Red Oak, TX 75154",
  phone: "214-613-8521",
  dealerNumbers: "TX Dealer #12345 | Federal ID: 12-3456789"
};

const WIRE_INSTRUCTIONS = `Wire Transfer Instructions:
Bank: Example Bank
Routing: 123456789
Account: 987654321
Account Name: Guardian Marine LLC
Reference: Invoice #[INVOICE_NUMBER]`;

const DISCLAIMER = `AS-IS SALE DISCLAIMER

THIS VEHICLE/UNIT IS SOLD "AS-IS" WITH NO WARRANTY, EXPRESS OR IMPLIED. THE SELLER MAKES NO REPRESENTATIONS OR WARRANTIES OF ANY KIND REGARDING THE CONDITION, QUALITY, OR FITNESS FOR ANY PARTICULAR PURPOSE OF THE VEHICLE/UNIT.

BUYER ACKNOWLEDGES:
1. Buyer has inspected the vehicle/unit or waived the right to inspection
2. Buyer accepts the vehicle/unit in its current condition
3. All sales are final - no returns or refunds
4. Seller is not liable for any defects, malfunctions, or failures after sale
5. Buyer is responsible for all repairs, maintenance, and costs after delivery

BY SIGNING BELOW, BUYER AGREES TO ALL TERMS AND CONDITIONS OF THIS AS-IS SALE.`;

export interface InvoiceData {
  invoiceNumber: string;
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

export function generateInvoicePDF(data: InvoiceData): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header - Dealer Info
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(DEALER_INFO.name, margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(DEALER_INFO.address, margin, yPos);
  yPos += 5;
  doc.text(`Phone: ${DEALER_INFO.phone}`, margin, yPos);
  yPos += 5;
  doc.text(DEALER_INFO.dealerNumbers, margin, yPos);
  yPos += 15;

  // Invoice Details
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${data.invoiceNumber}`, margin, yPos);
  doc.text(`Date: ${new Date(data.issuedAt).toLocaleDateString()}`, pageWidth - margin - 50, yPos);
  yPos += 5;
  doc.text(`Deal #: ${data.dealNumber}`, margin, yPos);
  yPos += 15;

  // Purchaser Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', margin, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.purchaser.accountName, margin, yPos);
  yPos += 5;
  if (data.purchaser.contactName) {
    doc.text(`Contact: ${data.purchaser.contactName}`, margin, yPos);
    yPos += 5;
  }
  if (data.purchaser.contactPhone) {
    doc.text(`Phone: ${data.purchaser.contactPhone}`, margin, yPos);
    yPos += 5;
  }
  if (data.purchaser.contactEmail) {
    doc.text(`Email: ${data.purchaser.contactEmail}`, margin, yPos);
    yPos += 5;
  }
  yPos += 10;

  // Units Table Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Year', margin, yPos);
  doc.text('Make/Model', margin + 20, yPos);
  doc.text('Stock/Unit', margin + 70, yPos);
  doc.text('VIN', margin + 95, yPos);
  doc.text('Price', pageWidth - margin - 30, yPos, { align: 'right' });
  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Units
  doc.setFont('helvetica', 'normal');
  data.units.forEach(unit => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(unit.year.toString(), margin, yPos);
    doc.text(`${unit.make} ${unit.model}`, margin + 20, yPos);
    doc.text(unit.stockUnit, margin + 70, yPos);
    doc.text(unit.vin.slice(-6), margin + 95, yPos);
    doc.text(`$${unit.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
      pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 5;

    if (unit.mileage) {
      doc.setFontSize(8);
      doc.text(`Mileage: ${unit.mileage.toLocaleString()} mi`, margin + 20, yPos);
      yPos += 4;
    }
    if (unit.location) {
      doc.setFontSize(8);
      doc.text(`Location: ${unit.location}`, margin + 20, yPos);
      yPos += 4;
    }
    doc.setFontSize(10);
    yPos += 3;
  });

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Totals
  const totalsX = pageWidth - margin - 60;
  doc.setFont('helvetica', 'normal');
  doc.text('Vehicle Subtotal:', totalsX, yPos);
  doc.text(`$${data.taxesSummary.vehicleSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
    pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 5;

  if (data.taxesSummary.discountsTotal > 0) {
    doc.text('Discounts:', totalsX, yPos);
    doc.text(`-$${data.taxesSummary.discountsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
      pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 5;
  }

  doc.text('Taxes:', totalsX, yPos);
  doc.text(`$${data.taxesSummary.taxesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
    pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 5;

  doc.text('Fees:', totalsX, yPos);
  doc.text(`$${data.taxesSummary.feesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
    pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 5;

  doc.line(totalsX - 5, yPos, pageWidth - margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Due:', totalsX, yPos);
  doc.text(`$${data.taxesSummary.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
    pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 10;

  // Terms of Sale
  if (data.termsOfSale) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms of Sale:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const termsLines = doc.splitTextToSize(data.termsOfSale, pageWidth - 2 * margin);
    doc.text(termsLines, margin, yPos);
    yPos += termsLines.length * 5 + 10;
  }

  // New page for signatures and legal
  doc.addPage();
  yPos = 20;

  // Wire Instructions
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Wire Transfer Instructions:', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const wireText = WIRE_INSTRUCTIONS.replace('[INVOICE_NUMBER]', data.invoiceNumber);
  const wireLines = wireText.split('\n');
  wireLines.forEach(line => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });
  yPos += 10;

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.text('Signatures:', margin, yPos);
  yPos += 10;

  const sigWidth = 70;
  doc.line(margin, yPos, margin + sigWidth, yPos);
  doc.line(pageWidth - margin - sigWidth, yPos, pageWidth - margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Manager Signature / Date', margin, yPos);
  doc.text('Purchaser Signature / Date', pageWidth - margin - sigWidth, yPos);
  yPos += 15;

  // Disclaimer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('AS-IS SALE DISCLAIMER', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  const disclaimerLines = doc.splitTextToSize(DISCLAIMER, pageWidth - 2 * margin);
  doc.text(disclaimerLines, margin, yPos);

  return doc.output('blob');
}

export function getInvoiceSnapshot(data: InvoiceData) {
  return {
    dealer_info: DEALER_INFO,
    purchaser: data.purchaser,
    units: data.units,
    terms_of_sale: data.termsOfSale,
    taxes_summary: data.taxesSummary,
    wire_instructions: WIRE_INSTRUCTIONS.replace('[INVOICE_NUMBER]', data.invoiceNumber),
    disclaimer: DISCLAIMER,
  };
}
