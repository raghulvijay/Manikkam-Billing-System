import React from 'react';
import type { CustomerBill, ShopSettings } from '../../types';
import { fmtDate } from '../../utils/dateFormat';

interface ReviewStepProps {
  bill: Partial<CustomerBill>;
  settings: ShopSettings;
  onEditCustomer: () => void;
  onEditItems: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ bill, settings, onEditCustomer, onEditItems }) => {
  if (!bill.items) return null;

  return (
    <div className="text-sm">
      {/* Shop Header */}
      <div className="text-center mb-4 pb-4 border-b border-[var(--border)]">
        <div
          className="text-lg font-bold text-[var(--text-primary)]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {settings.shopName}
        </div>
        <div className="text-xs text-[var(--text-secondary)] mt-1">{settings.addressLine1}</div>
        <div className="text-xs text-[var(--text-secondary)]">
          Ph: {settings.phone1} | GSTIN: {settings.gstin}
        </div>
        <div className="text-xs font-bold mt-2 text-[var(--accent)]">GST INVOICE</div>
      </div>

      {/* Bill Info */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-xs text-[var(--text-secondary)]">Bill No</div>
          <div
            className="font-semibold text-[var(--accent)]"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {bill.billNo}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--text-secondary)]">Date</div>
          <div className="font-medium">{bill.date ? fmtDate(bill.date) : '—'}</div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="card mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="section-title mb-0">Customer Details</span>
          <button
            type="button"
            onClick={onEditCustomer}
            className="text-xs text-[var(--accent)] font-semibold"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1 text-sm">
          <div>
            <span className="text-xs text-[var(--text-secondary)]">Name: </span>
            <span className="font-medium">{bill.customerName}</span>
          </div>
          <div>
            <span className="text-xs text-[var(--text-secondary)]">Phone: </span>
            <span className="font-medium">{bill.customerPhone}</span>
          </div>
          {bill.customerAddress && (
            <div className="col-span-2">
              <span className="text-xs text-[var(--text-secondary)]">Address: </span>
              <span>{bill.customerAddress}</span>
            </div>
          )}
          {bill.customerGstin && (
            <div className="col-span-2">
              <span className="text-xs text-[var(--text-secondary)]">GSTIN: </span>
              <span
                className="font-mono"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {bill.customerGstin}
              </span>
            </div>
          )}
          <div>
            <span className="text-xs text-[var(--text-secondary)]">Payment: </span>
            <span className="font-medium">{bill.paymentType}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="flex items-center justify-between mb-2">
        <span className="section-title mb-0">Items</span>
        <button
          type="button"
          onClick={onEditItems}
          className="text-xs text-[var(--accent)] font-semibold"
        >
          Edit
        </button>
      </div>

      <div className="overflow-x-auto mb-3">
        <table className="w-full text-xs" style={{ minWidth: 400 }}>
          <thead>
            <tr style={{ background: '#F5F5F5' }}>
              <th className="text-left px-2 py-2 font-bold">#</th>
              <th className="text-left px-2 py-2 font-bold">Description</th>
              <th className="text-right px-2 py-2 font-bold">Qty</th>
              <th className="text-right px-2 py-2 font-bold">Rate</th>
              <th className="text-right px-2 py-2 font-bold">Taxable</th>
              <th className="text-right px-2 py-2 font-bold">GST</th>
              <th className="text-right px-2 py-2 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {bill.items?.map(item => (
              <tr key={item.id} className="border-t border-[var(--divider)]">
                <td className="px-2 py-2">{item.itemNo}</td>
                <td className="px-2 py-2">
                  <div className="font-medium">{item.category} {item.brand && `- ${item.brand}`}</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">{item.description}</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">HSN: {item.hsnCode}</div>
                </td>
                <td className="px-2 py-2 text-right font-mono">{item.quantity}</td>
                <td className="px-2 py-2 text-right font-mono">₹{item.rate.toFixed(2)}</td>
                <td className="px-2 py-2 text-right font-mono">₹{item.taxableAmount.toFixed(2)}</td>
                <td className="px-2 py-2 text-right font-mono">
                  <div>S: ₹{item.sgstAmount.toFixed(2)}</div>
                  <div>C: ₹{item.cgstAmount.toFixed(2)}</div>
                </td>
                <td className="px-2 py-2 text-right font-mono font-bold">₹{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="card">
        <div className="totals-row">
          <span className="text-[var(--text-secondary)]">Taxable Amount</span>
          <span className="font-mono">₹{(bill.taxableAmount ?? 0).toFixed(2)}</span>
        </div>
        <div className="totals-row">
          <span className="text-[var(--text-secondary)]">SGST</span>
          <span className="font-mono">₹{(bill.totalSgst ?? 0).toFixed(2)}</span>
        </div>
        <div className="totals-row">
          <span className="text-[var(--text-secondary)]">CGST</span>
          <span className="font-mono">₹{(bill.totalCgst ?? 0).toFixed(2)}</span>
        </div>
        <div className="totals-row grand">
          <span>Grand Total</span>
          <span className="font-mono">₹{(bill.grandTotal ?? 0).toFixed(2)}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-[var(--divider)] text-xs italic text-[var(--text-secondary)]">
          {bill.amountInWords}
        </div>
      </div>
    </div>
  );
};
