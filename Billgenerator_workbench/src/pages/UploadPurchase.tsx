import React, { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Upload, Camera, FolderOpen, X, Crop, RotateCcw, Check, Sparkles, Plus, Trash2 } from 'lucide-react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { appendPurchaseBill } from '../utils/googleSheets';
import { ensureFolderPath, uploadFileToDrive, getMonthFolderPath } from '../utils/googleDrive';
import { todayISO, getMonthName, currentYear } from '../utils/dateFormat';
import { getAllCategories } from '../utils/hsnLookup';
import { extractBillData } from '../utils/extractBillOCR';
import type { PurchaseBill, PurchaseItem } from '../types';

// ── Canvas helpers ────────────────────────────────────────────────────────────

const dataURLtoFile = (dataUrl: string, filename: string): File => {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)![1];
  const bstr = atob(data);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new File([u8], filename, { type: mime });
};

const rotateImage = (src: string, degrees: number): Promise<string> =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rad = (degrees * Math.PI) / 180;
      const abs = Math.abs;
      canvas.width  = abs(Math.round(img.width * Math.cos(rad) + img.height * Math.sin(rad)));
      canvas.height = abs(Math.round(img.width * Math.sin(rad) + img.height * Math.cos(rad)));
      const ctx = canvas.getContext('2d')!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = src;
  });

const cropImageFromRect = (
  src: string,
  rect: { x: number; y: number; w: number; h: number },
): Promise<string> =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const cx = (rect.x / 100) * img.naturalWidth;
      const cy = (rect.y / 100) * img.naturalHeight;
      const cw = (rect.w / 100) * img.naturalWidth;
      const ch = (rect.h / 100) * img.naturalHeight;
      canvas.width = cw; canvas.height = ch;
      canvas.getContext('2d')!.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = src;
  });

// ── Crop Modal ────────────────────────────────────────────────────────────────

type CropRect = { x: number; y: number; w: number; h: number };
const MIN_SIZE = 10;

const CropModal: React.FC<{
  imageSrc: string;
  onDone: (cropped: string) => void;
  onCancel: () => void;
}> = ({ imageSrc, onDone, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ handle: string; sx: number; sy: number; sr: CropRect } | null>(null);
  const [rect, setRect] = useState<CropRect>({ x: 5, y: 5, w: 90, h: 90 });
  const [rotatedSrc, setRotatedSrc] = useState(imageSrc);
  const [rotating, setRotating] = useState(false);

  const onPointerDown = (handle: string) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = { handle, sx: e.clientX, sy: e.clientY, sr: { ...rect } };
  };
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const b = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragging.current.sx) / b.width) * 100;
    const dy = ((e.clientY - dragging.current.sy) / b.height) * 100;
    const { handle, sr } = dragging.current;
    setRect(() => {
      let { x, y, w, h } = { ...sr };
      if (handle === 'move') { x = Math.max(0, Math.min(100 - w, x + dx)); y = Math.max(0, Math.min(100 - h, y + dy)); }
      else if (handle === 'tl') { const nx = Math.max(0, Math.min(x + w - MIN_SIZE, x + dx)); const ny = Math.max(0, Math.min(y + h - MIN_SIZE, y + dy)); w = x + w - nx; h = y + h - ny; x = nx; y = ny; }
      else if (handle === 'tr') { const ny = Math.max(0, Math.min(y + h - MIN_SIZE, y + dy)); w = Math.max(MIN_SIZE, Math.min(100 - x, w + dx)); h = y + h - ny; y = ny; }
      else if (handle === 'bl') { const nx = Math.max(0, Math.min(x + w - MIN_SIZE, x + dx)); w = x + w - nx; x = nx; h = Math.max(MIN_SIZE, Math.min(100 - y, h + dy)); }
      else if (handle === 'br') { w = Math.max(MIN_SIZE, Math.min(100 - x, w + dx)); h = Math.max(MIN_SIZE, Math.min(100 - y, h + dy)); }
      return { x, y, w: Math.max(MIN_SIZE, w), h: Math.max(MIN_SIZE, h) };
    });
  }, []);
  const onPointerUp = useCallback(() => { dragging.current = null; }, []);

  const handleRotate = async () => {
    setRotating(true);
    setRotatedSrc(await rotateImage(rotatedSrc, 90));
    setRect({ x: 5, y: 5, w: 90, h: 90 });
    setRotating(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 flex-shrink-0">
        <button type="button" onClick={onCancel} className="text-white p-1"><X size={22} /></button>
        <div className="text-center">
          <p className="text-white text-sm font-semibold">Crop Photo</p>
          <p className="text-white/50 text-[10px]">Drag handles or inside to adjust</p>
        </div>
        <button type="button" onClick={async () => onDone(await cropImageFromRect(rotatedSrc, rect))}
          className="px-4 py-1.5 rounded-lg text-sm font-bold text-white" style={{ background: 'var(--accent)' }}>
          Apply
        </button>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden select-none" style={{ touchAction: 'none' }}
        onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <img src={rotatedSrc} alt="crop" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
        <div className="absolute cursor-move" onPointerDown={onPointerDown('move')} style={{
          left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%`,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.9)',
        }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '33.3% 33.3%',
          }} />
          {(['tl','tr','bl','br'] as const).map(h => (
            <div key={h} onPointerDown={onPointerDown(h)} style={{
              position: 'absolute', width: 22, height: 22, background: '#fff', touchAction: 'none', cursor: 'nwse-resize',
              top: h[0]==='t' ? -4 : undefined, bottom: h[0]==='b' ? -4 : undefined,
              left: h[1]==='l' ? -4 : undefined, right: h[1]==='r' ? -4 : undefined,
              borderRadius: h==='tl'?'4px 0 4px 0':h==='tr'?'0 4px 0 4px':h==='bl'?'0 4px 0 4px':'4px 0 4px 0',
            }} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-around px-4 py-4 bg-black/80 flex-shrink-0">
        <button type="button" onClick={handleRotate} disabled={rotating} className="flex flex-col items-center gap-1 text-white/80 disabled:opacity-40">
          <RotateCcw size={22} /><span className="text-[10px]">Rotate</span>
        </button>
        <button type="button" onClick={() => onDone(rotatedSrc)} className="flex flex-col items-center gap-1 text-white/60">
          <Check size={22} /><span className="text-[10px]">Use Full</span>
        </button>
      </div>
    </div>
  );
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface HeaderForm {
  date: string;
  vendorName: string;
  vendorGstin: string;
  invoiceNo: string;
  cgstRate: string;
  cgstAmount: string;
  sgstRate: string;
  sgstAmount: string;
  totalAmount: string;
  category: string;
  notes: string;
}

const blankHeader = (): HeaderForm => ({
  date: todayISO(),
  vendorName: '', vendorGstin: '', invoiceNo: '',
  cgstRate: '9', cgstAmount: '',
  sgstRate: '9', sgstAmount: '',
  totalAmount: '', category: '', notes: '',
});

const blankItem = (): PurchaseItem => ({
  id: Math.random().toString(36).slice(2),
  description: '', hsnCode: '', quantity: 1, rate: 0, amount: 0,
});

const AiBadge = () => (
  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: 'var(--accent)', color: '#fff' }}>
    <Sparkles size={8} /> AI
  </span>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const UploadPurchase: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const cameraInputRef  = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm]             = useState<HeaderForm>(blankHeader());
  const [items, setItems]           = useState<PurchaseItem[]>([blankItem()]);
  const [rawImage, setRawImage]     = useState<string | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [isPdfFile, setIsPdfFile]   = useState(false);
  const [fileForUpload, setFile]    = useState<File | null>(null);
  const [showCrop, setShowCrop]     = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set());
  const [saving, setSaving]         = useState(false);
  const [errors, setErrors]         = useState<Partial<Record<keyof HeaderForm, string>>>({});
  const categories = getAllCategories();

  const updateForm = (key: keyof HeaderForm, value: string) => {
    setForm(p => ({ ...p, [key]: value }));
    setAutoFilled(prev => { const s = new Set(prev); s.delete(key); return s; });
  };

  const updateItem = (id: string, field: keyof PurchaseItem, raw: string) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: field === 'description' || field === 'hsnCode' ? raw : parseFloat(raw) || 0 };
      if (field === 'quantity' || field === 'rate') {
        updated.amount = parseFloat(String(updated.quantity)) * parseFloat(String(updated.rate));
      }
      if (field === 'amount') updated.amount = parseFloat(raw) || 0;
      return updated;
    }));
  };

  // Auto-compute totals from items + GST rates
  const cgstRateNum = parseFloat(form.cgstRate) || 0;
  const sgstRateNum = parseFloat(form.sgstRate) || 0;
  useEffect(() => {
    const validItems = items.filter(it => it.amount > 0 || it.description.trim());
    if (validItems.length === 0) return;
    const taxable = items.reduce((s, it) => s + (it.amount || 0), 0);
    if (taxable <= 0) return;
    const cgst = parseFloat(((taxable * cgstRateNum) / 100).toFixed(2));
    const sgst = parseFloat(((taxable * sgstRateNum) / 100).toFixed(2));
    setForm(p => ({
      ...p,
      cgstAmount:  p.cgstAmount  === '' || autoFilled.has('cgstAmount')  ? String(cgst)             : p.cgstAmount,
      sgstAmount:  p.sgstAmount  === '' || autoFilled.has('sgstAmount')  ? String(sgst)             : p.sgstAmount,
      totalAmount: p.totalAmount === '' || autoFilled.has('totalAmount') ? String(parseFloat((taxable + cgst + sgst).toFixed(2))) : p.totalAmount,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, cgstRateNum, sgstRateNum]);

  const handleFileSelected = (f: File) => {
    const pdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (pdf) {
      setFile(f);
      setIsPdfFile(true);
      setPreview(f.name);
      runOCR(f);
      return;
    }
    if (!f.type.startsWith('image/')) {
      setFile(f);
      setIsPdfFile(false);
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
      return;
    }
    setIsPdfFile(false);
    const reader = new FileReader();
    reader.onload = e => { setRawImage(e.target?.result as string); setShowCrop(true); };
    reader.readAsDataURL(f);
  };

  const runOCR = async (file: File) => {
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
    if (!apiKey) return;
    setExtracting(true);
    try {
      const data = await extractBillData(file);

      // Build updates and filled set synchronously BEFORE calling any setState
      const updates: Partial<HeaderForm> = {};
      const filled = new Set<string>();

      if (data.vendorName)       { updates.vendorName  = data.vendorName;            filled.add('vendorName'); }
      if (data.vendorGstin)      { updates.vendorGstin = data.vendorGstin;           filled.add('vendorGstin'); }
      if (data.invoiceNo)        { updates.invoiceNo   = data.invoiceNo;             filled.add('invoiceNo'); }
      if (data.invoiceDate)      { updates.date        = data.invoiceDate;           filled.add('date'); }
      if (data.cgstRate  != null){ updates.cgstRate    = String(data.cgstRate);      filled.add('cgstRate'); }
      if (data.cgstAmount!= null){ updates.cgstAmount  = String(data.cgstAmount);   filled.add('cgstAmount'); }
      if (data.sgstRate  != null){ updates.sgstRate    = String(data.sgstRate);      filled.add('sgstRate'); }
      if (data.sgstAmount!= null){ updates.sgstAmount  = String(data.sgstAmount);   filled.add('sgstAmount'); }
      if (data.totalAmount!=null){ updates.totalAmount = String(data.totalAmount);  filled.add('totalAmount'); }

      setForm(prev => ({ ...prev, ...updates }));

      if (data.items && data.items.length > 0) {
        setItems(data.items.map(it => ({
          id: Math.random().toString(36).slice(2),
          description: it.description,
          hsnCode: it.hsnCode,
          quantity: it.quantity,
          rate: it.rate,
          amount: it.amount || it.quantity * it.rate,
        })));
        filled.add('items');
      }

      setAutoFilled(new Set(filled));

      if (filled.size > 0) {
        const itemCount = data.items?.length ?? 0;
        toast.success(`Auto-filled ${itemCount > 0 ? `${itemCount} items + ` : ''}header from bill`);
      } else {
        toast.error('Could not read bill data — please fill manually');
      }
    } catch {
      toast.error('Auto-read failed — please fill in the details');
    } finally {
      setExtracting(false);
    }
  };

  const handleCropDone = (cropped: string) => {
    setPreview(cropped);
    setShowCrop(false);
    const f = dataURLtoFile(cropped, `purchase-${Date.now()}.jpg`);
    setFile(f);
    runOCR(f);
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.vendorName.trim()) e.vendorName = 'Required';
    if (!form.invoiceNo.trim())  e.invoiceNo  = 'Required';
    const hasItem = items.some(it => it.description.trim() && it.amount > 0);
    if (!hasItem && (!form.totalAmount || parseFloat(form.totalAmount) <= 0)) {
      e.totalAmount = 'Add at least one item or enter total amount';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let driveFileId: string | undefined;
      let driveLink: string | undefined;

      if (fileForUpload && isAuthenticated) {
        try {
          const dateObj = new Date(form.date + 'T00:00:00');
          const monthName = getMonthName(dateObj.getMonth() + 1);
          const folderPath = [...getMonthFolderPath(currentYear(), monthName), 'Purchase Bills'];
          const folderId = await ensureFolderPath(folderPath);
          const result = await uploadFileToDrive(fileForUpload, fileForUpload.name, folderId);
          driveFileId = result.id;
          driveLink   = result.webViewLink;
        } catch (err: unknown) {
          toast.error(`Drive upload failed: ${err instanceof Error ? err.message : 'Unknown'}. Bill saved locally.`);
        }
      }

      const validItems = items.filter(it => it.description.trim() || it.amount > 0);
      const cgst = parseFloat(form.cgstAmount) || 0;
      const sgst = parseFloat(form.sgstAmount) || 0;
      const taxable = validItems.length > 0
        ? validItems.reduce((s, it) => s + it.amount, 0)
        : parseFloat(form.totalAmount) - cgst - sgst;
      const primaryHsn = validItems[0]?.hsnCode || '';

      const pb: PurchaseBill = {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        date:          form.date,
        vendorName:    form.vendorName,
        vendorGstin:   form.vendorGstin  || undefined,
        invoiceNo:     form.invoiceNo,
        totalAmount:   parseFloat(form.totalAmount) || (taxable + cgst + sgst),
        gstAmount:     cgst + sgst || undefined,
        taxableAmount: taxable || undefined,
        hsnCode:       primaryHsn || undefined,
        cgstRate:      parseFloat(form.cgstRate) || undefined,
        cgstAmount:    cgst || undefined,
        sgstRate:      parseFloat(form.sgstRate) || undefined,
        sgstAmount:    sgst || undefined,
        items:         validItems.length > 0 ? validItems : undefined,
        category:      form.category || undefined,
        notes:         form.notes    || undefined,
        driveFileId, driveLink,
        uploadedAt: new Date().toISOString(),
      };

      if (isAuthenticated) {
        try { await appendPurchaseBill(pb); }
        catch { toast.error('Sheets sync failed — saved locally only.'); }
      }

      try {
        const existing = JSON.parse(localStorage.getItem('mc-purchase-bills') ?? '[]') as PurchaseBill[];
        existing.unshift(pb);
        localStorage.setItem('mc-purchase-bills', JSON.stringify(existing.slice(0, 100)));
      } catch { /* ignore */ }

      toast.success(isAuthenticated ? 'Purchase bill saved & synced!' : 'Purchase bill saved locally!');
      setForm(blankHeader());
      setItems([blankItem()]);
      setPreview(null); setRawImage(null); setFile(null); setAutoFilled(new Set());
      if (cameraInputRef.current)  cameraInputRef.current.value  = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const hasKey = !!(import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <Header title="Upload Purchase Bill" showBack />

      {showCrop && rawImage && (
        <CropModal imageSrc={rawImage} onDone={handleCropDone} onCancel={() => {
          setShowCrop(false); setRawImage(null);
          if (cameraInputRef.current)  cameraInputRef.current.value  = '';
          if (galleryInputRef.current) galleryInputRef.current.value = '';
        }} />
      )}

      <div className="page-container">

        {/* ── Photo section ── */}
        {!preview ? (
          <div className="mb-4">
            <p className="section-title">Attach Bill Photo</p>
            {hasKey && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs font-medium"
                   style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                <Sparkles size={14} />
                AI auto-fill ON — all items will be read from the photo
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-[var(--accent)] active:scale-95 transition-transform"
                style={{ background: 'var(--accent-light)' }}>
                <Camera size={28} style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Take Photo</span>
                <span className="text-[10px] text-[var(--text-secondary)]">Opens camera</span>
              </button>
              <button type="button" onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-[var(--border)] active:scale-95 transition-transform"
                style={{ background: 'var(--bg-card)' }}>
                <FolderOpen size={28} className="text-[var(--text-secondary)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Choose File</span>
                <span className="text-[10px] text-[var(--text-secondary)]">Gallery or PDF</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="section-title">Bill Attached</p>
            <div className="relative rounded-xl overflow-hidden border border-[var(--border)]">
              {isPdfFile ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 px-4"
                     style={{ background: 'var(--bg-card)' }}>
                  <div className="w-14 h-14 flex items-center justify-center rounded-xl text-2xl font-bold"
                       style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                    PDF
                  </div>
                  <p className="text-sm font-medium text-center text-[var(--text-primary)] break-all px-2">{preview}</p>
                  <p className="text-xs text-[var(--text-secondary)]">PDF attached — AI reading in progress</p>
                </div>
              ) : (
                <img src={preview!} alt="Bill preview" className="w-full object-contain max-h-64" style={{ background: '#f5f5f5' }} />
              )}
              {extracting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
                     style={{ background: 'rgba(15,76,53,0.85)' }}>
                  <div className="w-7 h-7 rounded-full border-2 border-white border-t-transparent animate-spin mb-2" />
                  <p className="text-white text-xs font-semibold">Reading bill with AI…</p>
                  <p className="text-white/60 text-[10px] mt-1">Extracting vendor, items & totals</p>
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                {rawImage && !extracting && (
                  <button type="button" onClick={() => setShowCrop(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-white shadow"
                    style={{ background: 'var(--accent)' }}>
                    <Crop size={16} />
                  </button>
                )}
                <button type="button" onClick={() => { setPreview(null); setRawImage(null); setFile(null); setIsPdfFile(false); setAutoFilled(new Set()); }}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500 text-white shadow">
                  <X size={16} />
                </button>
              </div>
            </div>
            {!extracting && fileForUpload && hasKey && (
              <button type="button" onClick={() => runOCR(fileForUpload)} className="btn-ghost btn-sm w-full mt-2">
                <Sparkles size={14} /> Re-read bill with AI
              </button>
            )}
          </div>
        )}

        <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ''; }} />
        <input ref={galleryInputRef} type="file" accept="image/*,application/pdf"       className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ''; }} />

        {/* ── Header fields ── */}
        <p className="section-title">Vendor Details</p>

        <div className="input-group">
          <label className="input-label">Date {autoFilled.has('date') && <AiBadge />}</label>
          <input type="date" className="input-field" value={form.date} onChange={e => updateForm('date', e.target.value)} />
        </div>

        <div className="input-group">
          <label className="input-label">Vendor / Supplier Name <span className="text-red-500">*</span> {autoFilled.has('vendorName') && <AiBadge />}</label>
          <input className={`input-field${errors.vendorName ? ' error' : ''}`} value={form.vendorName}
            onChange={e => updateForm('vendorName', e.target.value)} placeholder="e.g. Veeyes Electronics" />
          {errors.vendorName && <span className="text-xs text-red-500">{errors.vendorName}</span>}
        </div>

        <div className="input-group">
          <label className="input-label">Vendor GSTIN {autoFilled.has('vendorGstin') && <AiBadge />}</label>
          <input className="input-field" value={form.vendorGstin}
            onChange={e => updateForm('vendorGstin', e.target.value.toUpperCase())}
            placeholder="e.g. 33AAOFV3562G1ZZ" maxLength={15}
            style={{ fontFamily: "'DM Mono', monospace" }} />
        </div>

        <div className="input-group">
          <label className="input-label">Invoice / Bill Number <span className="text-red-500">*</span> {autoFilled.has('invoiceNo') && <AiBadge />}</label>
          <input className={`input-field${errors.invoiceNo ? ' error' : ''}`} value={form.invoiceNo}
            onChange={e => updateForm('invoiceNo', e.target.value)} placeholder="Vendor's invoice number" />
          {errors.invoiceNo && <span className="text-xs text-red-500">{errors.invoiceNo}</span>}
        </div>

        {/* ── Items table ── */}
        <div className="flex items-center justify-between mt-5 mb-2">
          <p className="section-title mb-0">
            Items {autoFilled.has('items') && <AiBadge />}
          </p>
          <button type="button" onClick={() => setItems(p => [...p, blankItem()])}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Plus size={14} /> Add Item
          </button>
        </div>

        <div className="card p-0 overflow-hidden mb-4">
          {items.map((item, idx) => (
            <div key={item.id}
              className={`px-3 py-3 border-b border-[var(--divider)] last:border-0 ${idx % 2 === 1 ? 'bg-[var(--divider)]' : ''}`}>

              {/* Row 1: item number + delete */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                  Item {idx + 1}
                </span>
                <button type="button"
                  onClick={() => setItems(p => p.length === 1 ? [blankItem()] : p.filter(it => it.id !== item.id))}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Row 2: Description (full width) */}
              <input
                className="input-field py-2 text-sm mb-2"
                value={item.description}
                onChange={e => updateItem(item.id, 'description', e.target.value)}
                placeholder="Description (e.g. VS-100-1KVA)"
              />

              {/* Row 3: HSN | Qty | Rate | Amount */}
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 64px 1fr 1fr' }}>
                <div>
                  <label className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-0.5 block">HSN Code</label>
                  <input
                    className="input-field py-1.5 text-xs"
                    value={item.hsnCode}
                    onChange={e => updateItem(item.id, 'hsnCode', e.target.value)}
                    placeholder="HSN"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-0.5 block">Qty</label>
                  <input
                    className="input-field py-1.5 text-xs text-center"
                    type="number" inputMode="decimal"
                    value={item.quantity || ''}
                    onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-0.5 block">Rate (₹)</label>
                  <input
                    className="input-field py-1.5 text-xs text-right"
                    type="number" inputMode="decimal"
                    value={item.rate || ''}
                    onChange={e => updateItem(item.id, 'rate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-0.5 block">Amount (₹)</label>
                  <div className="input-field py-1.5 text-xs text-right font-bold"
                       style={{ color: item.amount > 0 ? 'var(--accent)' : 'var(--text-secondary)', background: 'var(--divider)' }}>
                    {item.amount > 0 ? item.amount.toFixed(2) : '—'}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Items total */}
          {items.some(it => it.amount > 0) && (
            <div className="flex justify-between items-center px-3 py-2 text-xs font-bold border-t border-[var(--border)]"
                 style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              <span>Taxable Total</span>
              <span>₹{items.reduce((s, it) => s + it.amount, 0).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* ── GST & Totals ── */}
        <p className="section-title">GST & Totals</p>

        <div className="flex gap-2">
          <div className="input-group" style={{ width: '30%' }}>
            <label className="input-label">CGST% {autoFilled.has('cgstRate') && <AiBadge />}</label>
            <input className="input-field" type="number" inputMode="decimal" value={form.cgstRate}
              onChange={e => updateForm('cgstRate', e.target.value)} placeholder="9" />
          </div>
          <div className="input-group flex-1">
            <label className="input-label">CGST Amount (₹) {autoFilled.has('cgstAmount') && <AiBadge />}</label>
            <input className="input-field" type="number" inputMode="decimal" value={form.cgstAmount}
              onChange={e => updateForm('cgstAmount', e.target.value)} placeholder="auto" />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="input-group" style={{ width: '30%' }}>
            <label className="input-label">SGST% {autoFilled.has('sgstRate') && <AiBadge />}</label>
            <input className="input-field" type="number" inputMode="decimal" value={form.sgstRate}
              onChange={e => updateForm('sgstRate', e.target.value)} placeholder="9" />
          </div>
          <div className="input-group flex-1">
            <label className="input-label">SGST Amount (₹) {autoFilled.has('sgstAmount') && <AiBadge />}</label>
            <input className="input-field" type="number" inputMode="decimal" value={form.sgstAmount}
              onChange={e => updateForm('sgstAmount', e.target.value)} placeholder="auto" />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Total Amount (₹) {autoFilled.has('totalAmount') && <AiBadge />}</label>
          <input className={`input-field${errors.totalAmount ? ' error' : ''}`}
            type="number" inputMode="decimal" value={form.totalAmount}
            onChange={e => updateForm('totalAmount', e.target.value)} placeholder="Grand total including GST" />
          {errors.totalAmount && <span className="text-xs text-red-500">{errors.totalAmount}</span>}
        </div>

        {/* ── Optional ── */}
        <div className="input-group">
          <label className="input-label">Category</label>
          <select className="select-field" value={form.category} onChange={e => updateForm('category', e.target.value)}>
            <option value="">Select category…</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Notes</label>
          <textarea className="textarea-field" value={form.notes}
            onChange={e => updateForm('notes', e.target.value)} placeholder="Optional notes" rows={2} />
        </div>

        {!isAuthenticated && (
          <div className="mb-3 rounded-xl px-4 py-3 text-xs" style={{ background: '#FEF3C7', color: '#92400E' }}>
            Not connected to Google — bill will be saved locally only.
          </div>
        )}
        {!hasKey && (
          <div className="mb-3 rounded-xl px-4 py-3 text-xs" style={{ background: '#F3F4F6', color: '#374151' }}>
            💡 Add <code className="font-mono bg-gray-200 px-1 rounded">VITE_GEMINI_API_KEY</code> to .env to enable AI auto-fill.
          </div>
        )}

        <button type="button" className="btn-primary w-full mt-2 mb-6" onClick={handleSave} disabled={saving || extracting}>
          <Upload size={18} />
          {saving ? 'Saving…' : extracting ? 'Reading bill…' : 'Save Purchase Bill'}
        </button>
      </div>
    </div>
  );
};
