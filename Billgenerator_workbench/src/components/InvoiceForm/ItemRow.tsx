import React, { useEffect, useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import type { InvoiceItem } from '../../types';
import { useProductMaster } from '../../context/ProductMasterContext';
import { getCachedEntries, getCategories, getBrands } from '../../utils/productMaster';

interface ItemRowProps {
  item: InvoiceItem;
  onUpdate: (item: InvoiceItem) => void;
  onRemove: () => void;
}

const GST_OPTIONS = [0, 5, 12, 18, 28];
const OTHERS_VAL  = '__others__';

const calcItem = (item: InvoiceItem): InvoiceItem => {
  const taxableAmount = parseFloat((item.quantity * item.rate).toFixed(2));
  const sgstPercent   = item.gstPercent / 2;
  const cgstPercent   = item.gstPercent / 2;
  const sgstAmount    = parseFloat((taxableAmount * sgstPercent / 100).toFixed(2));
  const cgstAmount    = parseFloat((taxableAmount * cgstPercent / 100).toFixed(2));
  const total         = parseFloat((taxableAmount + sgstAmount + cgstAmount).toFixed(2));
  return { ...item, taxableAmount, sgstPercent, cgstPercent, sgstAmount, cgstAmount, total };
};

export const ItemRow: React.FC<ItemRowProps> = ({ item, onUpdate, onRemove }) => {
  const { categories, getBrandsFor, getProductsFor } = useProductMaster();

  // Detect "others" state from the initial item value (e.g., edit mode)
  const [catIsOthers, setCatIsOthers] = useState(() => {
    if (!item.category) return false;
    return !getCategories(getCachedEntries()).includes(item.category);
  });
  const [brandIsOthers, setBrandIsOthers] = useState(() => {
    if (!item.brand) return false;
    return !getBrands(item.category || undefined, getCachedEntries()).includes(item.brand);
  });

  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [catSearch, setCatSearch]             = useState('');

  const update = (patch: Partial<InvoiceItem>) =>
    onUpdate(calcItem({ ...item, ...patch }));

  // Brands available for the selected category
  const availableBrands = getBrandsFor(catIsOthers ? undefined : item.category || undefined);
  // Products available for selected category + brand
  const availableProducts = getProductsFor(
    catIsOthers   ? undefined : item.category || undefined,
    brandIsOthers ? undefined : item.brand    || undefined,
  );

  const filteredCats = categories.filter(c =>
    c.toLowerCase().includes(catSearch.toLowerCase()),
  );

  const handleCategorySelect = (cat: string) => {
    if (cat === OTHERS_VAL) {
      setCatIsOthers(true);
      setBrandIsOthers(false);
      update({ category: '', brand: '', description: '', hsnCode: '', gstPercent: 18 });
    } else {
      setCatIsOthers(false);
      setBrandIsOthers(false);
      // Pre-fill HSN/GST from the first product in this category
      const products = getProductsFor(cat);
      const hsn = products[0]?.hsn         ?? '';
      const gst = products[0]?.gstPercent  ?? 18;
      update({ category: cat, brand: '', description: '', hsnCode: hsn, gstPercent: gst });
    }
    setShowCatDropdown(false);
    setCatSearch('');
  };

  const handleBrandChange = (val: string) => {
    if (val === OTHERS_VAL) {
      setBrandIsOthers(true);
      update({ brand: '' });
    } else {
      setBrandIsOthers(false);
      // Pre-fill HSN/GST from the first product for this brand+category
      const cat      = catIsOthers ? undefined : item.category || undefined;
      const products = getProductsFor(cat, val);
      const hsn      = products[0]?.hsn        ?? item.hsnCode;
      const gst      = products[0]?.gstPercent ?? item.gstPercent;
      update({ brand: val, hsnCode: hsn, gstPercent: gst });
    }
  };

  const handleProductSelect = (productName: string) => {
    if (!productName) return;
    const product = availableProducts.find(p => p.productName === productName);
    if (product) {
      update({ description: product.productName, hsnCode: product.hsn, gstPercent: product.gstPercent });
    }
  };

  // Close category dropdown on outside click
  useEffect(() => {
    if (!showCatDropdown) return;
    const handler = () => setShowCatDropdown(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [showCatDropdown]);

  const displayCategory = catIsOthers
    ? (item.category || 'Others')
    : item.category;

  return (
    <div className="item-card">
      {/* Header: item no + remove */}
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

      {/* ── Category ── */}
      <div className="input-group">
        <label className="input-label">Category</label>
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="input-field flex items-center justify-between text-left"
            onClick={() => setShowCatDropdown(v => !v)}
          >
            <span className={displayCategory ? 'text-[var(--text-primary)]' : 'text-[#9CA3AF]'}>
              {displayCategory || 'Select category…'}
            </span>
            <ChevronDown size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
          </button>

          {showCatDropdown && (
            <div className="absolute top-full left-0 right-0 z-50 bg-white border border-[var(--border)] rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
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
                  onClick={() => handleCategorySelect(cat)}
                >
                  {cat}
                </button>
              ))}
              {filteredCats.length === 0 && (
                <div className="text-xs text-[var(--text-secondary)] px-3 py-3 text-center">No results</div>
              )}
              <button
                type="button"
                className="w-full text-left text-sm px-3 py-2.5 hover:bg-[var(--accent-light)] hover:text-[var(--accent)] transition-colors border-t border-[var(--divider)] italic text-[var(--text-secondary)]"
                onClick={() => handleCategorySelect(OTHERS_VAL)}
              >
                Others
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Custom category input when "Others" */}
      {catIsOthers && (
        <div className="input-group">
          <label className="input-label">Custom Category</label>
          <input
            className="input-field"
            value={item.category}
            onChange={e => update({ category: e.target.value })}
            placeholder="e.g. Wooden Pooja Stand"
            autoFocus
          />
        </div>
      )}

      {/* ── Brand ── */}
      <div className="input-group">
        <label className="input-label">Brand</label>
        <select
          className="select-field"
          value={brandIsOthers ? OTHERS_VAL : item.brand}
          onChange={e => handleBrandChange(e.target.value)}
        >
          <option value="">Select brand…</option>
          {availableBrands.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
          <option value={OTHERS_VAL}>Others</option>
        </select>
      </div>

      {/* Custom brand input when "Others" */}
      {brandIsOthers && (
        <div className="input-group">
          <label className="input-label">Custom Brand</label>
          <input
            className="input-field"
            value={item.brand}
            onChange={e => update({ brand: e.target.value })}
            placeholder="e.g. Local"
            autoFocus
          />
        </div>
      )}

      {/* ── Product suggestions ── (shown when products available and not Others category) */}
      {!catIsOthers && availableProducts.length > 0 && (
        <div className="input-group">
          <label className="input-label">
            Product
            <span className="text-[var(--text-secondary)] font-normal ml-1">(select to auto-fill)</span>
          </label>
          <select
            className="select-field"
            value=""
            onChange={e => handleProductSelect(e.target.value)}
          >
            <option value="">Choose a product…</option>
            {availableProducts.map(p => (
              <option key={p.productName} value={p.productName}>{p.productName}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Product Description ── (always editable) */}
      <div className="input-group">
        <label className="input-label">
          Product Description <span className="text-red-500">*</span>
        </label>
        <input
          className="input-field"
          value={item.description}
          onChange={e => update({ description: e.target.value })}
          placeholder="e.g. Samsung 55″ 4K Smart TV"
        />
      </div>

      {/* ── HSN + GST% ── (always editable) */}
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

      {/* ── Qty + Rate ── */}
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

      {/* ── Calculated totals ── */}
      {item.taxableAmount > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--divider)] flex gap-3 flex-wrap">
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Taxable</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">₹{item.taxableAmount.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-[var(--success)] uppercase tracking-wide">SGST {item.sgstPercent}%</span>
            <span className="text-sm font-semibold text-[var(--success)]">₹{item.sgstAmount.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-[var(--success)] uppercase tracking-wide">CGST {item.cgstPercent}%</span>
            <span className="text-sm font-semibold text-[var(--success)]">₹{item.cgstAmount.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-[var(--accent)] uppercase tracking-wide font-bold">Total</span>
            <span className="text-base font-bold text-[var(--accent)]">₹{item.total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
