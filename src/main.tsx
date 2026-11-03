import React, { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AdminApp } from './admin/AdminApp.tsx';
import { BOOTSTRAPPED_SUPER_ADMIN_EMAIL, setStoredBackendAdminToken } from './admin/adminService.ts';
import { auth } from './firebase/config.ts';
import { SyncProvider } from './context/SyncContext.tsx';
import './index.css';

const ALLOWED_ADMIN_EMAIL = BOOTSTRAPPED_SUPER_ADMIN_EMAIL; // 'nafiulislam3810@gmail.com'

const RootRouter: React.FC = () => {
  // Strictly start in the main WAQTO application on startup/reload (never auto-load AdminApp)
  const [isAdminView, setIsAdminView] = useState<boolean>(false);

  useEffect(() => {
    // Strip any #admin hash or /admin pathname on startup so the app never auto-loads the admin panel
    if (
      typeof window !== 'undefined' &&
      (window.location.hash.toLowerCase().includes('admin') ||
        window.location.pathname.toLowerCase().startsWith('/admin'))
    ) {
      try {
        window.history.replaceState({ waqtoNav: true, tab: 'home', moreSection: null, surahNumber: null, depth: 1 }, '', '/');
      } catch {}
    }
    setIsAdminView(false);

    // Admin panel is ONLY accessible through the specific hidden keyboard shortcut (Ctrl+Shift+A / Alt+Shift+A)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isShortcut = (e.ctrlKey || e.altKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a';
      if (!isShortcut) return;

      e.preventDefault();

      // If a Firebase user is signed in with a non-authorized email, purge any admin token before opening the gate
      const currentEmail = auth.currentUser?.email?.trim().toLowerCase();
      if (currentEmail && currentEmail !== ALLOWED_ADMIN_EMAIL) {
        setStoredBackendAdminToken(null);
      }

      setIsAdminView((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleExitAdmin = () => {
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState({ waqtoNav: true, tab: 'home', moreSection: null, surahNumber: null, depth: 1 }, '', '/');
      } catch {}
    }
    setIsAdminView(false);
  };

  if (isAdminView) {
    return <AdminApp onExitAdmin={handleExitAdmin} />;
  }

  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SyncProvider>
      <RootRouter />
    </SyncProvider>
  </StrictMode>
);
