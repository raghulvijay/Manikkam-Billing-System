import ExcelJS from 'exceljs';
import type { CustomerBill, PurchaseBill } from '../types';
import { getMonthName } from './dateFormat';

// ── Palette ──
const C_HDR_BG  = 'FF0F4C35'; // dark green — column header bg
const C_HDR_FG  = 'FFFFFFFF'; // white — column header text
const C_ALT     = 'FFE8F5F0'; // light green — alternate row
const C_TOTAL   = 'FFFFF3CD'; // light amber — totals row
const C_TITLE   = 'FF1B5E20'; // deep green — sheet title
const C_SEC     = 'FFE3F2FD'; // light blue — section header in summary
const C_SEC_FG  = 'FF0D47A1'; // dark blue — section header text
const C_BLANK   = 'FFFFFFFF';

// ── Helpers ──
const applyHdr = (ws: ExcelJS.Worksheet, rowNum: number, colCount: number) => {
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(rowNum, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_HDR_BG } };
    cell.font = { bold: true, color: { argb: C_HDR_FG }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  }
};

const applyData = (cell: ExcelJS.Cell, even: boolean) => {
  if (even) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_ALT } };
  cell.border = {
    top: { style: 'hair' }, bottom: { style: 'hair' },
    left: { style: 'hair' }, right: { style: 'hair' },
  };
  cell.alignment = { vertical: 'middle', wrapText: true };
};

const applyTotal = (ws: ExcelJS.Worksheet, rowNum: number, colCount: number) => {
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(rowNum, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_TOTAL } };
    cell.font = { bold: true, size: 10 };
    cell.border = {
      top: { style: 'medium' }, bottom: { style: 'medium' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    cell.alignment = { vertical: 'middle', wrapText: true };
  }
};

const INR = '₹#,##0.00';
const NUM = '0.##';

// ── Bill row expander: one Excel row per item ──
const expandBillItems = (bills: CustomerBill[], includeGstin: boolean) =>
  bills.flatMap(b =>
    b.items.map(item => ({
      billNo: b.billNo,
      date: b.date,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerGstin: b.customerGstin ?? '',
      vehicleNumber: b.vehicleNumber ?? '',
      paymentType: b.paymentType,
      hsnCode: item.hsnCode || '—',
      description: [item.category, item.brand ? `(${item.brand})` : '', item.description]
        .filter(Boolean).join(' '),
      quantity: item.quantity,
      rate: item.rate,
      taxableAmount: item.taxableAmount,
      gstPercent: item.gstPercent,
      sgstPercent: item.sgstPercent,
      sgstAmount: item.sgstAmount,
      cgstPercent: item.cgstPercent,
      cgstAmount: item.cgstAmount,
      total: item.total,
    })),
  );

export const exportMonthlyExcel = async (
  year: number,
  month: number,
  bills: CustomerBill[],
  purchaseBills: PurchaseBill[],
): Promise<void> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MANIKKAM & CO Billing';
  wb.created = new Date();

  const monthLabel = `${getMonthName(month)} ${year}`;
  const b2bBills  = bills.filter(b => b.customerGstin?.trim());
  const b2cBills  = bills.filter(b => !b.customerGstin?.trim());

  // ── Aggregators ──
  const sum = (arr: CustomerBill[], key: keyof CustomerBill) =>
    arr.reduce((s, b) => s + (b[key] as number), 0);

  const b2bTaxable = sum(b2bBills, 'taxableAmount');
  const b2bSgst    = sum(b2bBills, 'totalSgst');
  const b2bCgst    = sum(b2bBills, 'totalCgst');
  const b2bTotal   = sum(b2bBills, 'grandTotal');

  const b2cTaxable = sum(b2cBills, 'taxableAmount');
  const b2cSgst    = sum(b2cBills, 'totalSgst');
  const b2cCgst    = sum(b2cBills, 'totalCgst');
  const b2cTotal   = sum(b2cBills, 'grandTotal');

  const purTotal   = purchaseBills.reduce((s, p) => s + p.totalAmount, 0);
  const purGst     = purchaseBills.reduce((s, p) => s + (p.cgstAmount ?? 0) + (p.sgstAmount ?? 0) || (p.gstAmount ?? 0), 0);

  // ════════════════════════════════════════════
  // SHEET 1 — GSTR1 Report (Summary)
  // ════════════════════════════════════════════
  const wsRpt = wb.addWorksheet('GSTR1 Report');
  wsRpt.views = [{ showGridLines: false }];

  // Title
  wsRpt.mergeCells('A1:F1');
  const titleCell = wsRpt.getCell('A1');
  titleCell.value = `GSTR-1 REPORT — MANIKKAM & CO  |  ${monthLabel}`;
  titleCell.font = { bold: true, size: 14, color: { argb: C_HDR_FG } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_TITLE } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRpt.getRow(1).height = 30;

  const addSummarySection = (
    ws: ExcelJS.Worksheet,
    startRow: number,
    title: string,
    rows: [string, string | number, string | number, string | number, string | number][],
  ) => {
    // Section header
    ws.mergeCells(startRow, 1, startRow, 6);
    const sh = ws.getCell(startRow, 1);
    sh.value = title;
    sh.font = { bold: true, size: 11, color: { argb: C_SEC_FG } };
    sh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_SEC } };
    sh.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(startRow).height = 22;
    startRow++;

    // Sub-header
    const labels = ['', 'Bills', 'Taxable Amount', 'SGST', 'CGST', 'Grand Total'];
    const subRow = ws.getRow(startRow);
    labels.forEach((l, i) => {
      const cell = subRow.getCell(i + 1);
      cell.value = l;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_HDR_BG } };
      cell.font = { bold: true, color: { argb: C_HDR_FG }, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    ws.getRow(startRow).height = 18;
    startRow++;

    rows.forEach(([label, bills, taxable, sgst, cgst], ri) => {
      const r = ws.getRow(startRow + ri);
      [label, bills, taxable, sgst, cgst, typeof taxable === 'number' ? taxable + (sgst as number) + (cgst as number) : ''].forEach((v, ci) => {
        const cell = r.getCell(ci + 1);
        cell.value = v;
        if (ri % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_ALT } };
        cell.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } };
        cell.alignment = { vertical: 'middle', horizontal: ci === 0 ? 'left' : 'right', indent: ci === 0 ? 1 : 0 };
        if (ci >= 2) cell.numFmt = INR;
      });
      r.height = 18;
    });

    return startRow + rows.length + 1;
  };

  wsRpt.columns = [
    { key: 'A', width: 28 },
    { key: 'B', width: 12 },
    { key: 'C', width: 18 },
    { key: 'D', width: 16 },
    { key: 'E', width: 16 },
    { key: 'F', width: 18 },
  ];

  let nextRow = 3;
  nextRow = addSummarySection(wsRpt, nextRow, 'B2B — Sales to Registered Businesses (with Customer GSTIN)', [
    ['B2B Bills', b2bBills.length, b2bTaxable, b2bSgst, b2bCgst],
  ]);
  nextRow = addSummarySection(wsRpt, nextRow, 'B2C — Sales to Unregistered Customers (no GSTIN)', [
    ['B2C Bills', b2cBills.length, b2cTaxable, b2cSgst, b2cCgst],
  ]);

  // Grand total
  nextRow++;
  wsRpt.mergeCells(nextRow, 1, nextRow, 6);
  const gtTitle = wsRpt.getCell(nextRow, 1);
  gtTitle.value = 'TOTAL SALES (B2B + B2C)';
  gtTitle.font = { bold: true, size: 11, color: { argb: C_HDR_FG } };
  gtTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_TITLE } };
  gtTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  wsRpt.getRow(nextRow).height = 22;
  nextRow++;

  const gtData: [string, number, number, number, number][] = [
    ['Combined Total', bills.length,
      b2bTaxable + b2cTaxable, b2bSgst + b2cSgst, b2bCgst + b2cCgst],
  ];
  gtData.forEach(([label, count, taxable, sgst, cgst]) => {
    const r = wsRpt.getRow(nextRow);
    [label, count, taxable, sgst, cgst, taxable + sgst + cgst].forEach((v, ci) => {
      const cell = r.getCell(ci + 1);
      cell.value = v;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_TOTAL } };
      cell.font = { bold: true, size: 11 };
      cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'middle', horizontal: ci === 0 ? 'left' : 'right', indent: ci === 0 ? 1 : 0 };
      if (ci >= 2) cell.numFmt = INR;
    });
    wsRpt.getRow(nextRow).height = 22;
    nextRow++;
  });

  // Purchase summary
  nextRow++;
  nextRow = addSummarySection(wsRpt, nextRow, 'Purchase Bills', [
    ['Purchases', purchaseBills.length, purTotal - purGst, purGst, 0],
  ]);

  // ════════════════════════════════════════════
  // SHEET 2 — B2B (customer has GSTIN)
  // ════════════════════════════════════════════
  const wsB2B = wb.addWorksheet('B2B');
  wsB2B.views = [{ showGridLines: false }];

  wsB2B.columns = [
    { key: 'billNo',        width: 20 },
    { key: 'date',          width: 12 },
    { key: 'customerName',  width: 24 },
    { key: 'customerGstin', width: 18 },
    { key: 'vehicleNumber', width: 14 },
    { key: 'paymentType',   width: 14 },
    { key: 'hsnCode',       width: 12 },
    { key: 'description',   width: 32 },
    { key: 'quantity',      width: 7  },
    { key: 'rate',          width: 14 },
    { key: 'taxableAmount', width: 16 },
    { key: 'gstPercent',    width: 8  },
    { key: 'sgstAmount',    width: 14 },
    { key: 'cgstAmount',    width: 14 },
    { key: 'total',         width: 16 },
  ];

  // Title row
  wsB2B.mergeCells(1, 1, 1, 15);
  const b2bTitle = wsB2B.getCell('A1');
  b2bTitle.value = `B2B — Sales to Registered Businesses  |  ${monthLabel}`;
  b2bTitle.font = { bold: true, size: 12, color: { argb: C_HDR_FG } };
  b2bTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_TITLE } };
  b2bTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsB2B.getRow(1).height = 26;

  wsB2B.addRow([
    'Bill No', 'Date', 'Customer Name', 'Customer GSTIN', 'Vehicle No', 'Payment',
    'HSN Code', 'Description', 'Qty', 'Rate (₹)',
    'Taxable (₹)', 'GST%', 'SGST (₹)', 'CGST (₹)', 'Total (₹)',
  ]);
  applyHdr(wsB2B, 2, 15);
  wsB2B.getRow(2).height = 20;

  const b2bRows = expandBillItems(b2bBills, true);
  b2bRows.forEach((r, i) => {
    const row = wsB2B.addRow([
      r.billNo, r.date, r.customerName, r.customerGstin, r.vehicleNumber,
      r.paymentType, r.hsnCode, r.description, r.quantity, r.rate,
      r.taxableAmount, `${r.gstPercent}%`, r.sgstAmount, r.cgstAmount, r.total,
    ]);
    row.eachCell(cell => applyData(cell, i % 2 === 1));
    row.getCell(9).numFmt  = NUM;
    [10, 11, 13, 14, 15].forEach(c => { row.getCell(c).numFmt = INR; });
    [9, 10, 11, 12, 13, 14, 15].forEach(c => {
      row.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' };
    });
  });

  // B2B totals row
  const b2bTotalRow = wsB2B.addRow([
    'TOTAL', '', '', '', '', '', '', '',
    b2bBills.flatMap(b => b.items).reduce((s, it) => s + it.quantity, 0),
    '',
    b2bTaxable, '', b2bSgst, b2bCgst, b2bTotal,
  ]);
  applyTotal(wsB2B, b2bTotalRow.number, 15);
  b2bTotalRow.getCell(1).value = 'TOTAL';
  [11, 13, 14, 15].forEach(c => { b2bTotalRow.getCell(c).numFmt = INR; });

  // ════════════════════════════════════════════
  // SHEET 3 — B2C (customer has no GSTIN)
  // ════════════════════════════════════════════
  const wsB2C = wb.addWorksheet('B2C');
  wsB2C.views = [{ showGridLines: false }];

  wsB2C.columns = [
    { key: 'billNo',        width: 20 },
    { key: 'date',          width: 12 },
    { key: 'customerName',  width: 24 },
    { key: 'customerPhone', width: 14 },
    { key: 'vehicleNumber', width: 14 },
    { key: 'paymentType',   width: 14 },
    { key: 'hsnCode',       width: 12 },
    { key: 'description',   width: 32 },
    { key: 'quantity',      width: 7  },
    { key: 'rate',          width: 14 },
    { key: 'taxableAmount', width: 16 },
    { key: 'gstPercent',    width: 8  },
    { key: 'sgstAmount',    width: 14 },
    { key: 'cgstAmount',    width: 14 },
    { key: 'total',         width: 16 },
  ];

  wsB2C.mergeCells(1, 1, 1, 15);
  const b2cTitle = wsB2C.getCell('A1');
  b2cTitle.value = `B2C — Sales to Unregistered Customers  |  ${monthLabel}`;
  b2cTitle.font = { bold: true, size: 12, color: { argb: C_HDR_FG } };
  b2cTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_TITLE } };
  b2cTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsB2C.getRow(1).height = 26;

  wsB2C.addRow([
    'Bill No', 'Date', 'Customer Name', 'Phone', 'Vehicle No', 'Payment',
    'HSN Code', 'Description', 'Qty', 'Rate (₹)',
    'Taxable (₹)', 'GST%', 'SGST (₹)', 'CGST (₹)', 'Total (₹)',
  ]);
  applyHdr(wsB2C, 2, 15);
  wsB2C.getRow(2).height = 20;

  const b2cRows = expandBillItems(b2cBills, false);
  b2cRows.forEach((r, i) => {
    const row = wsB2C.addRow([
      r.billNo, r.date, r.customerName, r.customerPhone, r.vehicleNumber,
      r.paymentType, r.hsnCode, r.description, r.quantity, r.rate,
      r.taxableAmount, `${r.gstPercent}%`, r.sgstAmount, r.cgstAmount, r.total,
    ]);
    row.eachCell(cell => applyData(cell, i % 2 === 1));
    row.getCell(9).numFmt  = NUM;
    [10, 11, 13, 14, 15].forEach(c => { row.getCell(c).numFmt = INR; });
    [9, 10, 11, 12, 13, 14, 15].forEach(c => {
      row.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' };
    });
  });

  const b2cTotalRow = wsB2C.addRow([
    'TOTAL', '', '', '', '', '', '', '',
    b2cBills.flatMap(b => b.items).reduce((s, it) => s + it.quantity, 0),
    '',
    b2cTaxable, '', b2cSgst, b2cCgst, b2cTotal,
  ]);
  applyTotal(wsB2C, b2cTotalRow.number, 15);
  [11, 13, 14, 15].forEach(c => { b2cTotalRow.getCell(c).numFmt = INR; });

  // ════════════════════════════════════════════
  // SHEET 4 — Purchase Bills
  // ════════════════════════════════════════════
  const wsPur = wb.addWorksheet('Purchase Bills');
  wsPur.views = [{ showGridLines: false }];

  wsPur.columns = [
    { key: 'date',         width: 12 },
    { key: 'vendorName',   width: 26 },
    { key: 'vendorGstin',  width: 20 },
    { key: 'invoiceNo',    width: 14 },
    { key: 'hsnCode',      width: 14 },
    { key: 'category',     width: 16 },
    { key: 'taxable',      width: 16 },
    { key: 'cgstRate',     width: 8  },
    { key: 'cgstAmount',   width: 14 },
    { key: 'sgstRate',     width: 8  },
    { key: 'sgstAmount',   width: 14 },
    { key: 'totalAmount',  width: 16 },
    { key: 'notes',        width: 24 },
  ];

  wsPur.mergeCells(1, 1, 1, 13);
  const purTitle = wsPur.getCell('A1');
  purTitle.value = `Purchase Bills  |  ${monthLabel}`;
  purTitle.font = { bold: true, size: 12, color: { argb: C_HDR_FG } };
  purTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_TITLE } };
  purTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsPur.getRow(1).height = 26;

  wsPur.addRow([
    'Date', 'Vendor Name', 'Vendor GSTIN', 'Invoice No',
    'HSN Code', 'Category', 'Taxable (₹)', 'CGST%', 'CGST (₹)', 'SGST%', 'SGST (₹)',
    'Total (₹)', 'Notes',
  ]);
  applyHdr(wsPur, 2, 13);
  wsPur.getRow(2).height = 20;

  let purRowIdx = 0;
  purchaseBills.forEach(pb => {
    const cgst = pb.cgstAmount ?? 0;
    const sgst = pb.sgstAmount ?? 0;
    const taxable = pb.taxableAmount ?? (pb.totalAmount - (pb.gstAmount ?? 0));

    if (pb.items && pb.items.length > 0) {
      // One row per item — GST columns only on first row of each bill
      pb.items.forEach((item, itemIdx) => {
        const isFirst = itemIdx === 0;
        const row = wsPur.addRow([
          pb.date, pb.vendorName, pb.vendorGstin ?? '—',
          isFirst ? pb.invoiceNo : '',
          item.hsnCode || '—', pb.category || '—',
          item.amount,
          isFirst ? (pb.cgstRate ?? '') : '',
          isFirst ? cgst : '',
          isFirst ? (pb.sgstRate ?? '') : '',
          isFirst ? sgst : '',
          isFirst ? pb.totalAmount : '',
          isFirst ? (pb.notes ?? '') : '',
        ]);
        row.eachCell(cell => applyData(cell, purRowIdx % 2 === 1));
        // Description note inside col 2 (vendor name shows item description for non-first rows)
        if (!isFirst) {
          row.getCell(2).value = `  → ${item.description}`;
          row.getCell(2).font = { italic: true, color: { argb: '666666' } };
        } else {
          // Append item description to vendor name cell on first row
          row.getCell(2).value = pb.vendorName;
        }
        // Add item description as merged note in col 5 (HSN col already has HSN)
        // Actually let me use col 6 (category) for item description on each row
        row.getCell(6).value = item.description || pb.category || '—';
        [7, 9, 11, 12].forEach(c => {
          if (row.getCell(c).value !== '') {
            row.getCell(c).numFmt = INR;
            row.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' };
          }
        });
        [8, 10].forEach(c => {
          if (row.getCell(c).value !== '') {
            row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
        purRowIdx++;
      });
    } else {
      const row = wsPur.addRow([
        pb.date, pb.vendorName, pb.vendorGstin ?? '—', pb.invoiceNo,
        pb.hsnCode || '—', pb.category || '—',
        taxable, pb.cgstRate ?? '', cgst, pb.sgstRate ?? '', sgst,
        pb.totalAmount, pb.notes ?? '',
      ]);
      row.eachCell(cell => applyData(cell, purRowIdx % 2 === 1));
      [7, 9, 11, 12].forEach(c => {
        row.getCell(c).numFmt = INR;
        row.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' };
      });
      [8, 10].forEach(c => {
        row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
      });
      purRowIdx++;
    }
  });

  const purTaxable = purchaseBills.reduce((s, p) => s + (p.taxableAmount ?? (p.totalAmount - (p.gstAmount ?? 0))), 0);
  const purCgst = purchaseBills.reduce((s, p) => s + (p.cgstAmount ?? 0), 0);
  const purSgst = purchaseBills.reduce((s, p) => s + (p.sgstAmount ?? 0), 0);

  const purTotalRow = wsPur.addRow([
    'TOTAL', '', '', '', '', '',
    purTaxable, '', purCgst, '', purSgst, purTotal, '',
  ]);
  applyTotal(wsPur, purTotalRow.number, 13);
  [7, 9, 11, 12].forEach(c => {
    purTotalRow.getCell(c).numFmt = INR;
    purTotalRow.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' };
  });

  // ── Download ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GSTR1-${monthLabel.replace(' ', '-')}-MANIKKAM-CO.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
