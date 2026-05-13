import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Upload, Image, X } from 'lucide-react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { ensureFolderPath, uploadFileToDrive } from '../utils/googleDrive';
import { todayISO, getMonthName, currentYear } from '../utils/dateFormat';

export const UploadExisting: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    date: todayISO(),
    customerName: '',
    customerPhone: '',
    billNumber: '',
    notes: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof typeof form, value: string) =>
    setForm(p => ({ ...p, [key]: value }));

  const handleFile = (f: File) => {
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) { toast.error('Customer name is required'); return; }
    if (!file) { toast.error('Please attach a bill image or PDF'); return; }

    setSaving(true);
    try {
      if (!isAuthenticated) {
        toast.error('Connect Google Account to upload');
        return;
      }
      const dateObj = new Date(form.date + 'T00:00:00');
      const monthName = getMonthName(dateObj.getMonth() + 1);
      const year = currentYear();
      const folderPath = ['Manikkam & Co', String(year), monthName, 'Customer Bills', 'Original Bills'];
      const folderId = await ensureFolderPath(folderPath);
      const fileName = `${form.billNumber || form.customerName}-${form.date}${file.name.substring(file.name.lastIndexOf('.'))}`;
      await uploadFileToDrive(file, fileName, folderId);
      toast.success('Bill uploaded to Drive!');
      setForm({ date: todayISO(), customerName: '', customerPhone: '', billNumber: '', notes: '' });
      setFile(null);
      setPreview(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <Header title="Upload Existing Bill" showBack />
      <div className="page-container">
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Upload a scanned/photographed customer bill to Google Drive.
        </p>

        {/* File upload zone */}
        <div
          className="mb-4 rounded-xl border-2 border-dashed border-[var(--border)] p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <div className="relative inline-block">
              <img src={preview} alt="Preview" className="max-h-40 rounded-lg object-contain" />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ) : file ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <span className="text-sm text-[var(--text-primary)] font-medium">{file.name}</span>
              <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}>
                <X size={16} className="text-red-500" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)]">
                <Image size={24} />
              </div>
              <p className="text-sm font-medium">Tap to attach bill</p>
              <p className="text-xs text-[var(--text-secondary)]">JPG, PNG, PDF</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        <div className="input-group">
          <label className="input-label">Bill Date</label>
          <input type="date" className="input-field" value={form.date} onChange={e => update('date', e.target.value)} />
        </div>

        <div className="input-group">
          <label className="input-label">Customer Name <span className="text-red-500">*</span></label>
          <input
            className="input-field"
            value={form.customerName}
            onChange={e => update('customerName', e.target.value)}
            placeholder="Customer name"
          />
        </div>

        <div className="input-group">
          <label className="input-label">Customer Phone</label>
          <input
            className="input-field"
            type="tel"
            value={form.customerPhone}
            onChange={e => update('customerPhone', e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="input-group">
          <label className="input-label">Bill Number</label>
          <input
            className="input-field"
            value={form.billNumber}
            onChange={e => update('billNumber', e.target.value)}
            placeholder="Original bill number"
            style={{ fontFamily: "'DM Mono', monospace" }}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Notes</label>
          <textarea
            className="textarea-field"
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Optional notes"
            rows={2}
          />
        </div>

        <button
          type="button"
          className="btn-primary w-full mt-2"
          onClick={handleSave}
          disabled={saving || !isAuthenticated}
        >
          <Upload size={18} />
          {saving ? 'Uploading…' : 'Upload to Drive'}
        </button>

        {!isAuthenticated && (
          <p className="text-xs text-center text-red-500 mt-2">
            Connect Google Account to upload files
          </p>
        )}
      </div>
    </div>
  );
};
