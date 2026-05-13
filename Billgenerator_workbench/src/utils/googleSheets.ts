import { getToken } from '../lib/googleAuth';
import type { CustomerBill, PurchaseBill, NoSalesDay, MonthSummary } from '../types';
import { makeBillNumber, parseSequence } from './billNumber';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID_KEY = 'mc-sheet-id';

export const TAB_CUSTOMER = 'CustomerBills';
export const TAB_PURCHASE = 'PurchaseBills';
export const TAB_NOSALES = 'NoSalesDays';
export const TAB_SETTINGS = 'Settings';

const CUSTOMER_HEADERS = [
  'id', 'billNo', 'date', 'customerName', 'customerPhone', 'customerAddress',
  'customerGstin', 'vehicleNumber', 'paymentType', 'items', 'taxableAmount', 'totalSgst',
  'totalCgst', 'grandTotal', 'amountInWords', 'driveFileId', 'driveLink',
  'status', 'createdAt',
];

const PURCHASE_HEADERS = [
  'id', 'date', 'vendorName', 'vendorGstin', 'invoiceNo', 'totalAmount',
  'gstAmount', 'taxableAmount', 'hsnCode', 'cgstRate', 'cgstAmount',
  'sgstRate', 'sgstAmount', 'category', 'notes', 'driveFileId', 'driveLink', 'uploadedAt', 'items',
];

const NOSALES_HEADERS = [
  'id', 'date', 'month', 'year', 'reason', 'declarationDriveId', 'createdAt',
];

const SETTINGS_HEADERS = ['key', 'value'];

const sheetsReq = async (path: string, options: RequestInit = {}) => {
  const token = await getToken();
  const res = await fetch(`${SHEETS_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  return res.json();
};

const getSheetId = (): string | null => localStorage.getItem(SHEET_ID_KEY);
const setSheetId = (id: string) => localStorage.setItem(SHEET_ID_KEY, id);

export const initSheets = async (): Promise<string> => {
  const existing = getSheetId();
  if (existing) return existing;

  const data = await sheetsReq('', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: 'Manikkam&Co-BillingData' },
      sheets: [
        { properties: { title: TAB_CUSTOMER, sheetId: 0 } },
        { properties: { title: TAB_PURCHASE, sheetId: 1 } },
        { properties: { title: TAB_NOSALES, sheetId: 2 } },
        { properties: { title: TAB_SETTINGS, sheetId: 3 } },
      ],
    }),
  });

  const id: string = data.spreadsheetId;
  setSheetId(id);

  // Write headers for each tab
  await appendValues(id, `${TAB_CUSTOMER}!A1`, [CUSTOMER_HEADERS]);
  await appendValues(id, `${TAB_PURCHASE}!A1`, [PURCHASE_HEADERS]);
  await appendValues(id, `${TAB_NOSALES}!A1`, [NOSALES_HEADERS]);
  await appendValues(id, `${TAB_SETTINGS}!A1`, [SETTINGS_HEADERS]);
  // Seed initial bill sequence
  await appendValues(id, `${TAB_SETTINGS}!A2`, [['lastBillSeq', '0']]);

  return id;
};

const appendValues = async (sheetId: string, range: string, values: (string | number)[][]): Promise<void> => {
  await sheetsReq(
    `/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values }) },
  );
};

const readValues = async (sheetId: string, range: string): Promise<string[][]> => {
  const data = await sheetsReq(`/${sheetId}/values/${encodeURIComponent(range)}`);
  return (data.values as string[][] | undefined) ?? [];
};

const updateValues = async (sheetId: string, range: string, values: (string | number)[][]): Promise<void> => {
  await sheetsReq(
    `/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values }) },
  );
};

const billToRow = (bill: CustomerBill) => [
  bill.id, bill.billNo, bill.date, bill.customerName, bill.customerPhone,
  bill.customerAddress ?? '', bill.customerGstin ?? '', bill.vehicleNumber ?? '',
  bill.paymentType, JSON.stringify(bill.items), bill.taxableAmount, bill.totalSgst,
  bill.totalCgst, bill.grandTotal, bill.amountInWords, bill.driveFileId ?? '',
  bill.driveLink ?? '', bill.status, bill.createdAt,
];

const rowToBill = (r: string[]): CustomerBill => ({
  id: r[0] ?? '',
  billNo: r[1] ?? '',
  date: r[2] ?? '',
  customerName: r[3] ?? '',
  customerPhone: r[4] ?? '',
  customerAddress: r[5] ?? '',
  customerGstin: r[6] ?? '',
  vehicleNumber: r[7] ?? '',
  paymentType: (r[8] as CustomerBill['paymentType']) ?? 'Cash',
  items: (() => { try { return JSON.parse(r[9] ?? '[]'); } catch { return []; } })(),
  taxableAmount: parseFloat(r[10] ?? '0') || 0,
  totalSgst: parseFloat(r[11] ?? '0') || 0,
  totalCgst: parseFloat(r[12] ?? '0') || 0,
  grandTotal: parseFloat(r[13] ?? '0') || 0,
  amountInWords: r[14] ?? '',
  driveFileId: r[15] ?? '',
  driveLink: r[16] ?? '',
  status: (r[17] as CustomerBill['status']) ?? 'active',
  createdAt: r[18] ?? '',
});

export const appendCustomerBill = async (bill: CustomerBill): Promise<void> => {
  const id = await initSheets();
  await appendValues(id, `${TAB_CUSTOMER}!A:S`, [billToRow(bill)]);
};

export const updateCustomerBill = async (bill: CustomerBill): Promise<void> => {
  const id = await initSheets();
  const rows = await readValues(id, `${TAB_CUSTOMER}!A:S`);
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === bill.id);
  if (rowIndex === -1) {
    await appendCustomerBill(bill);
    return;
  }
  const sheetRow = rowIndex + 1;
  await updateValues(id, `${TAB_CUSTOMER}!A${sheetRow}:S${sheetRow}`, [billToRow(bill)]);
};

export const getCustomerBills = async (year?: number, month?: number): Promise<CustomerBill[]> => {
  const id = getSheetId();
  if (!id) return [];
  try {
    const rows = await readValues(id, `${TAB_CUSTOMER}!A:S`);
    if (rows.length <= 1) return [];
    const bills = rows.slice(1).map(rowToBill);

    if (year !== undefined && month !== undefined) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return bills.filter(b => b.date.startsWith(prefix));
    }
    if (year !== undefined) {
      return bills.filter(b => b.date.startsWith(String(year)));
    }
    return bills;
  } catch {
    return [];
  }
};

export const appendPurchaseBill = async (pb: PurchaseBill): Promise<void> => {
  const id = await initSheets();
  await appendValues(id, `${TAB_PURCHASE}!A:S`, [[
    pb.id, pb.date, pb.vendorName, pb.vendorGstin ?? '', pb.invoiceNo,
    pb.totalAmount, pb.gstAmount ?? '',
    pb.taxableAmount ?? '', pb.hsnCode ?? '',
    pb.cgstRate ?? '', pb.cgstAmount ?? '',
    pb.sgstRate ?? '', pb.sgstAmount ?? '',
    pb.category ?? '', pb.notes ?? '',
    pb.driveFileId ?? '', pb.driveLink ?? '', pb.uploadedAt,
    pb.items ? JSON.stringify(pb.items) : '',
  ]]);
};

export const getPurchaseBills = async (year?: number, month?: number): Promise<PurchaseBill[]> => {
  const id = getSheetId();
  if (!id) return [];
  try {
    const rows = await readValues(id, `${TAB_PURCHASE}!A:S`);
    if (rows.length <= 1) return [];
    const bills = rows.slice(1).map(r => ({
      id: r[0] ?? '',
      date: r[1] ?? '',
      vendorName: r[2] ?? '',
      vendorGstin: r[3] ?? '',
      invoiceNo: r[4] ?? '',
      totalAmount: parseFloat(r[5] ?? '0') || 0,
      gstAmount: parseFloat(r[6] ?? '0') || 0,
      taxableAmount: parseFloat(r[7] ?? '0') || 0,
      hsnCode: r[8] ?? '',
      cgstRate: parseFloat(r[9] ?? '0') || 0,
      cgstAmount: parseFloat(r[10] ?? '0') || 0,
      sgstRate: parseFloat(r[11] ?? '0') || 0,
      sgstAmount: parseFloat(r[12] ?? '0') || 0,
      category: r[13] ?? '',
      notes: r[14] ?? '',
      driveFileId: r[15] ?? '',
      driveLink: r[16] ?? '',
      uploadedAt: r[17] ?? '',
      items: (() => { try { return JSON.parse(r[18] ?? '[]'); } catch { return []; } })(),
    }));

    if (year !== undefined && month !== undefined) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return bills.filter(b => b.date.startsWith(prefix));
    }
    return bills;
  } catch {
    return [];
  }
};

export const appendNoSalesDay = async (ns: NoSalesDay): Promise<void> => {
  const id = await initSheets();
  await appendValues(id, `${TAB_NOSALES}!A:G`, [[
    ns.id, ns.date, ns.month, ns.year, ns.reason ?? '',
    ns.declarationDriveId ?? '', ns.createdAt,
  ]]);
};

export const getNoSalesDays = async (year: number, month: number): Promise<NoSalesDay[]> => {
  const id = getSheetId();
  if (!id) return [];
  try {
    const rows = await readValues(id, `${TAB_NOSALES}!A:G`);
    if (rows.length <= 1) return [];
    return rows.slice(1)
      .filter(r => parseInt(r[3] ?? '0') === year && parseInt(r[2] ?? '0') === month)
      .map(r => ({
        id: r[0] ?? '',
        date: r[1] ?? '',
        month: parseInt(r[2] ?? '0'),
        year: parseInt(r[3] ?? '0'),
        reason: r[4] ?? '',
        declarationDriveId: r[5] ?? '',
        createdAt: r[6] ?? '',
      }));
  } catch {
    return [];
  }
};

export const getSetting = async (key: string): Promise<string> => {
  const id = getSheetId();
  if (!id) return '';
  try {
    const rows = await readValues(id, `${TAB_SETTINGS}!A:B`);
    const found = rows.find(r => r[0] === key);
    return found?.[1] ?? '';
  } catch {
    return '';
  }
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  const id = await initSheets();
  const rows = await readValues(id, `${TAB_SETTINGS}!A:B`);
  const rowIndex = rows.findIndex(r => r[0] === key);

  if (rowIndex === -1) {
    await appendValues(id, `${TAB_SETTINGS}!A:B`, [[key, value]]);
  } else {
    const range = `${TAB_SETTINGS}!A${rowIndex + 1}:B${rowIndex + 1}`;
    await updateValues(id, range, [[key, value]]);
  }
};

export const getNextBillNumber = async (): Promise<string> => {
  try {
    const id = await initSheets();
    const rows = await readValues(id, `${TAB_SETTINGS}!A:B`);
    const seqRow = rows.find(r => r[0] === 'lastBillSeq');
    const currentSeq = seqRow ? parseInt(seqRow[1] ?? '0', 10) : 0;
    const nextSeq = currentSeq + 1;
    await setSetting('lastBillSeq', String(nextSeq));
    return makeBillNumber(nextSeq);
  } catch {
    // Fallback to local
    const LOCAL_SEQ = 'mc-local-seq';
    const raw = localStorage.getItem(LOCAL_SEQ);
    const seq = raw ? parseInt(raw, 10) + 1 : 1;
    localStorage.setItem(LOCAL_SEQ, String(seq));
    return makeBillNumber(seq);
  }
};

export const getMonthSummary = async (year: number, month: number): Promise<MonthSummary> => {
  try {
    const [bills, purchases, noSales] = await Promise.all([
      getCustomerBills(year, month),
      getPurchaseBills(year, month),
      getNoSalesDays(year, month),
    ]);

    const activeBills = bills.filter(b => b.status === 'active');
    const totalSales = activeBills.reduce((s, b) => s + b.grandTotal, 0);
    const totalSgst = activeBills.reduce((s, b) => s + b.totalSgst, 0);
    const totalCgst = activeBills.reduce((s, b) => s + b.totalCgst, 0);

    // Count days in month that have no bills and no declaration
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const billDates = new Set(activeBills.map(b => b.date));
    const declarationDates = new Set(noSales.map(n => n.date));

    let missingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(dateStr + 'T00:00:00');
      if (dayDate > today) break;
      const dow = dayDate.getDay(); // 0=Sun, 6=Sat
      if (dow === 0) continue; // Skip Sundays (optional)
      if (!billDates.has(dateStr) && !declarationDates.has(dateStr)) {
        missingDays++;
      }
    }

    return {
      totalBills: activeBills.length,
      totalPurchaseBills: purchases.length,
      totalSales,
      totalSgst,
      totalCgst,
      missingDays,
    };
  } catch {
    return { totalBills: 0, totalPurchaseBills: 0, totalSales: 0, totalSgst: 0, totalCgst: 0, missingDays: 0 };
  }
};

// Re-export getSheetId for UI use
export { getSheetId };

// Keep old function names for backward compat
export const initSheet = initSheets;
export const getSheetBillsForMonth = getCustomerBills;

// Parse sequence from bill number (re-export)
export { parseSequence };
