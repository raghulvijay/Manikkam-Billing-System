import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FilePlus, Upload, FileText, Settings, TrendingUp, Receipt, CalendarDays, Percent } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { fmtCurrency } from '../utils/currencyFormat';
import { fmtDate, currentYear, currentMonth, getMonthName, todayISO } from '../utils/dateFormat';
import { getCustomerBills } from '../utils/googleSheets';
import type { CustomerBill } from '../types';

const BILLS_KEY = 'mc-bills';

const loadLocalBills = (): CustomerBill[] => {
  try {
    return JSON.parse(localStorage.getItem(BILLS_KEY) ?? '[]') as CustomerBill[];
  } catch { return []; }
};

const QUICK_ACTIONS = [
  { path: '/invoice/new',     label: 'Generate Bill',   desc: 'Create GST invoice',   icon: FilePlus,  accent: true  },
  { path: '/upload/purchase', label: 'Upload Purchase', desc: 'Add supplier bill',     icon: Upload,    accent: false },
  { path: '/auditor',         label: 'Auditor',         desc: 'Monthly analysis',      icon: FileText,  accent: false },
  { path: '/settings',        label: 'Settings',        desc: 'Shop & account',        icon: Settings,  accent: false },
] as const;

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, signIn } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentBills, setRecentBills] = useState<CustomerBill[]>([]);
  const [monthSales, setMonthSales] = useState(0);
  const [monthBillCount, setMonthBillCount] = useState(0);
  const [gstCollected, setGstCollected] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [dataSource, setDataSource] = useState<'local' | 'cloud'>('local');

  const year = currentYear();
  const month = currentMonth();
  const monthLabel = `${getMonthName(month)} ${year}`;
  const today = todayISO();

  // Load local bills immediately (no auth needed)
  useEffect(() => {
    const local = loadLocalBills();
    const activeLocal = local.filter(b => b.status === 'active');
    const monthLocal = activeLocal.filter(b => {
      const d = b.date || '';
      return d.startsWith(`${year}-${String(month).padStart(2, '0')}`);
    });
    const todayLocal = activeLocal.filter(b => b.date === today);
    const sorted = [...monthLocal].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    setRecentBills(sorted.slice(0, 5));
    setMonthSales(monthLocal.reduce((s, b) => s + b.grandTotal, 0));
    setMonthBillCount(monthLocal.length);
    setGstCollected(monthLocal.reduce((s, b) => s + b.totalSgst + b.totalCgst, 0));
    setTodayCount(todayLocal.length);
    setDataSource('local');
  }, [year, month, today]);

  // When authenticated, refresh from Google Sheets for accurate cloud data
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    getCustomerBills(year, month)
      .then(bills => {
        const active = bills.filter(b => b.status === 'active');
        const sorted = [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setRecentBills(sorted.slice(0, 5));
        setMonthSales(active.reduce((s, b) => s + b.grandTotal, 0));
        setMonthBillCount(active.length);
        setGstCollected(active.reduce((s, b) => s + b.totalSgst + b.totalCgst, 0));
        setTodayCount(active.filter(b => b.date === today).length);
        setDataSource('cloud');
      })
      .catch(() => { /* keep local data on error */ })
      .finally(() => setLoading(false));
  }, [isAuthenticated, year, month, today]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await signIn();
      toast.success('Connected to Google!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      if (!msg.includes('cancel') && !msg.includes('popup')) toast.error(msg);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Offline / Connect banner */}
      {!isAuthenticated && (
        <div
          className="mb-5 rounded-xl border border-dashed border-[var(--accent)] p-4"
          style={{ background: 'var(--accent-light)' }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--accent)] mb-0.5">Offline Mode</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Bills are saved locally. Connect Google to sync with Drive &amp; Sheets.
              </p>
            </div>
            <button
              className="btn-primary btn-sm flex-shrink-0"
              onClick={handleConnect}
              disabled={connecting}
              style={{ minWidth: 90 }}
            >
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title mb-0">{monthLabel} Overview</p>
          {isAuthenticated && (
            <span className="text-[10px] text-[var(--text-secondary)]">
              {dataSource === 'cloud' ? '☁ Cloud' : '📱 Local'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Sales"
            value={loading ? '—' : fmtCurrency(monthSales)}
            icon={<TrendingUp size={18} />}
            loading={loading}
          />
          <StatCard
            label="Bills This Month"
            value={loading ? '—' : monthBillCount}
            icon={<Receipt size={18} />}
            color="var(--success)"
            loading={loading}
          />
          <StatCard
            label="GST Collected"
            value={loading ? '—' : fmtCurrency(gstCollected)}
            icon={<Percent size={18} />}
            color="var(--warning)"
            loading={loading}
          />
          <StatCard
            label="Today's Bills"
            value={loading ? '—' : todayCount}
            icon={<CalendarDays size={18} />}
            color="#6366F1"
            loading={loading}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <p className="section-title">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {QUICK_ACTIONS.map(({ path, label, desc, icon: Icon, accent }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="card text-left active:scale-[0.97] transition-transform cursor-pointer"
            style={{ background: accent ? 'var(--accent)' : 'var(--bg-card)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
              style={{
                background: accent ? 'rgba(255,255,255,0.15)' : 'var(--accent-light)',
                color: accent ? '#fff' : 'var(--accent)',
              }}
            >
              <Icon size={20} />
            </div>
            <div
              className="font-semibold text-sm"
              style={{ color: accent ? '#fff' : 'var(--text-primary)' }}
            >
              {label}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: accent ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}
            >
              {desc}
            </div>
          </button>
        ))}
      </div>

      {/* Recent Bills */}
      {recentBills.length > 0 && (
        <>
          <p className="section-title">Recent Bills</p>
          <div className="card">
            {recentBills.map((b, i) => (
              <div
                key={b.id || i}
                className="list-item"
                onClick={() => navigate(`/invoice/${b.id || b.billNo}`)}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <Receipt size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ fontFamily: "'DM Mono', monospace", color: 'var(--accent)' }}
                  >
                    {b.billNo}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">
                    {b.customerName} · {fmtDate(b.date)}
                  </div>
                </div>
                <div className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                  {fmtCurrency(b.grandTotal)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {recentBills.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">🧾</p>
          <p className="text-sm text-[var(--text-secondary)]">No bills yet this month</p>
          <button
            className="btn-primary mt-4"
            onClick={() => navigate('/invoice/new')}
          >
            <FilePlus size={16} /> Generate First Bill
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-[10px] text-[var(--text-secondary)]">
        MANIKKAM &amp; CO · GST Billing System
      </div>
    </div>
  );
};
