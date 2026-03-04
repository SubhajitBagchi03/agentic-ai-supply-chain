import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Truck, Users, FileText,
  MessageSquare, BarChart3, X, Brain
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/suppliers', icon: Users, label: 'Suppliers' },
  { to: '/shipments', icon: Truck, label: 'Shipments' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/query', icon: MessageSquare, label: 'AI Query' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/decisions', icon: Brain, label: 'Decisions' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Listen for custom event from Header to open/close sidebar on mobile
  useEffect(() => {
    const handler = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleSidebar', handler);
    return () => window.removeEventListener('toggleSidebar', handler);
  }, []);

  // Close sidebar on mobile when navigating to a new route
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`fixed left-0 top-0 h-screen w-64 flex flex-col z-50 bg-sidebar sm:rounded-r-2xl border-r border-black/5 md:border-transparent transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-3 pb-6 pt-3 md:pt-2">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-11 h-11 object-contain" />
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight leading-tight">Supply Chain</h1>
              <p className="text-sm text-muted-foreground">Control Tower</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button 
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-black/5 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-foreground text-white font-medium shadow-md'
                    : 'text-muted-foreground hover:bg-white/60 hover:text-foreground hover:shadow-sm border border-transparent hover:border-black/5'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 pt-4 pb-6 md:pb-4 border-t border-black/5 md:border-transparent">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
            <span className="text-xs text-muted-foreground">System Active</span>
          </div>
        </div>
      </aside>
    </>
  );
}
