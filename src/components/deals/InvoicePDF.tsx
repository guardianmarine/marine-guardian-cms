import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import { Deal } from '@/hooks/useDeals';
import { DealUnit } from '@/hooks/useDealUnits';
import { DealFee } from '@/hooks/useDealFees';

// Register fonts (you can use system fonts or Google Fonts)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Roboto',
    fontSize: 10,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2 solid #333',
  },
  logo: {
    width: 150,
    height: 50,
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 9,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 5,
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    color: '#333',
  },
  billTo: {
    fontSize: 10,
    lineHeight: 1.6,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 8,
    fontWeight: 700,
    borderBottom: '1 solid #ccc',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #eee',
  },
  col1: { width: '10%' },
  col2: { width: '25%' },
  col3: { width: '20%' },
  col4: { width: '25%' },
  col5: { width: '20%', textAlign: 'right' },
  totalsSection: {
    marginTop: 30,
    marginLeft: '60%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 400,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 500,
    textAlign: 'right',
    minWidth: 100,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    marginTop: 8,
    fontWeight: 700,
    fontSize: 12,
  },
  legalSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1 solid #ccc',
    fontSize: 8,
    lineHeight: 1.4,
    color: '#555',
  },
  legalTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 8,
    color: '#333',
  },
  legalText: {
    marginBottom: 6,
    textAlign: 'justify',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
    borderTop: '1 solid #eee',
    paddingTop: 10,
  },
});

interface InvoicePDFProps {
  deal: Deal;
  units: DealUnit[];
  fees: DealFee[];
  invoiceNumber: string;
  issuedDate: string;
  dueDate?: string;
}

export const InvoicePDF = ({
  deal,
  units,
  fees,
  invoiceNumber,
  issuedDate,
  dueDate,
}: InvoicePDFProps) => {
  const billTo = deal.bill_to as any || {};

  // Calculate totals
  const subtotal = deal.subtotal || 0;
  const discounts = Math.abs(deal.discounts_total || 0);
  const feesTotal = deal.fees_total || 0;
  const taxTotal = deal.tax_total || 0;
  const totalDue = deal.total_due || 0;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={{ fontSize: 10, color: '#666' }}>Invoice #: {invoiceNumber}</Text>
            <Text style={{ fontSize: 9, color: '#666' }}>Issued: {issuedDate}</Text>
            {dueDate && <Text style={{ fontSize: 9, color: '#666' }}>Due: {dueDate}</Text>}
          </View>
          <View style={styles.companyInfo}>
            <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              GUARDIAN MARINE
            </Text>
            <Text>11110 FM 529 RD</Text>
            <Text>Houston, TX 77041</Text>
            <Text>Phone: (713) 466-8484</Text>
            <Text>Email: info@guardianmarine.com</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BILL TO</Text>
          <View style={styles.billTo}>
            {billTo.company && <Text style={{ fontWeight: 700 }}>{billTo.company}</Text>}
            {billTo.contact && <Text>{billTo.contact}</Text>}
            {billTo.email && <Text>Email: {billTo.email}</Text>}
            {billTo.phone && <Text>Phone: {billTo.phone}</Text>}
          </View>
        </View>

        {/* Units Table */}
        <View style={styles.table}>
          <Text style={styles.sectionTitle}>EQUIPMENT</Text>
          
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Year</Text>
            <Text style={styles.col2}>Make/Model</Text>
            <Text style={styles.col3}>VIN/Serial</Text>
            <Text style={styles.col4}>Specifications</Text>
            <Text style={styles.col5}>Price</Text>
          </View>

          {units.map((unit, index) => {
            const snapshot = unit.unit_snapshot;
            const vinLast6 = snapshot.vin_or_serial.slice(-6);
            const specs = [
              snapshot.mileage ? `${snapshot.mileage.toLocaleString()} mi` : null,
              snapshot.engine,
              snapshot.transmission,
              snapshot.axles ? `${snapshot.axles} axles` : null,
            ].filter(Boolean).join(', ');

            return (
              <View key={unit.id} style={styles.tableRow}>
                <Text style={styles.col1}>{snapshot.year}</Text>
                <Text style={styles.col2}>
                  {snapshot.make} {snapshot.model}
                </Text>
                <Text style={styles.col3}>...{vinLast6}</Text>
                <Text style={styles.col4}>{specs || 'N/A'}</Text>
                <Text style={styles.col5}>
                  ${unit.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Fees if any */}
        {fees.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FEES & CHARGES</Text>
            {fees.map((fee) => (
              <View key={fee.id} style={styles.totalRow}>
                <Text style={styles.totalLabel}>{fee.label}</Text>
                <Text style={styles.totalValue}>
                  ${fee.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {discounts > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: '#16a34a' }]}>Discounts:</Text>
              <Text style={[styles.totalValue, { color: '#16a34a' }]}>
                -${discounts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          )}

          {feesTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Fees:</Text>
              <Text style={styles.totalValue}>
                ${feesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          )}

          {taxTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Taxes:</Text>
              <Text style={styles.totalValue}>
                ${taxTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          )}

          <View style={styles.grandTotal}>
            <Text>TOTAL DUE:</Text>
            <Text>${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* Legal Terms */}
        <View style={styles.legalSection}>
          <Text style={styles.legalTitle}>TERMS AND CONDITIONS</Text>
          
          <Text style={styles.legalText}>
            1. PAYMENT TERMS: Full payment is due upon receipt unless other arrangements have been made in writing. Payment may be made by wire transfer, ACH, certified check, or cashier's check. Personal checks must clear before equipment is released.
          </Text>

          <Text style={styles.legalText}>
            2. TITLE AND RISK OF LOSS: Title and risk of loss pass to Buyer upon delivery of equipment. Buyer is responsible for all transportation, insurance, and associated costs from point of delivery.
          </Text>

          <Text style={styles.legalText}>
            3. WARRANTIES: Equipment is sold "AS IS, WHERE IS" without any warranties, express or implied, including but not limited to warranties of merchantability or fitness for a particular purpose. Seller makes no representations regarding the condition, quality, or suitability of the equipment.
          </Text>

          <Text style={styles.legalText}>
            4. INSPECTION: Buyer has had the opportunity to inspect the equipment or has waived such inspection. Buyer accepts equipment in its current condition and acknowledges that no modifications or repairs will be made by Seller.
          </Text>

          <Text style={styles.legalText}>
            5. DEFAULT: If Buyer fails to make payment when due, Seller may declare the entire balance immediately due and payable. Buyer shall be liable for all costs of collection including reasonable attorney's fees.
          </Text>

          <Text style={styles.legalText}>
            6. APPLICABLE LAW: This transaction is governed by the laws of the State of Texas. Any disputes shall be resolved in the courts of Harris County, Texas.
          </Text>

          <Text style={styles.legalText}>
            7. TAX LIABILITY: Buyer is responsible for all applicable federal, state, and local taxes including but not limited to sales tax, use tax, and registration fees unless a valid tax exemption certificate is provided prior to sale.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Guardian Marine - 11110 FM 529 RD, Houston, TX 77041</Text>
          <Text>Phone: (713) 466-8484 | Email: info@guardianmarine.com</Text>
          <Text style={{ marginTop: 4 }}>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
};
