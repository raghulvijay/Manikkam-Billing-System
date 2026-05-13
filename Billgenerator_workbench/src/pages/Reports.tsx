import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart2, TrendingUp } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { getCustomerBills, getPurchaseBills } from '../utils/googleSheets';
import { fmtCurrency } from '../utils/currencyFormat';
import { currentYear, currentMonth, getMonthName } from '../utils/dateFormat';

export const Reports: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [totalGst, setTotalGst] = useState(0);
  const [billCount, setBillCount] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState(0);

  const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
  const YEARS = [currentYear() - 1, currentYear()];

  const loadData = async () => {
    if (!isAuthenticated) { toast.error('Connect Google Account'); return; }
    setLoading(true);
    try {
      const [bills, purchases] = await Promise.all([
        getCustomerBills(year, month),
        getPurchaseBills(year, month),
      ]);
      const active = bills.filter(b => b.status === 'active');
      setTotalSales(active.reduce((s, b) => s + b.grandTotal, 0));
      setTotalGst(active.reduce((s, b) => s + b.totalSgst + b.totalCgst, 0));
      setBillCount(active.length);
      setPurchaseCount(purchases.length);
      setLoaded(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-container">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--accent)]"
            style={{ background: 'var(--accent-light)' }}>
            <BarChart2 size={20} />
          </div>
          <div>
            <p className="font-semibold">Monthly Summary</p>
            <p className="text-xs text-[var(--text-secondary)]">Select period and load data</p>
          </div>
        </div>

        <div className="card mb-4">
          <div className="flex gap-2 mb-3">
            <select className="select-field flex-1" value={month}
              onChange={e => { setMonth(parseInt(e.target.value)); setLoaded(false); }}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="select-field w-28" value={year}
              onChange={e => { setYear(parseInt(e.target.value)); setLoaded(false); }}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={loadData}
            disabled={loading || !isAuthenticated}
          >
            <TrendingUp size={18} />
            {loading ? 'Loading…' : 'Load Report'}
          </button>
        </div>

        {loaded && (
          <>
            <p className="section-title">{getMonthName(month)} {year}</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Customer Bills" value={billCount} />
              <StatCard label="Purchase Bills" value={purchaseCount} color="var(--warning)" />
              <StatCard label="Total Sales" value={fmtCurrency(totalSales)} />
              <StatCard label="Total GST" value={fmtCurrency(totalGst)} color="var(--success)" />
            </div>
          </>
        )}

        {!isAuthenticated && (
          <div className="alert alert-warning mt-4">
            Connect your Google Account to view reports.
          </div>
        )}
      </div>
    </div>
  );
};
