import { getToken } from '../lib/googleAuth';
import type { CustomerBill, PurchaseBill, NoSalesDay, MonthSummary } from '../types';
import { makeBillNumber, parseSequence } from './billNumber';

const SHEETS_BASE  = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID_KEY = 'mc-billing-v2-id';
const SHEET_NAME   = 'MANIKKAM_BILLING_DATA';
const LAST_BILL_KEY = 'LAST_BILL_NUMBER';
const LOCAL_SEQ_KEY = 'mc-local-seq';

export const TAB_CUSTOMER = 'CustomerBills';
export const TAB_ITEMS    = 'InvoiceItems';
export const TAB_PURCHASE = 'PurchaseBills';
export const TAB_MANUAL   = 'ManualBills';
export const TAB_NOSALES  = 'NoSalesDays';
export const TAB_SETTINGS = 'Settings';

// CustomerBills A:U (21 cols)
const CUSTOMER_HEADERS = [
  'id','billNo','date','year','month',
  'customerName','customerPhone','customerAddress','customerGstin','vehicleNumber',
  'paymentType','billType',
  'taxableAmount','totalSgst','totalCgst','grandTotal','amountInWords',
  'driveFileId','driveLink','status','createdAt',
];

// InvoiceItems A:K (11 cols)
const ITEMS_HEADERS = [
  'billNo','billDate','itemNo','description','brand','category',
  'hsnCode','gstPercent','quantity','rate','amount',
];

// PurchaseBills A:Q (17 cols)
const PURCHASE_HEADERS = [
  'id','date','vendorName','vendorGstin','invoiceNo',
  'totalAmount','taxableAmount','cgstRate','cgstAmount','sgstRate','sgstAmount',
  'category','notes','driveFileId','driveLink','uploadedAt','itemsJson',
];

const MANUAL_HEADERS  = ['id','date','description','amount','notes','createdAt'];
const NOSALES_HEADERS = ['id','date','month','year','reason','declarationDriveId','createdAt'];
const SETTINGS_HEADERS = ['key','value'];

// ── Low-level request ──────────────────────────────────────────────────────

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
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Sheets API ${res.status}: ${text}`);
  }
  return res.json();
};

const getSheetId = (): string | null => localStorage.getItem(SHEET_ID_KEY);
const setSheetId = (id: string) => localStorage.setItem(SHEET_ID_KEY, id);

// ── Spreadsheet init ──────────────────────────────────────────────────────

export const initSheets = async (): Promise<string> => {
  const existing = getSheetId();
  if (existing) return existing;

  const data = await sheetsReq('', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: SHEET_NAME },
      sheets: [
        { properties: { title: TAB_CUSTOMER, sheetId: 0 } },
        { properties: { title: TAB_ITEMS,    sheetId: 1 } },
        { properties: { title: TAB_PURCHASE, sheetId: 2 } },
        { properties: { title: TAB_MANUAL,   sheetId: 3 } },
        { properties: { title: TAB_NOSALES,  sheetId: 4 } },
        { properties: { title: TAB_SETTINGS, sheetId: 5 } },
      ],
    }),
  });

  const id: string = data.spreadsheetId;
  setSheetId(id);

  await Promise.all([
    appendValues(id, `${TAB_CUSTOMER}!A1`,  [CUSTOMER_HEADERS]),
    appendValues(id, `${TAB_ITEMS}!A1`,     [ITEMS_HEADERS]),
    appendValues(id, `${TAB_PURCHASE}!A1`,  [PURCHASE_HEADERS]),
    appendValues(id, `${TAB_MANUAL}!A1`,    [MANUAL_HEADERS]),
    appendValues(id, `${TAB_NOSALES}!A1`,   [NOSALES_HEADERS]),
    appendValues(id, `${TAB_SETTINGS}!A1`,  [SETTINGS_HEADERS]),
  ]);
  await appendValues(id, `${TAB_SETTINGS}!A2`, [[LAST_BILL_KEY, '']]);

  return id;
};

// ── Value primitives ──────────────────────────────────────────────────────

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

// ── Settings ───────────────────────────────────────────────────────────────

export const getSetting = async (key: string): Promise<string> => {
  const id = getSheetId();
  if (!id) return '';
  try {
    const rows = await readValues(id, `${TAB_SETTINGS}!A:B`);
    return rows.find(r => r[0] === key)?.[1] ?? '';
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
    await updateValues(id, `${TAB_SETTINGS}!A${rowIndex + 1}:B${rowIndex + 1}`, [[key, value]]);
  }
};

// ── Bill number ────────────────────────────────────────────────────────────

export const getNextBillNumber = async (): Promise<string> => {
  try {
    const id = await initSheets();
    const rows = await readValues(id, `${TAB_SETTINGS}!A:B`);
    const lastBill = rows.find(r => r[0] === LAST_BILL_KEY)?.[1] ?? '';
    const nextSeq = (parseSequence(lastBill) ?? 0) + 1;
    const nextBill = makeBillNumber(nextSeq);
    await setSetting(LAST_BILL_KEY, nextBill);
    return nextBill;
  } catch {
    const raw = localStorage.getItem(LOCAL_SEQ_KEY);
    const seq = raw ? parseInt(raw, 10) + 1 : 1;
    localStorage.setItem(LOCAL_SEQ_KEY, String(seq));
    return makeBillNumber(seq);
  }
};

// ── Sheet GIDs (numeric, needed for batchUpdate row deletion) ─────────────

export const getSheetGids = async (spreadsheetId: string): Promise<Record<string, number>> => {
  const data = await sheetsReq(`/${spreadsheetId}?fields=sheets.properties`);
  const gids: Record<string, number> = {};
  for (const s of (data.sheets ?? []) as Array<{ properties: { title: string; sheetId: number } }>) {
    gids[s.properties.title] = s.properties.sheetId;
  }
  return gids;
};

// ── CustomerBill ↔ row ─────────────────────────────────────────────────────

const billToRow = (bill: CustomerBill): (string | number)[] => {
  const d = new Date(bill.date + 'T00:00:00');
  return [
    bill.id, bill.billNo, bill.date,
    d.getFullYear(), d.getMonth() + 1,
    bill.customerName, bill.customerPhone,
    bill.customerAddress ?? '', bill.customerGstin ?? '', bill.vehicleNumber ?? '',
    bill.paymentType, 'customer',
    bill.taxableAmount, bill.totalSgst, bill.totalCgst, bill.grandTotal, bill.amountInWords,
    bill.driveFileId ?? '', bill.driveLink ?? '',
    bill.status, bill.createdAt,
  ];
};

const rowToBill = (r: string[]): CustomerBill => ({
  id:              r[0]  ?? '',
  billNo:          r[1]  ?? '',
  date:            r[2]  ?? '',
  customerName:    r[5]  ?? '',
  customerPhone:   r[6]  ?? '',
  customerAddress: r[7]  ?? '',
  customerGstin:   r[8]  ?? '',
  vehicleNumber:   r[9]  ?? '',
  paymentType:     (r[10] as CustomerBill['paymentType']) ?? 'Cash',
  items:           [],
  taxableAmount:   parseFloat(r[12] ?? '0') || 0,
  totalSgst:       parseFloat(r[13] ?? '0') || 0,
  totalCgst:       parseFloat(r[14] ?? '0') || 0,
  grandTotal:      parseFloat(r[15] ?? '0') || 0,
  amountInWords:   r[16] ?? '',
  driveFileId:     r[17] ?? '',
  driveLink:       r[18] ?? '',
  status:          (r[19] as CustomerBill['status']) ?? 'active',
  createdAt:       r[20] ?? '',
});

const billItemRows = (bill: CustomerBill): (string | number)[][] =>
  bill.items
    .filter(it => it.description.trim())
    .map(it => [
      bill.billNo, bill.date,
      it.itemNo, it.description, it.brand, it.category,
      it.hsnCode, it.gstPercent, it.quantity, it.rate, it.total,
    ]);

// ── CustomerBill: append with items (collision-safe) ──────────────────────

export const appendCustomerBillWithItems = async (bill: CustomerBill): Promise<string> => {
  const id = await initSheets();

  // Collision check: read existing billNos
  const colB = await readValues(id, `${TAB_CUSTOMER}!B:B`);
  const existing = new Set(colB.slice(1).map(r => r[0]).filter(Boolean));

  let usedBillNo = bill.billNo;
  if (existing.has(usedBillNo)) {
    usedBillNo = await getNextBillNumber();
  }

  const finalBill = usedBillNo === bill.billNo ? bill : { ...bill, billNo: usedBillNo };

  await appendValues(id, `${TAB_CUSTOMER}!A:U`, [billToRow(finalBill)]);

  const rows = billItemRows(finalBill);
  if (rows.length > 0) {
    await appendValues(id, `${TAB_ITEMS}!A:K`, rows);
  }

  return usedBillNo;
};

// ── CustomerBill: update Drive link after upload ───────────────────────────

export const updateBillDriveLink = async (
  billNo: string,
  driveFileId: string,
  driveLink: string,
): Promise<void> => {
  const id = getSheetId();
  if (!id) return;
  try {
    const colAB = await readValues(id, `${TAB_CUSTOMER}!A:B`);
    const rowIndex = colAB.findIndex((r, i) => i > 0 && r[1] === billNo);
    if (rowIndex === -1) return;
    // Cols R=18 and S=19 (1-based sheet row = rowIndex+1)
    await updateValues(id, `${TAB_CUSTOMER}!R${rowIndex + 1}:S${rowIndex + 1}`, [[driveFileId, driveLink]]);
  } catch {
    // Non-critical
  }
};

// ── CustomerBill: update full row + replace items (edit mode) ─────────────

export const updateCustomerBillWithItems = async (bill: CustomerBill): Promise<void> => {
  const id = await initSheets();

  // Update CustomerBills row
  const colA = await readValues(id, `${TAB_CUSTOMER}!A:A`);
  const custIdx = colA.findIndex((r, i) => i > 0 && r[0] === bill.id);
  if (custIdx === -1) {
    await appendCustomerBillWithItems(bill);
    return;
  }
  await updateValues(id, `${TAB_CUSTOMER}!A${custIdx + 1}:U${custIdx + 1}`, [billToRow(bill)]);

  // Delete old InvoiceItems rows for this bill (descending to avoid index shift)
  const itemColA = await readValues(id, `${TAB_ITEMS}!A:A`);
  const deleteIndices = itemColA
    .map((r, i) => (i > 0 && r[0] === bill.billNo ? i : -1))
    .filter(i => i > 0)
    .sort((a, b) => b - a);

  if (deleteIndices.length > 0) {
    const gids = await getSheetGids(id);
    const itemsGid = gids[TAB_ITEMS] ?? 1;
    await sheetsReq(`/${id}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: deleteIndices.map(idx => ({
          deleteDimension: {
            range: { sheetId: itemsGid, dimension: 'ROWS', startIndex: idx, endIndex: idx + 1 },
          },
        })),
      }),
    });
  }

  // Append new items
  const newRows = billItemRows(bill);
  if (newRows.length > 0) {
    await appendValues(id, `${TAB_ITEMS}!A:K`, newRows);
  }
};

// ── CustomerBill: read ─────────────────────────────────────────────────────

export const getCustomerBills = async (year?: number, month?: number): Promise<CustomerBill[]> => {
  const id = getSheetId();
  if (!id) return [];
  try {
    const rows = await readValues(id, `${TAB_CUSTOMER}!A:U`);
    if (rows.length <= 1) return [];
    const bills = rows.slice(1).map(rowToBill).filter(b => b.id);
    if (year !== undefined && month !== undefined) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return bills.filter(b => b.date.startsWith(prefix));
    }
    if (year !== undefined) return bills.filter(b => b.date.startsWith(String(year)));
    return bills;
  } catch {
    return [];
  }
};

// ── PurchaseBill ──────────────────────────────────────────────────────────

export const appendPurchaseBill = async (pb: PurchaseBill): Promise<void> => {
  const id = await initSheets();
  await appendValues(id, `${TAB_PURCHASE}!A:Q`, [[
    pb.id, pb.date, pb.vendorName, pb.vendorGstin ?? '', pb.invoiceNo,
    pb.totalAmount, pb.taxableAmount ?? '',
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
    const rows = await readValues(id, `${TAB_PURCHASE}!A:Q`);
    if (rows.length <= 1) return [];
    const bills = rows.slice(1).map(r => ({
      id:           r[0]  ?? '',
      date:         r[1]  ?? '',
      vendorName:   r[2]  ?? '',
      vendorGstin:  r[3]  ?? '',
      invoiceNo:    r[4]  ?? '',
      totalAmount:  parseFloat(r[5]  ?? '0') || 0,
      taxableAmount:parseFloat(r[6]  ?? '0') || 0,
      cgstRate:     parseFloat(r[7]  ?? '0') || 0,
      cgstAmount:   parseFloat(r[8]  ?? '0') || 0,
      sgstRate:     parseFloat(r[9]  ?? '0') || 0,
      sgstAmount:   parseFloat(r[10] ?? '0') || 0,
      gstAmount:    (parseFloat(r[8] ?? '0') || 0) + (parseFloat(r[10] ?? '0') || 0),
      category:     r[11] ?? '',
      notes:        r[12] ?? '',
      driveFileId:  r[13] ?? '',
      driveLink:    r[14] ?? '',
      uploadedAt:   r[15] ?? '',
      items:        (() => { try { return JSON.parse(r[16] ?? '[]'); } catch { return []; } })(),
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

// ── NoSalesDay ─────────────────────────────────────────────────────────────

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
        id:                 r[0] ?? '',
        date:               r[1] ?? '',
        month:              parseInt(r[2] ?? '0'),
        year:               parseInt(r[3] ?? '0'),
        reason:             r[4] ?? '',
        declarationDriveId: r[5] ?? '',
        createdAt:          r[6] ?? '',
      }));
  } catch {
    return [];
  }
};

// ── Month summary ─────────────────────────────────────────────────────────

export const getMonthSummary = async (year: number, month: number): Promise<MonthSummary> => {
  try {
    const [bills, purchases, noSales] = await Promise.all([
      getCustomerBills(year, month),
      getPurchaseBills(year, month),
      getNoSalesDays(year, month),
    ]);

    const activeBills = bills.filter(b => b.status === 'active');
    const totalSales  = activeBills.reduce((s, b) => s + b.grandTotal, 0);
    const totalSgst   = activeBills.reduce((s, b) => s + b.totalSgst, 0);
    const totalCgst   = activeBills.reduce((s, b) => s + b.totalCgst, 0);

    const daysInMonth      = new Date(year, month, 0).getDate();
    const today            = new Date();
    const billDates        = new Set(activeBills.map(b => b.date));
    const declarationDates = new Set(noSales.map(n => n.date));

    let missingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dd = new Date(ds + 'T00:00:00');
      if (dd > today) break;
      if (dd.getDay() === 0) continue;
      if (!billDates.has(ds) && !declarationDates.has(ds)) missingDays++;
    }

    return { totalBills: activeBills.length, totalPurchaseBills: purchases.length, totalSales, totalSgst, totalCgst, missingDays };
  } catch {
    return { totalBills: 0, totalPurchaseBills: 0, totalSales: 0, totalSgst: 0, totalCgst: 0, missingDays: 0 };
  }
};

// ── Re-exports / backward-compat aliases ──────────────────────────────────

export { getSheetId, parseSequence };

export const initSheet = initSheets;
export const getSheetBillsForMonth = getCustomerBills;

export const appendCustomerBill = async (bill: CustomerBill): Promise<void> => {
  await appendCustomerBillWithItems(bill);
};
export const updateCustomerBill = updateCustomerBillWithItems;
