import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
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
