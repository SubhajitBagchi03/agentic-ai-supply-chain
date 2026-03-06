import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { getHealth } from '../../services/api';

function ConnectionOverlay() {
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
          // Fade out after showing success briefly
          setTimeout(() => {
            if (mounted) setStatus('hidden');
          }, 1800);
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
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-700 ${
        status === 'connected' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(0, 0, 0, 0.45)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center transform transition-all duration-500">
        {status === 'connecting' ? (
          <>
            {/* Pulsing ring animation */}
            <div className="mx-auto mb-5 w-14 h-14 relative">
              <div className="absolute inset-0 rounded-full border-[3px] border-blue-200 animate-ping opacity-30" />
              <div className="absolute inset-0 rounded-full border-[3px] border-blue-500 border-t-transparent animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Establishing Secure Connection
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Connecting to the Groq inference engine...
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </>
        ) : (
          <>
            {/* Success checkmark */}
            <div className="mx-auto mb-5 w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Systems Online
            </h3>
            <p className="text-sm text-slate-500">
              All services connected. Ready to operate.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <ConnectionOverlay />
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
