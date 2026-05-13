import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Search, Download, Mail, CheckSquare, Square, FileText } from 'lucide-react';
import { Header } from '../components/Header';
import { CalendarGrid } from '../components/CalendarGrid';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { getCustomerBills, getPurchaseBills, getNoSalesDays, appendNoSalesDay } from '../utils/googleSheets';
import { exportMonthlyExcel } from '../utils/exportExcel';
import { downloadDeclarationPDF, getDeclarationPDFBlob } from '../utils/generateDeclarationPDF';
import { ensureFolderPath, uploadFileToDrive, getMonthFolderPath } from '../utils/googleDrive';
import { fmtCurrency } from '../utils/currencyFormat';
import { getDaysInMonth, getMonthName, currentYear, currentMonth, todayISO } from '../utils/dateFormat';
import type { CustomerBill, PurchaseBill, NoSalesDay, MonthSummary } from '../types';

export const Auditor: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { settings } = useShop();

  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const [bills, setBills] = useState<CustomerBill[]>([]);
  const [purchases, setPurchases] = useState<PurchaseBill[]>([]);
  const [noSales, setNoSales] = useState<NoSalesDay[]>([]);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [missingDates, setMissingDates] = useState<string[]>([]);
  const [selectedMissing, setSelectedMissing] = useState<Set<string>>(new Set());
  const [generatingDecl, setGeneratingDecl] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [auditorEmail, setAuditorEmail] = useState(settings.auditorEmail || '');
  const [emailBody, setEmailBody] = useState('');

  const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
  const YEARS = [currentYear() - 1, currentYear(), currentYear() + 1];

  const analyze = async () => {
    if (!isAuthenticated) { toast.error('Connect Google Account first'); return; }
    setLoading(true);
    try {
      const [b, p, ns] = await Promise.all([
        getCustomerBills(year, month),
        getPurchaseBills(year, month),
        getNoSalesDays(year, month),
      ]);

      const active = b.filter(x => x.status === 'active');
      setBills(active);
      setPurchases(p);
      setNoSales(ns);

      const totalSales = active.reduce((s, x) => s + x.grandTotal, 0);
      const totalSgst = active.reduce((s, x) => s + x.totalSgst, 0);
      const totalCgst = active.reduce((s, x) => s + x.totalCgst, 0);

      // Compute missing days
      const today = new Date();
      const daysInMonth = getDaysInMonth(year, month);
      const billDates = new Set(active.map(x => x.date));
      const declDates = new Set(ns.map(x => x.date));
      const missing: string[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayDate = new Date(dateStr + 'T00:00:00');
        if (dayDate > today) break;
        if (!billDates.has(dateStr) && !declDates.has(dateStr)) {
          missing.push(dateStr);
        }
      }

      setMissingDates(missing);
      setSelectedMissing(new Set(missing));
      setSummary({
        totalBills: active.length,
        totalPurchaseBills: p.length,
        totalSales,
        totalSgst,
        totalCgst,
        missingDays: missing.length,
      });

      // Default email body
      const monthName = getMonthName(month);
      setEmailBody(
        `Dear Sir/Madam,\n\nPlease find attached the GST billing summary for ${monthName} ${year}.\n\n` +
        `Total Bills: ${active.length}\nTotal Sales: ${fmtCurrency(totalSales)}\n` +
        `SGST: ${fmtCurrency(totalSgst)} | CGST: ${fmtCurrency(totalCgst)}\n` +
        `Total GST: ${fmtCurrency(totalSgst + totalCgst)}\n\n` +
        `Regards,\n${settings.shopName}`
      );

      setAnalyzed(true);
      toast.success('Analysis complete!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMissing = (date: string) => {
    setSelectedMissing(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handleGenerateDeclarations = async () => {
    const dates = Array.from(selectedMissing);
    if (dates.length === 0) { toast.error('Select dates first'); return; }
    setGeneratingDecl(true);
    try {
      for (const date of dates) {
        // Download PDF
        downloadDeclarationPDF(date, settings);

        // Upload to Drive if authenticated
        if (isAuthenticated) {
          try {
            const blob = getDeclarationPDFBlob(date, settings);
            const monthName = getMonthName(month);
            const folderPath = [...getMonthFolderPath(year, monthName), 'No Sale Declarations'];
            const folderId = await ensureFolderPath(folderPath);
            const result = await uploadFileToDrive(blob, `Declaration-${date}.pdf`, folderId, 'application/pdf');

            // Record in Sheets
            const ns: NoSalesDay = {
              id: Math.random().toString(36).slice(2),
              date,
              month,
              year,
              declarationDriveId: result.id,
              createdAt: new Date().toISOString(),
            };
            await appendNoSalesDay(ns);
            setNoSales(prev => [...prev, ns]);
          } catch { /* continue */ }
        }
      }
      setSelectedMissing(new Set());
      toast.success(`Generated ${dates.length} declaration(s)`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGeneratingDecl(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await exportMonthlyExcel(year, month, bills, purchases);
      toast.success('Excel exported!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleSendEmail = () => {
    if (!auditorEmail.trim()) { toast.error('Enter auditor email first'); return; }
    const subject = encodeURIComponent(`GST Summary - ${getMonthName(month)} ${year} - ${settings.shopName}`);
    const body = encodeURIComponent(emailBody);
    // Open Gmail compose directly — works reliably, no mailto: limitations
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(auditorEmail)}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    toast.success('Gmail opened in new tab — attach the Excel file before sending');
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <Header title="Auditor Report" showBack />
      <div className="page-container">
        {/* Month/Year selector */}
        <div className="card mb-4">
          <p className="section-title">Select Period</p>
          <div className="flex gap-2">
            <select
              className="select-field flex-1"
              value={month}
              onChange={e => { setMonth(parseInt(e.target.value)); setAnalyzed(false); }}
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select
              className="select-field w-28"
              value={year}
              onChange={e => { setYear(parseInt(e.target.value)); setAnalyzed(false); }}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            type="button"
            className="btn-primary w-full mt-3"
            onClick={analyze}
            disabled={loading || !isAuthenticated}
          >
            <Search size={18} />
            {loading ? 'Analyzing…' : 'Analyze Bills'}
          </button>
          {!isAuthenticated && (
            <p className="text-xs text-red-500 text-center mt-2">Connect Google Account first</p>
          )}
        </div>

        {analyzed && summary && (
          <>
            {/* Summary stats */}
            <p className="section-title">{getMonthName(month)} {year} Summary</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Customer Bills" value={summary.totalBills} />
              <StatCard label="Purchase Bills" value={summary.totalPurchaseBills} color="var(--warning)" />
              <StatCard label="Total Sales" value={fmtCurrency(summary.totalSales)} />
              <StatCard
                label="Total GST"
                value={fmtCurrency(summary.totalSgst + summary.totalCgst)}
                color="var(--success)"
              />
            </div>

            {/* More details */}
            <div className="card mb-4">
              <div className="totals-row">
                <span className="text-[var(--text-secondary)]">SGST</span>
                <span className="font-mono">{fmtCurrency(summary.totalSgst)}</span>
              </div>
              <div className="totals-row">
                <span className="text-[var(--text-secondary)]">CGST</span>
                <span className="font-mono">{fmtCurrency(summary.totalCgst)}</span>
              </div>
              <div className="totals-row">
                <span className="text-[var(--text-secondary)]">Missing Days</span>
                <span
                  className="font-bold"
                  style={{ color: summary.missingDays > 0 ? 'var(--error)' : 'var(--success)' }}
                >
                  {summary.missingDays}
                </span>
              </div>
            </div>

            {/* Calendar */}
            <p className="section-title">Calendar View</p>
            <div className="card mb-4">
              <CalendarGrid
                year={year}
                month={month}
                bills={bills}
                noSalesDays={noSales}
                onDayClick={() => {}}
              />
            </div>

            {/* Missing Days */}
            {missingDates.length > 0 && (
              <>
                <p className="section-title">Missing Days ({missingDates.length})</p>
                <div className="card mb-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Select days to generate No Sale Declarations
                  </p>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      className="btn-sm btn-ghost"
                      onClick={() => setSelectedMissing(new Set(missingDates))}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn-sm btn-ghost"
                      onClick={() => setSelectedMissing(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                  {missingDates.map(date => (
                    <div
                      key={date}
                      className="flex items-center gap-3 py-2 border-b border-[var(--divider)] last:border-0 cursor-pointer"
                      onClick={() => toggleMissing(date)}
                    >
                      <div className="text-[var(--accent)]">
                        {selectedMissing.has(date) ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <span className="text-sm font-medium">{date}</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-primary w-full mt-4"
                    onClick={handleGenerateDeclarations}
                    disabled={generatingDecl || selectedMissing.size === 0}
                  >
                    <FileText size={18} />
                    {generatingDecl ? 'Generating…' : `Generate ${selectedMissing.size} Declaration(s)`}
                  </button>
                </div>
              </>
            )}

            {/* Export Excel */}
            <div className="card mb-4">
              <p className="section-title">Export Data</p>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={handleExportExcel}
                disabled={exportingExcel}
              >
                <Download size={18} />
                {exportingExcel ? 'Exporting…' : 'Export Monthly Excel'}
              </button>
            </div>

            {/* Email Composition */}
            <div className="card mb-4">
              <p className="section-title">Send to Auditor</p>
              <p className="text-xs text-[var(--text-secondary)] mb-3 -mt-2">
                Opens Gmail compose in a new tab. Attach the Excel file before sending.
              </p>
              <div className="input-group">
                <label className="input-label">Auditor Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={auditorEmail}
                  onChange={e => setAuditorEmail(e.target.value)}
                  placeholder="auditor@example.com"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Email Body (editable)</label>
                <textarea
                  className="textarea-field"
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  rows={6}
                />
              </div>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={handleSendEmail}
                disabled={!auditorEmail.trim()}
              >
                <Mail size={18} />
                Open Gmail &amp; Compose
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
