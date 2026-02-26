import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Truck, Users, FileText,
  MessageSquare, BarChart3
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/suppliers', icon: Users, label: 'Suppliers' },
  { to: '/shipments', icon: Truck, label: 'Shipments' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/query', icon: MessageSquare, label: 'AI Query' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50 bg-sidebar rounded-r-2xl">
      {/* Logo */}
      <div className="px-3 pb-6 pt-2">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-11 h-11 object-contain" />
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight leading-tight">Supply Chain</h1>
            <p className="text-sm text-muted-foreground">Control Tower</p>
          </div>
        </div>
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
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
          <span className="text-xs text-muted-foreground">System Active</span>
        </div>
      </div>
    </aside>
  );
}
