import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, MessageCircle, Smartphone, Copy, Check,
  CloudOff, Cloud, Loader, Plus, ChevronDown, ChevronUp, RefreshCw, Home,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { CustomerBill, ShopSettings } from '../../types';
import { downloadInvoicePDF } from '../../utils/generatePDF';
import { fmtCurrency } from '../../utils/currencyFormat';
import { fmtDate } from '../../utils/dateFormat';

export type DriveStatus = 'idle' | 'uploading' | 'saved' | 'failed';

interface DoneStepProps {
  bill: CustomerBill;
  settings: ShopSettings;
  pdfBlob: Blob | null;
  onNewBill: () => void;
  driveStatus: DriveStatus;
  onRetryDrive?: () => void;
}

export const DoneStep: React.FC<DoneStepProps> = ({
  bill, settings, pdfBlob, onNewBill, driveStatus, onRetryDrive,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const phone = bill.customerPhone.replace(/\D/g, '');
  const hasPhone = phone.length === 10;
  const pdfFileName = `${bill.billNo.replace(/\//g, '-')}.pdf`;

  const billMessage =
    `Dear ${bill.customerName},\n\n` +
    `Thank you for shopping at ${settings.shopName}!\n\n` +
    `Bill No : ${bill.billNo}\n` +
    `Date    : ${fmtDate(bill.date)}\n` +
    `Items   : ${bill.items.length}\n` +
    `Amount  : ${fmtCurrency(bill.grandTotal)}\n` +
    `Payment : ${bill.paymentType}\n\n` +
    `For queries: ${settings.phone1}\n` +
    `${settings.shopName}, ${settings.addressLine1}`;

  const handleDownload = () => {
    try {
      downloadInvoicePDF(bill, settings);
    } catch {
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  const handleWhatsApp = async () => {
    if (!hasPhone) {
      toast.error('No phone number saved for this customer.');
      return;
    }

    // On mobile: try Web Share API to share PDF file natively
    // This opens the native share sheet — user picks WhatsApp and gets the PDF attached
    if (pdfBlob && typeof navigator.share === 'function') {
      const file = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
      const canShareFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

      if (canShareFile) {
        // Pre-copy the message to clipboard so user can paste in WhatsApp
        try { await navigator.clipboard.writeText(billMessage); } catch { /* ignore */ }

        try {
          await navigator.share({
            files: [file],
            title: `Invoice ${bill.billNo}`,
            text: billMessage,
          });
          // Share sheet opened — if user picked WhatsApp, PDF is attached
          // Message was copied to clipboard for pasting
          toast('Bill PDF shared! Message copied to clipboard — paste it in WhatsApp.', {
            duration: 4000,
            icon: '📋',
          });
          return;
        } catch (e: unknown) {
          if ((e as Error).name === 'AbortError') return; // User cancelled — not an error
          // Share API failed, fall through to fallback
          toast.error('Native share failed — opening WhatsApp with text instead.');
        }
      }
    }

    // Fallback (desktop / unsupported browsers):
    // Open wa.me with the text message. Also download the PDF so user can attach manually.
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(billMessage)}`, '_blank');
    if (pdfBlob) {
      setTimeout(() => {
        try { downloadInvoicePDF(bill, settings); } catch { /* ignore */ }
        toast('PDF downloaded — attach it to the WhatsApp message.', { duration: 4000, icon: '📎' });
      }, 600);
    }
  };

  const handleSMS = () => {
    if (!hasPhone) {
      toast.error('No phone number saved for this customer.');
      return;
    }
    // SMS has ~160 char limit per segment, keep it short
    const smsText =
      `${settings.shopName}\nBill ${bill.billNo} | ${fmtDate(bill.date)}\n` +
      `${bill.customerName} | ${fmtCurrency(bill.grandTotal)}\n` +
      `For queries: ${settings.phone1}`;
    try {
      window.open(`sms:+91${phone}?body=${encodeURIComponent(smsText)}`, '_blank');
    } catch {
      toast.error('Could not open SMS app. Please send manually.');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(billMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for restricted browsers
      try {
        const el = document.createElement('textarea');
        el.value = billMessage;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        toast.error('Clipboard access denied. Copy the message manually.');
      }
    }
  };

  // ── Drive status banner ──
  const renderDriveStatus = () => {
    if (driveStatus === 'uploading') {
      return (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}
        >
          <Loader size={16} className="animate-spin flex-shrink-0" />
          <span>Uploading bill to Google Drive…</span>
        </div>
      );
    }
    if (driveStatus === 'saved') {
      return (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' }}
        >
          <Cloud size={16} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold">Saved to Google Drive</span>
            {bill.driveLink && (
              <a
                href={bill.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs underline truncate mt-0.5"
              >
                View in Drive
              </a>
            )}
          </div>
          <Check size={16} className="flex-shrink-0" />
        </div>
      );
    }
    if (driveStatus === 'failed') {
      return (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}
        >
          <CloudOff size={16} className="flex-shrink-0" />
          <span className="flex-1">Drive upload failed</span>
          {onRetryDrive && (
            <button
              type="button"
              onClick={onRetryDrive}
              className="flex items-center gap-1 text-xs font-semibold underline flex-shrink-0"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="text-center animate-fade-up">
      {/* Checkmark */}
      <div className="flex justify-center mb-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent-light)' }}
        >
          <svg
            width="40" height="40" viewBox="0 0 40 40"
            fill="none" stroke="var(--accent)" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path className="animate-checkmark" d="M8 20 L17 29 L32 12" />
          </svg>
        </div>
      </div>

      <h2
        className="text-xl font-bold text-[var(--text-primary)] mb-1"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Bill Generated!
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-2">Invoice created successfully</p>

      {/* Bill number */}
      <div
        className="inline-block px-4 py-2 rounded-xl mb-4"
        style={{ background: 'var(--accent-light)' }}
      >
        <span
          className="text-lg font-bold text-[var(--accent)]"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {bill.billNo}
        </span>
      </div>

      {/* Bill summary */}
      <div className="card text-left mb-4">
        {[
          ['Customer', bill.customerName],
          ['Date', fmtDate(bill.date)],
          ['Items', bill.items.length],
          ['Payment', bill.paymentType],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex justify-between mb-1">
            <span className="text-[var(--text-secondary)] text-sm">{label}</span>
            <span className="font-semibold text-sm">{value}</span>
          </div>
        ))}
        <div className="divider" />
        <div className="flex justify-between">
          <span className="font-bold text-[var(--accent)]">Grand Total</span>
          <span
            className="font-bold text-lg text-[var(--accent)]"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {fmtCurrency(bill.grandTotal)}
          </span>
        </div>
      </div>

      {/* Drive status */}
      <div className="mb-4 text-left">
        {renderDriveStatus()}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {/* Download PDF */}
        <button type="button" onClick={handleDownload} className="btn-primary w-full">
          <Download size={18} />
          Download PDF Invoice
        </button>

        {/* Share with Customer — collapsible */}
        <div className="card text-left p-0 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"
            onClick={() => setShowShare(s => !s)}
          >
            <span>Share with Customer</span>
            {showShare ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showShare && (
            <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 flex flex-col gap-2">

              {!hasPhone && (
                <p className="text-xs rounded-lg px-3 py-2" style={{ background: '#FEF3C7', color: '#92400E' }}>
                  No phone number — WhatsApp &amp; SMS unavailable
                </p>
              )}

              {/* WhatsApp — shares PDF via native share sheet on mobile */}
              <button
                type="button"
                onClick={handleWhatsApp}
                disabled={!hasPhone}
                className="btn w-full"
                style={{
                  background: hasPhone ? '#25D366' : '#F0FDF4',
                  color: hasPhone ? '#fff' : '#9CA3AF',
                }}
              >
                <MessageCircle size={18} />
                <span className="flex-1 text-left">WhatsApp</span>
                <span className="text-[11px] opacity-75">PDF + message</span>
              </button>

              {/* SMS — for non-WhatsApp customers */}
              <button
                type="button"
                onClick={handleSMS}
                disabled={!hasPhone}
                className="btn w-full"
                style={{
                  background: hasPhone ? '#3B82F6' : '#EFF6FF',
                  color: hasPhone ? '#fff' : '#9CA3AF',
                }}
              >
                <Smartphone size={18} />
                <span className="flex-1 text-left">Send SMS</span>
                <span className="text-[11px] opacity-75">No WhatsApp</span>
              </button>

              {/* Copy message — any other channel */}
              <button
                type="button"
                onClick={handleCopy}
                className="btn-ghost w-full"
              >
                {copied ? <Check size={18} color="var(--success)" /> : <Copy size={18} />}
                <span className="flex-1 text-left">{copied ? 'Copied to Clipboard!' : 'Copy Message'}</span>
                <span className="text-[11px] text-[var(--text-secondary)]">Telegram / Email</span>
              </button>

              <p className="text-[10px] text-[var(--text-secondary)] text-center pt-1 leading-relaxed">
                On mobile, WhatsApp opens the share sheet — pick WhatsApp to attach the PDF.
                The message is copied to clipboard automatically.
              </p>
            </div>
          )}
        </div>

        {/* New Bill + Home */}
        <div className="flex gap-3">
          <button type="button" onClick={onNewBill} className="btn-ghost flex-1">
            <Plus size={18} />
            New Bill
          </button>
          <button type="button" onClick={() => navigate('/')} className="btn-ghost flex-1">
            <Home size={18} />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};
