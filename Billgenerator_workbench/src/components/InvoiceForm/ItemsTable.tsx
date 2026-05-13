import React from 'react';
import { Plus } from 'lucide-react';
import type { InvoiceItem } from '../../types';
import { ItemRow } from './ItemRow';

interface ItemsTableProps {
  items: InvoiceItem[];
  onAdd: () => void;
  onUpdate: (index: number, item: InvoiceItem) => void;
  onRemove: (index: number) => void;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({ items, onAdd, onUpdate, onRemove }) => {
  const totalTaxable = items.reduce((s, i) => s + i.taxableAmount, 0);
  const totalSgst = items.reduce((s, i) => s + i.sgstAmount, 0);
  const totalCgst = items.reduce((s, i) => s + i.cgstAmount, 0);
  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  return (
    <div>
      {/* Items list */}
      {items.map((item, idx) => (
        <ItemRow
          key={item.id}
          item={item}
          onUpdate={updated => onUpdate(idx, updated)}
          onRemove={() => onRemove(idx)}
        />
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[var(--accent)] text-[var(--accent)] text-sm font-semibold hover:bg-[var(--accent-light)] active:bg-[var(--accent-light)] transition-colors mb-4"
      >
        <Plus size={16} />
        Add Another Item
      </button>

      {/* Running totals */}
      {grandTotal > 0 && (
        <div className="card mt-2">
          <div className="section-title mb-3">Summary</div>
          <div className="totals-row">
            <span className="text-[var(--text-secondary)]">Taxable Amount</span>
            <span className="font-mono">₹{totalTaxable.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span className="text-[var(--text-secondary)]">SGST</span>
            <span className="font-mono">₹{totalSgst.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span className="text-[var(--text-secondary)]">CGST</span>
            <span className="font-mono">₹{totalCgst.toFixed(2)}</span>
          </div>
          <div className="totals-row grand">
            <span>Grand Total</span>
            <span className="font-mono">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
