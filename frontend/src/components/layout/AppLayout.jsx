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
          <p className="text-xs text-muted-foreground/60">
            Intelligent Supply Chain System • Engineered by <span className="font-medium text-foreground/70 tracking-wide">SUBHAJIT BAGCHI</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
