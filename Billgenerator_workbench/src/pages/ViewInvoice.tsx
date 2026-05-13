import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, MessageCircle, Smartphone, Copy, Check, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Header } from '../components/Header';
import { useShop } from '../context/ShopContext';
import { fmtCurrency } from '../utils/currencyFormat';
import { fmtDate } from '../utils/dateFormat';
import { downloadInvoicePDF, getInvoicePDFBlob } from '../utils/generatePDF';
import type { CustomerBill } from '../types';
import toast from 'react-hot-toast';

export const ViewInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useShop();
  const [bill, setBill] = useState<CustomerBill | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); return; }
    try {
      const stored = JSON.parse(localStorage.getItem('mc-bills') ?? '[]') as CustomerBill[];
      const found = stored.find(b => b.id === id || b.billNo === id);
      if (found) setBill(found);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    }
  }, [id]);

  if (notFound) {
    return (
      <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
        <Header title="Invoice" showBack />
        <div className="page-container flex flex-col items-center justify-center text-center pt-20">
          <p className="text-2xl mb-3">🔍</p>
          <p className="font-semibold text-[var(--text-primary)]">Bill Not Found</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">This bill may not be saved locally.</p>
          <button type="button" className="btn-primary mt-6" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
        <Header title="Invoice" showBack />
        <div className="page-container">
          <div className="skeleton h-8 w-40 rounded mb-3" />
          <div className="skeleton h-32 rounded mb-3" />
          <div className="skeleton h-48 rounded" />
        </div>
      </div>
    );
  }

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
    if (!hasPhone) { toast.error('No phone number saved for this customer.'); return; }

    let pdfBlob: Blob | null = null;
    try { pdfBlob = getInvoicePDFBlob(bill, settings); } catch { /* ignore */ }

    if (pdfBlob && typeof navigator.share === 'function') {
      const file = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
      const canShareFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
      if (canShareFile) {
        try { await navigator.clipboard.writeText(billMessage); } catch { /* ignore */ }
        try {
          await navigator.share({ files: [file], title: `Invoice ${bill.billNo}`, text: billMessage });
          toast('Bill PDF shared! Message copied to clipboard.', { duration: 4000, icon: '📋' });
          return;
        } catch (e: unknown) {
          if ((e as Error).name === 'AbortError') return;
          toast.error('Native share failed — opening WhatsApp with text instead.');
        }
      }
    }

    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(billMessage)}`, '_blank');
    if (pdfBlob) {
      setTimeout(() => {
        try { downloadInvoicePDF(bill, settings); } catch { /* ignore */ }
        toast('PDF downloaded — attach it to WhatsApp.', { duration: 4000, icon: '📎' });
      }, 600);
    }
  };

  const handleSMS = () => {
    if (!hasPhone) { toast.error('No phone number saved for this customer.'); return; }
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

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <Header
        title={bill.billNo}
        showBack
        rightElement={
          <button
            type="button"
            onClick={handleDownload}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--accent-light)]"
          >
            <Download size={18} />
          </button>
        }
      />
      <div className="page-container">
        {/* Status badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`badge ${bill.status === 'active' ? 'badge-success' : 'badge-error'}`}>
            {bill.status === 'active' ? 'Active' : 'Cancelled'}
          </span>
          <span className="badge badge-grey">{bill.paymentType}</span>
        </div>

        {/* Customer */}
        <div className="card mb-3">
          <p className="section-title">Customer Details</p>
          <div className="flex justify-between mb-1">
            <span className="text-[var(--text-secondary)] text-sm">Name</span>
            <span className="font-semibold text-sm">{bill.customerName}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-[var(--text-secondary)] text-sm">Phone</span>
            <span className="font-semibold text-sm">{bill.customerPhone || '—'}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-[var(--text-secondary)] text-sm">Date</span>
            <span className="font-semibold text-sm">{fmtDate(bill.date)}</span>
          </div>
          {bill.customerGstin && (
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)] text-sm">GSTIN</span>
              <span className="font-mono text-sm">{bill.customerGstin}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="card mb-3">
          <p className="section-title">Items ({bill.items.length})</p>
          {bill.items.map(item => (
            <div key={item.id} className="py-2 border-b border-[var(--divider)] last:border-0">
              <div className="flex justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-medium truncate">{item.category}{item.brand ? ` — ${item.brand}` : ''}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{item.description}</p>
                  <p className="text-xs text-[var(--text-secondary)]">HSN: {item.hsnCode} · GST: {item.gstPercent}%</p>
                  <p className="text-xs text-[var(--text-secondary)]">Qty: {item.quantity} × ₹{item.rate}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>
                    ₹{item.total.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="card mb-4">
          <div className="totals-row">
            <span className="text-[var(--text-secondary)]">Taxable</span>
            <span className="font-mono">₹{bill.taxableAmount.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span className="text-[var(--text-secondary)]">SGST</span>
            <span className="font-mono">₹{bill.totalSgst.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span className="text-[var(--text-secondary)]">CGST</span>
            <span className="font-mono">₹{bill.totalCgst.toFixed(2)}</span>
          </div>
          <div className="totals-row grand">
            <span>Grand Total</span>
            <span className="font-mono">{fmtCurrency(bill.grandTotal)}</span>
          </div>
          <p className="text-xs italic text-[var(--text-secondary)] mt-2">{bill.amountInWords}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button type="button" className="btn-primary w-full" onClick={handleDownload}>
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

                <button type="button" onClick={handleCopy} className="btn-ghost w-full">
                  {copied ? <Check size={18} color="var(--success)" /> : <Copy size={18} />}
                  <span className="flex-1 text-left">{copied ? 'Copied to Clipboard!' : 'Copy Message'}</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">Telegram / Email</span>
                </button>

                <p className="text-[10px] text-[var(--text-secondary)] text-center pt-1 leading-relaxed">
                  On mobile, WhatsApp opens the share sheet — pick WhatsApp to attach the PDF.
                </p>
              </div>
            )}
          </div>

          {bill.driveLink && (
            <a href={bill.driveLink} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full text-center">
              View in Google Drive
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
