import React, { useEffect, useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import type { InvoiceItem } from '../../types';
import { BRANDS } from '../../data/brands';
import { getHsnForCategory, getAllCategories } from '../../utils/hsnLookup';

interface ItemRowProps {
  item: InvoiceItem;
  onUpdate: (item: InvoiceItem) => void;
  onRemove: () => void;
}

const GST_OPTIONS = [0, 5, 12, 18, 28];

const calcItem = (item: InvoiceItem): InvoiceItem => {
  const taxableAmount = parseFloat((item.quantity * item.rate).toFixed(2));
  const sgstPercent = item.gstPercent / 2;
  const cgstPercent = item.gstPercent / 2;
  const sgstAmount = parseFloat((taxableAmount * sgstPercent / 100).toFixed(2));
  const cgstAmount = parseFloat((taxableAmount * cgstPercent / 100).toFixed(2));
  const total = parseFloat((taxableAmount + sgstAmount + cgstAmount).toFixed(2));
  return { ...item, taxableAmount, sgstPercent, cgstPercent, sgstAmount, cgstAmount, total };
};

export const ItemRow: React.FC<ItemRowProps> = ({ item, onUpdate, onRemove }) => {
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [catSearch, setCatSearch] = useState('');

  const update = (patch: Partial<InvoiceItem>) => {
    const updated = calcItem({ ...item, ...patch });
    onUpdate(updated);
  };

  const handleCategoryChange = (cat: string) => {
    const { hsn, gst } = getHsnForCategory(cat);
    const updated = calcItem({ ...item, category: cat, hsnCode: hsn, gstPercent: gst });
    onUpdate(updated);
    setShowCatDropdown(false);
    setCatSearch('');
  };

  const filteredCats = getAllCategories()
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .filter(c => c.toLowerCase().includes(catSearch.toLowerCase()));

  // Close dropdown on outside click
  useEffect(() => {
    if (!showCatDropdown) return;
    const handler = () => setShowCatDropdown(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [showCatDropdown]);

  return (
    <div className="item-card">
      {/* Header row: item no + remove */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-[var(--accent)]">Item {item.itemNo}</span>
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--error)] hover:bg-red-50 active:bg-red-100 transition-colors"
          aria-label="Remove item"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Category */}
      <div className="input-group">
        <label className="input-label">Category</label>
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="input-field flex items-center justify-between text-left"
            onClick={() => setShowCatDropdown(v => !v)}
          >
            <span className={item.category ? 'text-[var(--text-primary)]' : 'text-[#9CA3AF]'}>
              {item.category || 'Select category…'}
            </span>
            <ChevronDown size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
          </button>
          {showCatDropdown && (
            <div className="absolute top-full left-0 right-0 z-50 bg-white border border-[var(--border)] rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              <div className="p-2 border-b border-[var(--divider)]">
                <input
                  className="w-full text-sm outline-none px-2 py-1"
                  placeholder="Search categories…"
                  value={catSearch}
                  onChange={e => setCatSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {filteredCats.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className="w-full text-left text-sm px-3 py-2.5 hover:bg-[var(--accent-light)] hover:text-[var(--accent)] transition-colors"
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </button>
              ))}
              {filteredCats.length === 0 && (
                <div className="text-xs text-[var(--text-secondary)] px-3 py-3 text-center">No results</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Brand */}
      <div className="input-group">
        <label className="input-label">Brand</label>
        <select
          className="select-field"
          value={item.brand}
          onChange={e => update({ brand: e.target.value })}
        >
          <option value="">Select brand…</option>
          {[...BRANDS].sort((a, b) => a.localeCompare(b)).map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Product Description */}
      <div className="input-group">
        <label className="input-label">Product Description <span className="text-red-500">*</span></label>
        <input
          className="input-field"
          value={item.description}
          onChange={e => update({ description: e.target.value })}
          placeholder="e.g. Samsung 55'' 4K Smart TV"
        />
      </div>

      {/* HSN Code + GST% */}
      <div className="flex gap-2">
        <div className="input-group flex-1">
          <label className="input-label">HSN Code</label>
          <input
            className="input-field"
            value={item.hsnCode}
            onChange={e => update({ hsnCode: e.target.value })}
            placeholder="HSN"
            style={{ fontFamily: "'DM Mono', monospace" }}
          />
        </div>
        <div className="input-group w-28">
          <label className="input-label">GST %</label>
          <select
            className="select-field"
            value={item.gstPercent}
            onChange={e => update({ gstPercent: parseInt(e.target.value, 10) })}
          >
            {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
          </select>
        </div>
      </div>

      {/* Qty + Rate */}
      <div className="flex gap-2">
        <div className="input-group flex-1">
          <label className="input-label">Quantity <span className="text-red-500">*</span></label>
          <input
            className="input-field"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={item.quantity || ''}
            onChange={e => update({ quantity: parseFloat(e.target.value) || 0 })}
            placeholder="1"
          />
        </div>
        <div className="input-group flex-1">
          <label className="input-label">Rate (₹) <span className="text-red-500">*</span></label>
          <input
            className="input-field"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={item.rate || ''}
            onChange={e => update({ rate: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Calculated row */}
      {item.taxableAmount > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--divider)] flex gap-3 flex-wrap">
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Taxable</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              ₹{item.taxableAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-[var(--success)] uppercase tracking-wide">SGST {item.sgstPercent}%</span>
            <span className="text-sm font-semibold text-[var(--success)]">
              ₹{item.sgstAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-[var(--success)] uppercase tracking-wide">CGST {item.cgstPercent}%</span>
            <span className="text-sm font-semibold text-[var(--success)]">
              ₹{item.cgstAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-[var(--accent)] uppercase tracking-wide font-bold">Total</span>
            <span className="text-base font-bold text-[var(--accent)]">
              ₹{item.total.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
