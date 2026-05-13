import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CustomerBill, ShopSettings } from '../types';
import { fmtDate } from './dateFormat';

// ── Colour palette (very light — user requested no dark backgrounds) ──
const BLACK:        [number,number,number] = [20,  20,  20 ];
const WHITE:        [number,number,number] = [255, 255, 255];
const PALE_ORANGE:  [number,number,number] = [255, 245, 228]; // very light cream-orange header
const LIGHT_GREY:   [number,number,number] = [238, 238, 238]; // invoice-type bar & table header
const MID_GREY:     [number,number,number] = [110, 110, 110]; // secondary text
const BORDER:       [number,number,number] = [200, 200, 200];

export const generateInvoicePDF = (bill: CustomerBill, settings: ShopSettings): jsPDF => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M  = 12; // margin
  const CW = PW - M * 2; // content width ≈ 186mm
  let y = M;

  // ── 1. Outer border ──
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.rect(M, M, CW, PH - M * 2);

  // ── 2. Shop header (pale orange background) ──
  const headerH = 26;
  doc.setFillColor(...PALE_ORANGE);
  doc.rect(M, y, CW, headerH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...BLACK);
  doc.text(settings.shopName || 'MANIKKAM & CO', PW / 2, y + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GREY);
  const addr1 = settings.addressLine1 || 'No.3/104, G.N.T Road, Karanodai, Chennai - 600 067';
  const addr2 = settings.addressLine2 || '';
  doc.text(addr1, PW / 2, y + 14, { align: 'center' });
  if (addr2) doc.text(addr2, PW / 2, y + 18, { align: 'center' });
  doc.text(
    `Ph: ${settings.phone1 || '9498411373'} / ${settings.phone2 || '9840456373'}   |   GSTIN: ${settings.gstin || '33AOAPL9789B1ZU'}`,
    PW / 2, addr2 ? y + 22 : y + 20, { align: 'center' }
  );
  y += headerH;

  // ── 3. Invoice type bar (light grey) ──
  const barH = 9;
  doc.setFillColor(...LIGHT_GREY);
  doc.rect(M, y, CW, barH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);

  const payLabel = bill.paymentType === 'Credit' ? 'CREDIT BILL' : `${bill.paymentType.toUpperCase()} BILL`;
  doc.text(`${payLabel}  —  TAX INVOICE`, PW / 2, y + 6, { align: 'center' });
  y += barH;

  // ── 4. Bill info grid ──
  const col1 = M + 4;
  const col2 = PW / 2 + 4;
  const infoH = 30;           // was 22 — extra height so rows breathe
  const rowGap = 12;          // vertical gap between rows

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(PW / 2, y, PW / 2, y + infoH);
  doc.line(M, y + infoH, M + CW, y + infoH);

  const infoLabel = (label: string, value: string, x: number, row: number) => {
    const baseY = y + 6 + row * rowGap;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MID_GREY);
    doc.text(label, x, baseY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(value, x, baseY + 5.5);
  };

  infoLabel('Bill Number',   bill.billNo,                       col1, 0);
  infoLabel('Bill Date',     fmtDate(bill.date),                col2, 0);
  infoLabel('Customer Name', bill.customerName.toUpperCase(),   col1, 1);
  infoLabel('Mobile',        bill.customerPhone || '—',         col2, 1);
  y += infoH;

  // GSTIN + Vehicle number row (always shown for uniform layout)
  doc.line(M, y + 13, M + CW, y + 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MID_GREY);
  doc.text('Customer GSTIN', col1, y + 5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BLACK);
  doc.text(bill.customerGstin || '—', col1, y + 10);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MID_GREY);
  doc.text('Vehicle No.', col2, y + 5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BLACK);
  doc.text(bill.vehicleNumber || '—', col2, y + 10);
  y += 13;

  // Address row (always shown for uniform layout)
  doc.line(M, y + 12, M + CW, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MID_GREY);
  doc.text('Address', col1, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  const addrText = bill.customerAddress || '—';
  const wrapped = doc.splitTextToSize(addrText, CW - 6);
  doc.text(wrapped, col1, y + 10);
  y += Math.max(12, wrapped.length * 4 + 8);

  // ── 5. Items table ──
  // Columns: S.No | Description | HSN | Qty | Rate | Taxable | GST% | SGST | CGST | Total
  // Widths (total 186mm): 7+44+20+9+20+20+14+17+17+18 = 186 ✓
  // HSN: 20 (was 16) — fits 8-digit codes without wrapping
  // GST%: 14 (was 10) — header no longer breaks across two lines
  // Total: 18 (was 16) — fits large amounts
  const itemRows = bill.items.map(item => [
    String(item.itemNo),
    `${item.category}${item.brand ? ' — ' + item.brand : ''}\n${item.description || ''}`.trim(),
    item.hsnCode || '—',
    String(item.quantity),
    item.rate.toFixed(2),
    item.taxableAmount.toFixed(2),
    `${item.gstPercent}%`,
    item.sgstAmount.toFixed(2),
    item.cgstAmount.toFixed(2),
    item.total.toFixed(2),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CW,
    head: [['S.No', 'Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'GST%', 'SGST', 'CGST', 'Total']],
    body: itemRows.length ? itemRows : [['1', '—', '—', '—', '—', '—', '—', '—', '—', '—']],
    columnStyles: {
      0: { halign: 'center', cellWidth: 7  },   // S.No
      1: { cellWidth: 44 },                       // Description
      2: { halign: 'center', cellWidth: 20 },    // HSN — wider for 8-digit codes
      3: { halign: 'center', cellWidth: 9  },    // Qty
      4: { halign: 'right',  cellWidth: 20 },    // Rate
      5: { halign: 'right',  cellWidth: 20 },    // Taxable
      6: { halign: 'center', cellWidth: 14 },    // GST% — wider so header fits on one line
      7: { halign: 'right',  cellWidth: 17 },    // SGST
      8: { halign: 'right',  cellWidth: 17 },    // CGST
      9: { halign: 'right',  cellWidth: 18 },    // Total — wider for large amounts
    },
    headStyles: {
      fillColor: LIGHT_GREY,
      textColor: BLACK,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      lineColor: BORDER,
      lineWidth: 0.3,
      cellPadding: 2,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: BLACK,
      lineColor: BORDER,
      lineWidth: 0.2,
      fillColor: WHITE,
    },
    theme: 'grid',
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ── 6. Totals box (right half) ──
  const totalsX = M + CW / 2;
  const totalsW = CW / 2;

  autoTable(doc, {
    startY: y,
    margin: { left: totalsX, right: M },
    tableWidth: totalsW,
    body: [
      ['Taxable Amount', `Rs. ${bill.taxableAmount.toFixed(2)}`],
      ['SGST',           `Rs. ${bill.totalSgst.toFixed(2)}`],
      ['CGST',           `Rs. ${bill.totalCgst.toFixed(2)}`],
    ],
    columnStyles: {
      0: { fontStyle: 'normal', cellWidth: totalsW * 0.55 },
      1: { halign: 'right',    cellWidth: totalsW * 0.45 },
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: BLACK,
      lineColor: BORDER,
      lineWidth: 0.2,
      fillColor: WHITE,
    },
    theme: 'grid',
  });

  const afterTotals = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ── 7. Grand Total bar (pale orange, full width) ──
  const gtH = 12;
  doc.setFillColor(...PALE_ORANGE);
  doc.rect(M, afterTotals, CW, gtH, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(M, afterTotals, CW, gtH); // border

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text('GRAND TOTAL', M + 5, afterTotals + 8);
  doc.text(`Rs. ${bill.grandTotal.toFixed(2)}`, M + CW - 5, afterTotals + 8, { align: 'right' });

  y = afterTotals + gtH + 2;

  // ── 8. Amount in words ──
  const amtBoxH = 10;
  doc.setFillColor(252, 248, 240); // very light warm tint
  doc.rect(M, y, CW * 0.65, amtBoxH, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.rect(M, y, CW * 0.65, amtBoxH);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(80, 50, 0);
  const wordsText = `Amount: ${bill.amountInWords}`;
  const wrappedWords = doc.splitTextToSize(wordsText, CW * 0.65 - 6);
  doc.text(wrappedWords, M + 3, y + 6);
  y += amtBoxH + 2;

  // Payment mode
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MID_GREY);
  doc.text(`Payment Mode: ${bill.paymentType}`, M + 3, y + 5);
  y += 10;

  // ── 9. Signature row ──
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CW,
    body: [[
      { content: 'Customer Signature\n\n\n', styles: { halign: 'center' as const, minCellHeight: 18 } },
      {
        content: `For ${settings.shopName || 'MANIKKAM & CO'}\n\n\nAuthorised Signatory`,
        styles: { halign: 'center' as const, minCellHeight: 18 },
      },
    ]],
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: BLACK,
      lineColor: BORDER,
      lineWidth: 0.2,
      fillColor: WHITE,
    },
    theme: 'grid',
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

  // ── 10. Footer ──
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...MID_GREY);
  doc.text(
    'Goods once sold cannot be taken back. Warranty as per manufacturer terms.',
    PW / 2, y + 3, { align: 'center' }
  );

  return doc;
};

export const downloadInvoicePDF = (bill: CustomerBill, settings: ShopSettings): void => {
  generateInvoicePDF(bill, settings).save(`${bill.billNo.replace(/\//g, '-')}.pdf`);
};

export const getInvoicePDFBlob = (bill: CustomerBill, settings: ShopSettings): Blob => {
  const doc = generateInvoicePDF(bill, settings);
  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
};
