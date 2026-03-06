import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { getHealth } from '../../services/api';

function ConnectionToast() {
  const [status, setStatus] = useState('connecting'); // connecting | connected | hidden
  const intervalRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      try {
        const health = await getHealth();
        if (mounted && health?.groq_connected) {
          setStatus('connected');
          clearInterval(intervalRef.current);
          setTimeout(() => {
            if (mounted) setStatus('hidden');
          }, 2500);
        }
      } catch {
        // Still connecting...
      }
    };

    checkConnection();
    intervalRef.current = setInterval(checkConnection, 2000);

    return () => {
      mounted = false;
      clearInterval(intervalRef.current);
    };
  }, []);

  if (status === 'hidden') return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        status === 'connected' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-slate-900 rounded-xl shadow-2xl px-5 py-4 flex items-center gap-3 max-w-xs border border-slate-700">
        {status === 'connecting' ? (
          <>
            <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Connecting to Groq</p>
              <p className="text-xs text-slate-400">AI engine warming up...</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Connected</p>
              <p className="text-xs text-slate-400">All systems operational</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <ConnectionToast />
      <Sidebar />
      <main className="md:ml-64 min-h-screen flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        <footer className="mt-auto py-6 text-center border-t border-white/5">
          <p className="text-xs text-slate-500 font-medium">
            Intelligent Supply Chain System • Made by <span className="font-bold text-slate-900 tracking-wide">SUBHAJIT BAGCHI</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
