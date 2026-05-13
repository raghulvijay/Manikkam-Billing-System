export type PaymentType = 'Cash' | 'Credit' | 'UPI' | 'Bank Transfer';
export type BillStatus = 'active' | 'cancelled';

export interface InvoiceItem {
  id: string;
  itemNo: number;
  category: string;
  brand: string;
  description: string;
  hsnCode: string;
  gstPercent: number;
  quantity: number;
  rate: number;
  taxableAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  total: number;
}

export interface CustomerBill {
  id: string;
  billNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerGstin?: string;
  vehicleNumber?: string;
  paymentType: PaymentType;
  items: InvoiceItem[];
  taxableAmount: number;
  totalSgst: number;
  totalCgst: number;
  grandTotal: number;
  amountInWords: string;
  driveFileId?: string;
  driveLink?: string;
  status: BillStatus;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface PurchaseBill {
  id: string;
  date: string;
  vendorName: string;
  vendorGstin?: string;
  invoiceNo: string;
  totalAmount: number;
  gstAmount?: number;       // total GST (cgst+sgst) — kept for backward compat
  taxableAmount?: number;
  hsnCode?: string;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  items?: PurchaseItem[];
  category?: string;
  notes?: string;
  driveFileId?: string;
  driveLink?: string;
  uploadedAt: string;
}

export interface NoSalesDay {
  id: string;
  date: string;
  month: number;
  year: number;
  reason?: string;
  declarationDriveId?: string;
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  gstin: string;
  addressLine1: string;
  addressLine2: string;
  phone1: string;
  phone2: string;
  auditorEmail: string;
  spreadsheetId: string;
  lastBillNumber: string;
}

export interface HsnEntry {
  id: string;
  category: string;
  keywords: string[];
  hsn: string;
  gst: number;
}

export interface MonthSummary {
  totalBills: number;
  totalPurchaseBills: number;
  totalSales: number;
  totalSgst: number;
  totalCgst: number;
  missingDays: number;
}
