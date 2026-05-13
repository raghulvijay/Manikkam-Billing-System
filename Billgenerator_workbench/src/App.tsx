import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShopProvider, useShop } from './context/ShopContext';
import { ProductMasterProvider } from './context/ProductMasterContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';

// Lazy-loaded pages
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const NewInvoice = lazy(() => import('./pages/NewInvoice').then(m => ({ default: m.NewInvoice })));
const UploadPurchase = lazy(() => import('./pages/UploadPurchase').then(m => ({ default: m.UploadPurchase })));
const UploadExisting = lazy(() => import('./pages/UploadExisting').then(m => ({ default: m.UploadExisting })));
const Auditor = lazy(() => import('./pages/Auditor').then(m => ({ default: m.Auditor })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const HsnMaster = lazy(() => import('./pages/HsnMaster').then(m => ({ default: m.HsnMaster })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const ViewInvoice = lazy(() => import('./pages/ViewInvoice').then(m => ({ default: m.ViewInvoice })));

const PageLoader = () => (
  <div className="page-container flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
  </div>
);

const ConnectPage: React.FC = () => {
  const { signIn } = useAuth();
  const { settings } = useShop();
  const [connecting, setConnecting] = useState(false);

  const handleSignIn = async () => {
    setConnecting(true);
    try {
      await signIn();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      if (!msg.includes('cancel') && !msg.includes('popup')) {
        console.error('Sign-in error:', msg);
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Logo/Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'var(--accent)' }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>

      {/* Shop name */}
      <h1
        className="text-3xl font-bold mb-2"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: 'var(--accent)',
        }}
      >
        {settings.shopName}
      </h1>

      {/* Tagline */}
      <p className="text-sm text-[var(--text-secondary)] mb-2 max-w-[280px] leading-relaxed">
        {settings.addressLine1}
      </p>
      <p className="text-xs text-[var(--text-secondary)] mb-8">
        GSTIN: {settings.gstin}
      </p>

      <div className="w-full max-w-[320px]">
        <div
          className="rounded-xl p-5 mb-6 text-center"
          style={{ background: 'var(--accent-light)' }}
        >
          <p
            className="text-base font-semibold mb-1"
            style={{ color: 'var(--accent)', fontFamily: "'Playfair Display', serif" }}
          >
            GST Billing System
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Connect Google Account to sync bills, manage invoices, and generate monthly GST reports.
          </p>
        </div>

        {/* Sign-in button */}
        <button
          onClick={handleSignIn}
          disabled={connecting}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl border border-[var(--border)] bg-white font-semibold text-[var(--text-primary)] text-sm shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-60"
          style={{ minHeight: 52 }}
        >
          {!connecting && (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {connecting ? 'Connecting…' : 'Sign in with Google'}
        </button>

        <p className="text-xs text-center text-[var(--text-secondary)] mt-4">
          Requires Google Drive &amp; Sheets access
        </p>
      </div>
    </div>
  );
};

// Pages with their own header/layout (full screen)
const FULL_SCREEN_ROUTES = ['/invoice/', '/upload/', '/settings', '/auditor'];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const isFullScreen = FULL_SCREEN_ROUTES.some(r => pathname.startsWith(r));

  if (isFullScreen) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <BottomNav />
    </>
  );
};

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-page">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <ConnectPage />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/invoice/new" element={<NewInvoice />} />
            <Route path="/invoice/edit/:id" element={<NewInvoice />} />
            <Route path="/invoice/:id" element={<ViewInvoice />} />
            <Route path="/upload/purchase" element={<UploadPurchase />} />
            <Route path="/upload/existing" element={<UploadExisting />} />
            <Route path="/auditor" element={<Auditor />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/hsn" element={<HsnMaster />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/search" element={<Search />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2800,
          style: {
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            borderRadius: 10,
            maxWidth: 400,
          },
          success: {
            style: { background: 'var(--accent)', color: '#fff' },
            iconTheme: { primary: '#fff', secondary: 'var(--accent)' },
          },
          error: {
            style: { background: '#dc2626', color: '#fff' },
            iconTheme: { primary: '#fff', secondary: '#dc2626' },
          },
        }}
      />
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ShopProvider>
        <ProductMasterProvider>
          <AppRoutes />
        </ProductMasterProvider>
      </ShopProvider>
    </AuthProvider>
  );
};

export default App;
