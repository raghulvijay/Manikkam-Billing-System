import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import { Header } from '../components/Header';
import { CustomerDetails } from '../components/InvoiceForm/CustomerDetails';
import { ItemsTable } from '../components/InvoiceForm/ItemsTable';
import { ReviewStep } from '../components/InvoiceForm/ReviewStep';
import { DoneStep } from '../components/InvoiceForm/DoneStep';
import type { DriveStatus } from '../components/InvoiceForm/DoneStep';
import type { CustomerFormData } from '../components/InvoiceForm/CustomerDetails';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { useDraft } from '../hooks/useDraft';
import type { InvoiceItem, CustomerBill } from '../types';
import {
  getNextBillNumber,
  appendCustomerBillWithItems,
  updateCustomerBillWithItems,
  updateBillDriveLink,
} from '../utils/googleSheets';
import { enqueuePending } from '../utils/syncQueue';
import { getInvoicePDFBlob } from '../utils/generatePDF';
import { ensureFolderPath, uploadFileToDrive, getMonthFolderPath } from '../utils/googleDrive';
import { numberToWords } from '../utils/numberToWords';
import { todayISO, getMonthName, currentYear } from '../utils/dateFormat';

const STEPS = ['Customer', 'Items', 'Review', 'Done'] as const;
type Step = 0 | 1 | 2 | 3;

const blankItem = (itemNo: number): InvoiceItem => ({
  id: Math.random().toString(36).slice(2),
  itemNo,
  category: '',
  brand: '',
  description: '',
  hsnCode: '',
  gstPercent: 18,
  quantity: 1,
  rate: 0,
  taxableAmount: 0,
  sgstPercent: 9,
  sgstAmount: 0,
  cgstPercent: 9,
  cgstAmount: 0,
  total: 0,
});

const blankCustomer = (): CustomerFormData => ({
  customerName: '',
  customerGstin: '',
  customerPhone: '',
  vehicleNumber: '',
  customerAddress: '',
  date: todayISO(),
  paymentType: 'Cash',
});

export const NewInvoice: React.FC = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = !!editId;
  const { settings } = useShop();
  const { isAuthenticated } = useAuth();
  const { saveDraft, loadDraft, clearDraft, hasDraft } = useDraft();

  const [step, setStep] = useState<Step>(0);
  const [billNo, setBillNo] = useState('');
  const [customer, setCustomer] = useState<CustomerFormData>(blankCustomer());
  const [items, setItems] = useState<InvoiceItem[]>([blankItem(1)]);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});
  const [generatedBill, setGeneratedBill] = useState<CustomerBill | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(false);
  const [driveStatus, setDriveStatus] = useState<DriveStatus>('idle');
  const [partialBill, setPartialBill] = useState<Partial<CustomerBill>>({});

  // Load draft on mount (new mode) or existing bill (edit mode)
  useEffect(() => {
    if (isEditMode && editId) {
      try {
        const bills = JSON.parse(localStorage.getItem('mc-bills') ?? '[]') as CustomerBill[];
        const bill = bills.find(b => b.id === editId);
        if (bill) {
          setCustomer({
            customerName: bill.customerName,
            customerGstin: bill.customerGstin ?? '',
            customerPhone: bill.customerPhone,
            vehicleNumber: bill.vehicleNumber ?? '',
            customerAddress: bill.customerAddress ?? '',
            date: bill.date,
            paymentType: bill.paymentType,
          });
          setItems(bill.items.length > 0 ? bill.items : [blankItem(1)]);
          setBillNo(bill.billNo);
        }
      } catch { /* ignore */ }
    } else if (hasDraft) {
      const draft = loadDraft() as { customer?: CustomerFormData; items?: InvoiceItem[] } | null;
      if (draft?.customer) setCustomer(draft.customer);
      if (draft?.items && draft.items.length > 0) setItems(draft.items);
    }
  }, []);

  // Fetch next bill number (new mode only)
  useEffect(() => {
    if (isEditMode) return;
    getNextBillNumber()
      .then(no => setBillNo(no))
      .catch(() => {
        const yr = new Date().getFullYear();
        setBillNo(`MC/${yr}-${String(yr + 1).slice(2)}/0001`);
      });
  }, []);

  // Auto-save draft every time customer/items change (new mode only, before Done step)
  useEffect(() => {
    if (!isEditMode && step < 3) saveDraft({ customer, items });
  }, [customer, items, step]);

  const validateCustomer = (): boolean => {
    const e: typeof errors = {};
    if (!customer.customerName.trim()) e.customerName = 'Customer name is required';
    if (!customer.customerPhone.trim()) {
      e.customerPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(customer.customerPhone.replace(/\s/g, ''))) {
      e.customerPhone = 'Enter a valid 10-digit mobile number';
    }
    if (!customer.date) e.date = 'Date is required';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error('Please fix the errors before continuing');
    }
    return Object.keys(e).length === 0;
  };

  const validateItems = (): boolean => {
    const hasValid = items.some(it => it.description.trim() && it.quantity > 0 && it.rate > 0);
    if (!hasValid) {
      toast.error('Add at least one item with description, quantity and rate');
      return false;
    }
    const invalidRate = items.filter(it => it.description.trim() && it.rate <= 0);
    if (invalidRate.length > 0) {
      toast.error(`Item "${invalidRate[0].description}" has no rate — please enter a price`);
      return false;
    }
    return true;
  };

  const buildPartialBill = useCallback(() => {
    const taxableAmount = items.reduce((s, i) => s + i.taxableAmount, 0);
    const totalSgst = items.reduce((s, i) => s + i.sgstAmount, 0);
    const totalCgst = items.reduce((s, i) => s + i.cgstAmount, 0);
    const grandTotal = items.reduce((s, i) => s + i.total, 0);
    setPartialBill({
      billNo,
      date: customer.date,
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      customerAddress: customer.customerAddress || undefined,
      customerGstin: customer.customerGstin || undefined,
      paymentType: customer.paymentType,
      items,
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      totalSgst: parseFloat(totalSgst.toFixed(2)),
      totalCgst: parseFloat(totalCgst.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2)),
      amountInWords: numberToWords(grandTotal),
    });
  }, [billNo, customer, items]);

  useEffect(() => {
    if (step === 2) buildPartialBill();
  }, [step, buildPartialBill]);

  const handleNext = () => {
    if (step === 0) {
      if (!validateCustomer()) return;
      buildPartialBill();
      setStep(1);
    } else if (step === 1) {
      if (!validateItems()) return;
      buildPartialBill();
      setStep(2);
    }
  };

  // ── Drive upload (called automatically after generation, and on retry) ──
  const uploadToDrive = async (bill: CustomerBill, blob: Blob) => {
    setDriveStatus('uploading');
    try {
      const dateObj = new Date(bill.date + 'T00:00:00');
      const monthName = getMonthName(dateObj.getMonth() + 1);
      const folderPath = [
        ...getMonthFolderPath(currentYear(), monthName),
        'Customer Bills',
      ];
      const folderId = await ensureFolderPath(folderPath);
      const result = await uploadFileToDrive(
        blob,
        `${bill.billNo.replace(/\//g, '-')}.pdf`,
        folderId,
        'application/pdf',
      );
      setGeneratedBill(prev =>
        prev ? { ...prev, driveFileId: result.id, driveLink: result.webViewLink } : prev,
      );
      setDriveStatus('saved');
      // Update the Sheets row with Drive link (best-effort)
      updateBillDriveLink(bill.billNo, result.id, result.webViewLink).catch(() => undefined);
    } catch (e: unknown) {
      setDriveStatus('failed');
      const reason = e instanceof Error ? e.message : 'Unknown error';
      if (reason.includes('401') || reason.includes('403')) {
        toast.error('Google Drive: permission denied. Reconnect your account in Settings.');
      } else if (reason.includes('NetworkError') || reason.includes('Failed to fetch')) {
        toast.error('No internet — Drive upload skipped. Retry when online.');
      } else {
        toast.error(`Drive upload failed: ${reason}`);
      }
    }
  };

  // ── Generate invoice ──
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const taxableAmount = items.reduce((s, i) => s + i.taxableAmount, 0);
      const totalSgst = items.reduce((s, i) => s + i.sgstAmount, 0);
      const totalCgst = items.reduce((s, i) => s + i.cgstAmount, 0);
      const grandTotal = items.reduce((s, i) => s + i.total, 0);

      const bill: CustomerBill = {
        id: isEditMode && editId ? editId : Math.random().toString(36).slice(2) + Date.now().toString(36),
        billNo,
        date: customer.date,
        customerName: customer.customerName,
        customerPhone: customer.customerPhone,
        customerAddress: customer.customerAddress || undefined,
        customerGstin: customer.customerGstin || undefined,
        paymentType: customer.paymentType,
        items: items.filter(it => it.description.trim() && it.quantity > 0),
        taxableAmount: parseFloat(taxableAmount.toFixed(2)),
        totalSgst: parseFloat(totalSgst.toFixed(2)),
        totalCgst: parseFloat(totalCgst.toFixed(2)),
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        amountInWords: numberToWords(grandTotal),
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      // Generate PDF blob for sharing + Drive upload
      let blob: Blob | null = null;
      try {
        blob = getInvoicePDFBlob(bill, settings);
        setPdfBlob(blob);
      } catch (e: unknown) {
        toast.error('PDF generation failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
        // Bill is still usable — continue without PDF
      }

      // Sync to Google Sheets
      let finalBill = bill;
      if (isAuthenticated) {
        try {
          if (isEditMode) {
            await updateCustomerBillWithItems(bill);
          } else {
            const actualBillNo = await appendCustomerBillWithItems(bill);
            if (actualBillNo !== bill.billNo) {
              finalBill = { ...bill, billNo: actualBillNo };
            }
          }
        } catch (e: unknown) {
          const reason = e instanceof Error ? e.message : '';
          if (reason.includes('401') || reason.includes('403')) {
            toast.error('Sheets sync failed: reconnect Google account in Settings.');
          } else {
            toast.error('Sheets sync failed — bill saved locally only.');
          }
          if (!isEditMode) enqueuePending('customer', bill);
        }
      }

      // Save locally (always)
      try {
        const existing = JSON.parse(localStorage.getItem('mc-bills') ?? '[]') as CustomerBill[];
        if (isEditMode && editId) {
          const updated = existing.map(b => b.id === editId ? finalBill : b);
          localStorage.setItem('mc-bills', JSON.stringify(updated));
        } else {
          existing.unshift(finalBill);
          localStorage.setItem('mc-bills', JSON.stringify(existing.slice(0, 200)));
        }
      } catch {
        // localStorage full or unavailable — not critical
      }

      setGeneratedBill(finalBill);
      clearDraft();
      setStep(3);
      toast.success('Bill generated!');

      // Auto-upload to Drive immediately after showing Done step
      if (isAuthenticated && blob) {
        uploadToDrive(finalBill, blob);
      } else if (!isAuthenticated) {
        setDriveStatus('idle');
      }
    } catch (e: unknown) {
      const reason = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`Bill generation failed: ${reason}. Please try again.`);
    } finally {
      setGenerating(false);
    }
  };

  // ── Retry Drive upload ──
  const handleRetryDrive = () => {
    if (!generatedBill || !pdfBlob) {
      toast.error('Cannot retry — bill or PDF not available');
      return;
    }
    uploadToDrive(generatedBill, pdfBlob);
  };

  const handleNewBill = () => {
    if (isEditMode) {
      navigate('/invoice/new');
      return;
    }
    setStep(0);
    setCustomer(blankCustomer());
    setItems([blankItem(1)]);
    setGeneratedBill(null);
    setPdfBlob(null);
    setDriveStatus('idle');
    setBillNo('');
    getNextBillNumber()
      .then(no => setBillNo(no))
      .catch(() => {
        const yr = new Date().getFullYear();
        setBillNo(`MC/${yr}-${String(yr + 1).slice(2)}/0001`);
      });
  };

  const addItem = () => setItems(prev => [...prev, blankItem(prev.length + 1)]);

  const updateItem = (idx: number, item: InvoiceItem) =>
    setItems(prev => prev.map((it, i) => (i === idx ? item : it)));

  const removeItem = (idx: number) =>
    setItems(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.length === 0
        ? [blankItem(1)]
        : filtered.map((it, i) => ({ ...it, itemNo: i + 1 }));
    });

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <Header title={isEditMode ? 'Edit Invoice' : 'New Invoice'} showBack={step < 3} />

      {/* Step indicator */}
      {step < 3 && (
        <div className="no-print fixed top-14 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[600px] lg:max-w-[700px] z-50 bg-white border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-between">
            {STEPS.slice(0, 3).map((label, idx) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`step-circle ${idx < step ? 'done' : idx === step ? 'active' : 'pending'}`}>
                    {idx < step ? <Check size={14} /> : idx + 1}
                  </div>
                  <span className="text-[10px] font-medium text-[var(--text-secondary)]">{label}</span>
                </div>
                {idx < 2 && (
                  <div
                    className="flex-1 h-px mx-1"
                    style={{ background: idx < step ? 'var(--success)' : 'var(--border)' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <div className={step < 3 ? 'pt-[120px] pb-28 px-4' : 'pt-16 pb-28 px-4'}>
        {step === 0 && (
          <CustomerDetails
            data={customer}
            billNo={billNo}
            onChange={setCustomer}
            errors={errors}
          />
        )}

        {step === 1 && (
          <ItemsTable
            items={items}
            onAdd={addItem}
            onUpdate={updateItem}
            onRemove={removeItem}
          />
        )}

        {step === 2 && (
          <ReviewStep
            bill={partialBill}
            settings={settings}
            onEditCustomer={() => setStep(0)}
            onEditItems={() => setStep(1)}
          />
        )}

        {step === 3 && generatedBill && (
          <DoneStep
            bill={generatedBill}
            settings={settings}
            pdfBlob={pdfBlob}
            onNewBill={handleNewBill}
            driveStatus={driveStatus}
            onRetryDrive={isAuthenticated ? handleRetryDrive : undefined}
          />
        )}
      </div>

      {/* Bottom CTA bar (steps 0-2) */}
      {step < 3 && (
        <div className="no-print fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[600px] lg:max-w-[700px] bg-white border-t border-[var(--border)] px-4 py-3">
          {step < 2 ? (
            <button className="btn-primary w-full" onClick={handleNext}>
              Continue
            </button>
          ) : (
            <button
              className="btn-primary w-full"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? 'Generating…' : 'Generate Invoice'}
            </button>
          )}
          {step > 0 && (
            <button
              type="button"
              className="w-full text-sm text-[var(--text-secondary)] mt-2 py-1"
              onClick={() => setStep(s => (s - 1) as Step)}
            >
              ← Back
            </button>
          )}
        </div>
      )}
    </div>
  );
};
