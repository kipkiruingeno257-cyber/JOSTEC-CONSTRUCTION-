import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SeoHead } from './components/SeoHead';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';
import { ADMIN_CONSOLE_PATH } from './lib/adminPath';
import { AdminPage } from './pages/AdminPage';
import { HomePage } from './pages/HomePage';

function isAdminPathname(pathname: string): boolean {
  return (
    pathname === ADMIN_CONSOLE_PATH ||
    pathname.startsWith(`${ADMIN_CONSOLE_PATH}/`) ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  );
}

function AdminAutoLogoutGuard() {
  const location = useLocation();
  const { authReady, localSessionReady, user, localAuthenticated, signOutAdmin } = useFirebase();

  useEffect(() => {
    if (!authReady || !localSessionReady) return;
    if (!isAdminPathname(location.pathname) && (user || localAuthenticated)) {
      void signOutAdmin();
    }
  }, [location.pathname, authReady, localSessionReady, user, localAuthenticated, signOutAdmin]);

  return null;
}

function RouteSeoController() {
  const location = useLocation();
  return <SeoHead pathname={location.pathname} noindex={isAdminPathname(location.pathname)} />;
}

export default function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  // Enforce HTTPS in production environments while preserving localhost HTTP dev workflows
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { protocol, hostname, href } = window.location;
    const isLocalHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local');
    if (protocol === 'http:' && !isLocalHost && href.startsWith('http://')) {
      window.location.replace(`https://${href.slice(7)}`);
    }
  }, []);

  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  return (
    <ErrorBoundary>
      <FirebaseProvider>
        {mapsQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}
        <BrowserRouter>
          <RouteSeoController />
          <AdminAutoLogoutGuard />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<HomePage initialSection="about" />} />
            <Route path="/services" element={<HomePage initialSection="services" />} />
            <Route path="/projects" element={<HomePage initialSection="projects" />} />
            <Route path="/reviews" element={<HomePage initialSection="testimonials" />} />
            <Route path="/contact" element={<HomePage initialSection="contact" />} />
            <Route path={ADMIN_CONSOLE_PATH} element={<AdminPage />} />
            <Route path={`${ADMIN_CONSOLE_PATH}/*`} element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
