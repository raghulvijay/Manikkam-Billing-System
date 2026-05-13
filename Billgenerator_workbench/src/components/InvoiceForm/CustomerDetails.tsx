import React from 'react';
import type { PaymentType } from '../../types';

export interface CustomerFormData {
  customerName: string;
  customerGstin: string;
  customerPhone: string;
  vehicleNumber: string;
  customerAddress: string;
  date: string;
  paymentType: PaymentType;
}

interface CustomerDetailsProps {
  data: CustomerFormData;
  billNo: string;
  onChange: (data: CustomerFormData) => void;
  errors?: Partial<Record<keyof CustomerFormData, string>>;
}

const PAYMENT_TYPES: PaymentType[] = ['Cash', 'Credit', 'UPI', 'Bank Transfer'];

export const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  data, billNo, onChange, errors = {},
}) => {
  const update = (key: keyof CustomerFormData, value: string) =>
    onChange({ ...data, [key]: value });

  return (
    <div>
      {/* Bill Number (read-only) */}
      <div className="input-group mb-4">
        <label className="input-label">Bill Number</label>
        <div
          className="input-field flex items-center"
          style={{ fontFamily: "'DM Mono', monospace", background: 'var(--divider)', cursor: 'not-allowed', color: 'var(--accent)' }}
        >
          {billNo || 'Generating…'}
        </div>
      </div>

      {/* Customer Name */}
      <div className="input-group">
        <label className="input-label">Customer Name <span className="text-red-500">*</span></label>
        <input
          className={`input-field${errors.customerName ? ' error' : ''}`}
          value={data.customerName}
          onChange={e => update('customerName', e.target.value)}
          placeholder="Enter customer name"
          autoComplete="off"
        />
        {errors.customerName && <span className="text-xs text-red-500 mt-1">{errors.customerName}</span>}
      </div>

      {/* Customer GSTIN — right below name */}
      <div className="input-group">
        <label className="input-label">Customer GSTIN</label>
        <input
          className="input-field"
          value={data.customerGstin}
          onChange={e => update('customerGstin', e.target.value.toUpperCase())}
          placeholder="Customer GSTIN (optional)"
          maxLength={15}
          style={{ fontFamily: "'DM Mono', monospace" }}
        />
      </div>

      {/* Mobile */}
      <div className="input-group">
        <label className="input-label">Mobile Number <span className="text-red-500">*</span></label>
        <input
          className={`input-field${errors.customerPhone ? ' error' : ''}`}
          type="tel"
          inputMode="numeric"
          value={data.customerPhone}
          onChange={e => update('customerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit mobile number"
        />
        {errors.customerPhone && <span className="text-xs text-red-500 mt-1">{errors.customerPhone}</span>}
      </div>

      {/* Vehicle Number — right below mobile */}
      <div className="input-group">
        <label className="input-label">Vehicle Number</label>
        <input
          className="input-field"
          value={data.vehicleNumber}
          onChange={e => update('vehicleNumber', e.target.value.toUpperCase())}
          placeholder="e.g. TN01AB1234 (optional)"
          style={{ fontFamily: "'DM Mono', monospace" }}
        />
      </div>

      {/* Address */}
      <div className="input-group">
        <label className="input-label">Address</label>
        <textarea
          className="textarea-field"
          value={data.customerAddress}
          onChange={e => update('customerAddress', e.target.value)}
          placeholder="Customer address (optional)"
          rows={2}
        />
      </div>

      {/* Bill Date */}
      <div className="input-group">
        <label className="input-label">Bill Date <span className="text-red-500">*</span></label>
        <input
          type="date"
          className={`input-field${errors.date ? ' error' : ''}`}
          value={data.date}
          onChange={e => update('date', e.target.value)}
        />
        {errors.date && <span className="text-xs text-red-500 mt-1">{errors.date}</span>}
      </div>

      {/* Payment Type */}
      <div className="input-group">
        <label className="input-label">Payment Type <span className="text-red-500">*</span></label>
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {PAYMENT_TYPES.map(pt => (
            <button
              key={pt}
              type="button"
              onClick={() => update('paymentType', pt)}
              className="flex-1 py-3 text-xs font-semibold transition-colors"
              style={{
                background: data.paymentType === pt ? 'var(--accent)' : 'var(--bg-card)',
                color: data.paymentType === pt ? '#fff' : 'var(--text-secondary)',
                borderRight: pt !== 'Bank Transfer' ? '1px solid var(--border)' : 'none',
              }}
            >
              {pt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
