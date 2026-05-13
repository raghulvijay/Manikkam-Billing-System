import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { hsnMaster } from '../data/hsnMaster';
import type { HsnEntry } from '../types';

const HSN_KEY = 'mc-hsn-master-v2';

const loadEntries = (): HsnEntry[] => {
  try {
    const raw = localStorage.getItem(HSN_KEY);
    if (raw) return JSON.parse(raw) as HsnEntry[];
  } catch { /* ignore */ }
  const seeded = hsnMaster.map(e => ({ ...e }));
  localStorage.setItem(HSN_KEY, JSON.stringify(seeded));
  return seeded;
};

const saveEntries = (entries: HsnEntry[]) =>
  localStorage.setItem(HSN_KEY, JSON.stringify(entries));

const blank = (): HsnEntry => ({
  id: Math.random().toString(36).slice(2),
  category: '',
  keywords: [],
  hsn: '',
  gst: 18,
});

const GST_OPTIONS = [0, 5, 12, 18, 28];

export const HsnMaster: React.FC = () => {
  const [entries, setEntries] = useState<HsnEntry[]>(loadEntries);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<HsnEntry>(blank());
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<HsnEntry>(blank());

  const filtered = entries.filter(e =>
    e.category.toLowerCase().includes(search.toLowerCase()) ||
    e.hsn.includes(search)
  );

  const commit = (updated: HsnEntry[]) => {
    setEntries(updated);
    saveEntries(updated);
  };

  const startEdit = (e: HsnEntry) => { setEditId(e.id); setEditData({ ...e }); };
  const cancelEdit = () => setEditId(null);

  const saveEdit = () => {
    if (!editData.category.trim()) { toast.error('Category name is required'); return; }
    if (!editData.hsn.trim()) { toast.error('HSN code is required'); return; }
    commit(entries.map(e => e.id === editId ? { ...editData, keywords: [editData.category.toLowerCase()] } : e));
    setEditId(null);
    toast.success('Updated');
  };

  const deleteEntry = (id: string) => {
    if (!confirm('Delete this product category?')) return;
    commit(entries.filter(e => e.id !== id));
    toast.success('Deleted');
  };

  const addNew = () => {
    if (!newEntry.category.trim()) { toast.error('Category name is required'); return; }
    if (!newEntry.hsn.trim()) { toast.error('HSN code is required'); return; }
    commit([...entries, { ...newEntry, keywords: [newEntry.category.toLowerCase()] }]);
    setAdding(false);
    setNewEntry(blank());
    toast.success('Added');
  };

  // ── Inline row: view mode ──
  const ViewRow = ({ entry }: { entry: HsnEntry }) => (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--divider)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{entry.category}</p>
        <p className="text-xs mt-0.5" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-secondary)' }}>
          HSN: {entry.hsn || '—'} &nbsp;·&nbsp; GST: {entry.gst}%
        </p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => startEdit(entry)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--accent-light)]"
        >
          <Edit2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => deleteEntry(entry.id)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--error)] hover:bg-red-50"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );

  // ── Inline row: edit mode ──
  const EditRow = () => (
    <div className="py-3 border-b border-[var(--divider)]">
      <div className="input-group mb-2">
        <label className="input-label">Category Name</label>
        <input
          className="input-field"
          value={editData.category}
          onChange={e => setEditData(p => ({ ...p, category: e.target.value }))}
          placeholder="e.g. Double Door Refrigerator"
          autoFocus
        />
      </div>
      <div className="flex gap-2 mb-2">
        <div className="input-group flex-1">
          <label className="input-label">HSN Code</label>
          <input
            className="input-field"
            value={editData.hsn}
            onChange={e => setEditData(p => ({ ...p, hsn: e.target.value }))}
            placeholder="84181000"
            style={{ fontFamily: "'DM Mono', monospace" }}
            inputMode="numeric"
          />
        </div>
        <div className="input-group w-28">
          <label className="input-label">GST %</label>
          <select
            className="select-field"
            value={editData.gst}
            onChange={e => setEditData(p => ({ ...p, gst: parseInt(e.target.value) }))}
          >
            {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-primary btn-sm flex-1" onClick={saveEdit}>
          <Check size={14} /> Save
        </button>
        <button type="button" className="btn-ghost btn-sm flex-1" onClick={cancelEdit}>
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      {/* Search */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          className="input-field pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products or HSN…"
        />
      </div>

      {/* Add button */}
      <button
        type="button"
        className="btn-primary w-full mb-4"
        onClick={() => { setAdding(true); setEditId(null); }}
      >
        <Plus size={18} /> Add Product Category
      </button>

      {/* Add form */}
      {adding && (
        <div className="card mb-4" style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
          <p className="section-title mb-3">New Product Category</p>
          <div className="input-group">
            <label className="input-label">Category Name</label>
            <input
              className="input-field"
              value={newEntry.category}
              onChange={e => setNewEntry(p => ({ ...p, category: e.target.value }))}
              placeholder="e.g. Fully Automatic Washing Machine"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <div className="input-group flex-1">
              <label className="input-label">HSN Code</label>
              <input
                className="input-field"
                value={newEntry.hsn}
                onChange={e => setNewEntry(p => ({ ...p, hsn: e.target.value }))}
                placeholder="84501100"
                style={{ fontFamily: "'DM Mono', monospace" }}
                inputMode="numeric"
              />
            </div>
            <div className="input-group w-28">
              <label className="input-label">GST %</label>
              <select
                className="select-field"
                value={newEntry.gst}
                onChange={e => setNewEntry(p => ({ ...p, gst: parseInt(e.target.value) }))}
              >
                {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <button type="button" className="btn-primary flex-1" onClick={addNew}>
              <Check size={16} /> Add
            </button>
            <button type="button" className="btn-ghost flex-1" onClick={() => { setAdding(false); setNewEntry(blank()); }}>
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <p className="text-xs text-[var(--text-secondary)] mb-2">{filtered.length} products</p>
      <div className="card">
        {filtered.length === 0 && (
          <p className="text-sm text-center text-[var(--text-secondary)] py-6">No products found</p>
        )}
        {filtered.map(entry => (
          <div key={entry.id}>
            {editId === entry.id ? <EditRow /> : <ViewRow entry={entry} />}
          </div>
        ))}
      </div>
    </div>
  );
};
