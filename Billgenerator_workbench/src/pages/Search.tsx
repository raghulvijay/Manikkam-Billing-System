import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Receipt, Phone, X, Pencil, Loader } from 'lucide-react';
import { fmtCurrency } from '../utils/currencyFormat';
import { fmtDate } from '../utils/dateFormat';
import type { CustomerBill } from '../types';
import { useAuth } from '../context/AuthContext';
import { getCustomerBills } from '../utils/googleSheets';

const BILLS_KEY = 'mc-bills';

const loadAll = (): CustomerBill[] => {
  try { return JSON.parse(localStorage.getItem(BILLS_KEY) ?? '[]') as CustomerBill[]; }
  catch { return []; }
};

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerBill[]>([]);
  const [searched, setSearched] = useState(false);
  const [allBills, setAllBills] = useState<CustomerBill[]>(() => loadAll());
  const [cloudLoading, setCloudLoading] = useState(false);

  // Fetch from Sheets and merge with local cache
  useEffect(() => {
    if (!isAuthenticated) return;
    setCloudLoading(true);
    getCustomerBills()
      .then(cloudBills => {
        setAllBills(prev => {
          const cloudIds = new Set(cloudBills.map(b => b.id));
          const merged = [
            ...cloudBills,
            ...prev.filter(b => !cloudIds.has(b.id)),
          ];
          try { localStorage.setItem(BILLS_KEY, JSON.stringify(merged.slice(0, 200))); } catch { /* ignore */ }
          return merged;
        });
      })
      .catch(() => { /* silent fail — keep local */ })
      .finally(() => setCloudLoading(false));
  }, [isAuthenticated]);

  // Live search as user types
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    const lower = q.toLowerCase();
    const digits = q.replace(/\D/g, '');
    const filtered = allBills.filter(b => {
      const phoneMatch = digits && b.customerPhone.replace(/\D/g, '').includes(digits);
      const nameMatch = b.customerName.toLowerCase().includes(lower);
      const billNoMatch = b.billNo.toLowerCase().includes(lower);
      return phoneMatch || nameMatch || billNoMatch;
    });
    // Sort: most recent first
    const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setResults(sorted);
    setSearched(true);
  }, [query, allBills]);

  return (
    <div className="page-container">
      {/* Search input */}
      <div className="relative mb-4">
        <SearchIcon
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none"
        />
        <input
          className="input-field pl-10 pr-10"
          type="tel"
          inputMode="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by mobile, name or bill no…"
          autoFocus
        />
        {query && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            onClick={() => setQuery('')}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Cloud sync indicator */}
      {cloudLoading && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-3">
          <Loader size={12} className="animate-spin" />
          <span>Syncing from cloud…</span>
        </div>
      )}

      {/* Result count */}
      {searched && (
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          {results.length === 0
            ? 'No bills found'
            : `${results.length} bill${results.length > 1 ? 's' : ''} found`}
        </p>
      )}

      {/* All recent bills when no query */}
      {!query && allBills.length > 0 && (
        <>
          <p className="section-title">All Bills ({allBills.length})</p>
          <div className="card">
            {[...allBills]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 50)
              .map((b, i) => (
                <BillRow
                  key={b.id || i}
                  bill={b}
                  onClick={() => navigate(`/invoice/${b.id || b.billNo}`)}
                  onEdit={() => navigate(`/invoice/edit/${b.id}`)}
                />
              ))}
          </div>
        </>
      )}

      {/* Search results */}
      {searched && results.length > 0 && (
        <div className="card">
          {results.map((b, i) => (
            <BillRow
              key={b.id || i}
              bill={b}
              onClick={() => navigate(`/invoice/${b.id || b.billNo}`)}
              onEdit={() => navigate(`/invoice/edit/${b.id}`)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!query && allBills.length === 0 && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">🧾</p>
          <p className="font-semibold text-[var(--text-primary)]">No bills yet</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Generated bills appear here</p>
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="text-center py-16">
          <Phone size={32} className="mx-auto mb-3 text-[var(--text-secondary)]" />
          <p className="font-semibold text-[var(--text-primary)]">No bills found</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Try searching with the mobile number, customer name, or bill number
          </p>
        </div>
      )}
    </div>
  );
};

const BillRow: React.FC<{ bill: CustomerBill; onClick: () => void; onEdit: () => void }> = ({ bill, onClick, onEdit }) => (
  <div
    className="list-item cursor-pointer active:bg-[var(--divider)]"
    onClick={onClick}
  >
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
    >
      <Receipt size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-semibold"
          style={{ fontFamily: "'DM Mono', monospace", color: 'var(--accent)' }}
        >
          {bill.billNo}
        </span>
        <span className={`badge text-[10px] px-1.5 py-0 ${bill.status === 'active' ? 'badge-success' : 'badge-error'}`}>
          {bill.status}
        </span>
      </div>
      <div className="text-sm font-medium truncate">{bill.customerName}</div>
      <div className="text-xs text-[var(--text-secondary)]">
        {bill.customerPhone} · {fmtDate(bill.date)}
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
        {fmtCurrency(bill.grandTotal)}
      </div>
      <button
        type="button"
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--divider)', color: 'var(--text-secondary)' }}
        onClick={e => { e.stopPropagation(); onEdit(); }}
        title="Edit bill"
      >
        <Pencil size={14} />
      </button>
    </div>
  </div>
);
