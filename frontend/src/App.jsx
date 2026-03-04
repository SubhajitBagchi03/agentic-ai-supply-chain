import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import SuppliersPage from './pages/SuppliersPage';
import ShipmentsPage from './pages/ShipmentsPage';
import DocumentsPage from './pages/DocumentsPage';
import QueryPage from './pages/QueryPage';
import ReportsPage from './pages/ReportsPage';
import DecisionsPage from './pages/DecisionsPage';
import { resetSystem } from './services/api';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  // Because this is the root component, this useEffect runs exactly once 
  // whenever the user first opens the app or hits Browser Refresh (F5).
  useEffect(() => {
    let isMounted = true;

    // 1. Wipe local browser memory (Reports from sessionStorage, Chat from localStorage)
    sessionStorage.clear();
    localStorage.clear();

    // 2. Wipe the backend AI vectors and Pandas datasets
    // Wait for the backend for a maximum of 500ms before drawing the UI
    const resetPromise = resetSystem().catch(err => console.error("System reset failed:", err));
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 500));

    Promise.race([resetPromise, timeoutPromise]).finally(() => {
      if (isMounted) setIsInitializing(false);
    });

    return () => { isMounted = false; };
  }, []);

  // Block rendering briefly to prevent flashing, but fallback to dashboard quickly
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-foreground/20 border-t-foreground animate-spin mb-4" />
        <span className="text-sm text-muted-foreground font-medium">Starting up session...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/shipments" element={<ShipmentsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/decisions" element={<DecisionsPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
