import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Save, LogOut, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Header } from '../components/Header';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { getSheetId } from '../utils/googleSheets';
import { setClientId, getClientId } from '../lib/googleAuth';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useShop();
  const { isAuthenticated, signOut, signIn } = useAuth();

  const [form, setForm] = useState({ ...settings });
  const [clientId, setClientIdState] = useState(getClientId() || '');
  const [saved, setSaved] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showGuide, setShowGuide] = useState(!getClientId());

  const set = <K extends keyof typeof form>(key: K, val: typeof form[K]) =>
    setForm(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    updateSettings(form);
    if (clientId) setClientId(clientId);
    setSaved(true);
    toast.success('Settings saved!');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await signIn();
      toast.success('Connected!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed';
      if (!msg.includes('cancel')) toast.error(msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    signOut();
    toast.success('Disconnected');
  };

  const sheetId = getSheetId();

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <Header title="Settings" showBack />
      <div className="page-container">
        {/* Shop Details */}
        <p className="section-title">Shop Details</p>
        <div className="card mb-4">
          <div className="input-group">
            <label className="input-label">Shop Name</label>
            <input
              className="input-field"
              value={form.shopName}
              onChange={e => set('shopName', e.target.value)}
              placeholder="MANIKKAM & CO"
            />
          </div>
          <div className="input-group">
            <label className="input-label">GSTIN</label>
            <input
              className="input-field"
              value={form.gstin}
              onChange={e => set('gstin', e.target.value.toUpperCase())}
              placeholder="33AOAPL9789B1ZU"
              maxLength={15}
              style={{ fontFamily: "'DM Mono', monospace" }}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Address Line 1</label>
            <input
              className="input-field"
              value={form.addressLine1}
              onChange={e => set('addressLine1', e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Address Line 2</label>
            <input
              className="input-field"
              value={form.addressLine2}
              onChange={e => set('addressLine2', e.target.value)}
              placeholder="City, State, PIN (optional)"
            />
          </div>
          <div className="flex gap-2">
            <div className="input-group flex-1">
              <label className="input-label">Phone 1</label>
              <input
                className="input-field"
                type="tel"
                value={form.phone1}
                onChange={e => set('phone1', e.target.value)}
                placeholder="9498411373"
              />
            </div>
            <div className="input-group flex-1">
              <label className="input-label">Phone 2</label>
              <input
                className="input-field"
                type="tel"
                value={form.phone2}
                onChange={e => set('phone2', e.target.value)}
                placeholder="9840456373"
              />
            </div>
          </div>
        </div>

        {/* Auditor */}
        <p className="section-title">Auditor Details</p>
        <div className="card mb-4">
          <div className="input-group">
            <label className="input-label">Auditor Email</label>
            <input
              type="email"
              className="input-field"
              value={form.auditorEmail}
              onChange={e => set('auditorEmail', e.target.value)}
              placeholder="auditor@example.com"
            />
          </div>
        </div>

        {/* Google Connection */}
        <p className="section-title">Google Account</p>
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm">
                {isAuthenticated ? 'Connected' : 'Not Connected'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {isAuthenticated ? 'Google Drive & Sheets active' : 'Connect to sync data'}
              </p>
            </div>
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: isAuthenticated ? 'var(--success)' : '#D1D5DB' }}
            />
          </div>

          {sheetId && (
            <div className="mb-3 p-2 rounded-lg" style={{ background: 'var(--divider)' }}>
              <p className="text-xs text-[var(--text-secondary)]">Spreadsheet ID</p>
              <p
                className="text-xs font-mono truncate"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {sheetId}
              </p>
            </div>
          )}

          {isAuthenticated ? (
            <button
              type="button"
              className="btn-danger w-full"
              onClick={handleDisconnect}
            >
              <LogOut size={16} />
              Disconnect Google Account
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? 'Connecting…' : 'Connect Google Account'}
            </button>
          )}
        </div>

        {/* Google Drive Setup Guide */}
        <p className="section-title">Google Drive Setup</p>
        <div className="card mb-4">
          <button
            type="button"
            className="w-full flex items-center justify-between text-sm font-semibold text-[var(--text-primary)]"
            onClick={() => setShowGuide(g => !g)}
          >
            <span>How to connect Google Drive</span>
            {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showGuide && (
            <div className="mt-3 space-y-3 text-sm text-[var(--text-secondary)]">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Open Google Cloud Console</p>
                  <p className="text-xs mt-0.5">Go to <span className="font-mono text-[var(--accent)]">console.cloud.google.com</span> and sign in with your Google account.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Create a Project</p>
                  <p className="text-xs mt-0.5">Click "Select a project" → "New Project". Name it "Manikkam Billing".</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Enable APIs</p>
                  <p className="text-xs mt-0.5">Go to "APIs &amp; Services" → "Enable APIs". Search and enable: <strong>Google Drive API</strong> and <strong>Google Sheets API</strong>.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Create OAuth Client ID</p>
                  <p className="text-xs mt-0.5">Go to "Credentials" → "Create Credentials" → "OAuth client ID". Choose <strong>Web application</strong>. Under "Authorized JavaScript origins" add your app URL (e.g., <span className="font-mono">http://localhost:5173</span> for local, or your deployed URL).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Copy Client ID below</p>
                  <p className="text-xs mt-0.5">Copy the Client ID (ends with <span className="font-mono">.apps.googleusercontent.com</span>) and paste it in the field below. Then click "Save Settings".</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">6</span>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Add Test User (important!)</p>
                  <p className="text-xs mt-0.5">In the OAuth consent screen → "Test users" → Add your email: <span className="font-semibold text-[var(--accent)]">manikkam9955@gmail.com</span>. Without this step, sign-in will fail.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">7</span>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Connect your account</p>
                  <p className="text-xs mt-0.5">Paste the Client ID below, click "Save Settings", then click "Connect Google Account" above. Sign in with <span className="font-semibold">manikkam9955@gmail.com</span>.</p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: '#FEF3C7', color: '#92400E' }}>
                <strong>⚠ "App not verified" warning:</strong> Click <strong>Advanced</strong> → <strong>Go to Manikkam Billing (unsafe)</strong>. This is normal for private apps — it is safe since you created it yourself.
              </div>
              <div className="mt-2 p-3 rounded-lg text-xs" style={{ background: '#D1FAE5', color: '#065F46' }}>
                <strong>✓ Once connected:</strong> All bills will auto-save to Google Drive under <em>Manikkam &amp; Co Billing → Year → Month → Customer Bills</em>. Purchase bills go to <em>Purchase Bills</em> folder.
              </div>
            </div>
          )}
        </div>

        {/* Google Client ID */}
        <p className="section-title">Developer Settings</p>
        <div className="card mb-4">
          <div className="input-group">
            <label className="input-label">Google Client ID</label>
            <input
              className="input-field"
              value={clientId}
              onChange={e => setClientIdState(e.target.value)}
              placeholder="xxx.apps.googleusercontent.com"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Or set <code>VITE_GOOGLE_CLIENT_ID</code> in your .env file
            </p>
          </div>
        </div>

        {/* Bill Number Reset */}
        <p className="section-title">Bill Number</p>
        <div className="card mb-6">
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Current format: <span className="font-mono font-semibold">MC/2026-27/0001</span>
          </p>
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              localStorage.removeItem('mc-local-seq');
              toast.success('Bill sequence reset');
            }}
          >
            <RefreshCw size={16} />
            Reset Local Bill Sequence
          </button>
        </div>

        {/* Save */}
        <button
          type="button"
          className="btn-primary w-full mb-6"
          onClick={handleSave}
          disabled={saved}
        >
          <Save size={18} />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
