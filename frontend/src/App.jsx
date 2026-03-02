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
import { resetSystem } from './services/api';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  // Because this is the root component, this useEffect runs exactly once 
  // whenever the user first opens the app or hits Browser Refresh (F5).
  useEffect(() => {
    // 1. Wipe local browser memory (Reports from sessionStorage, Chat from localStorage)
    sessionStorage.clear();
    localStorage.clear();

    // 2. Wipe the backend AI vectors and Pandas datasets
    // Wait for the backend to finish wiping BEFORE drawing the UI
    resetSystem()
      .then(() => setIsInitializing(false))
      .catch(err => {
        console.error("System reset failed:", err);
        setIsInitializing(false);
      });
  }, []);

  // Block rendering until the backend wipe is complete to prevent data-flashing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-sm text-muted-foreground animate-pulse">
        Initializing clean session...
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
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
