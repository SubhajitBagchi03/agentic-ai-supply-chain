import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, AlertTriangle, Package, Truck, Shield, Check, X,
  LayoutDashboard, Users, FileText, MessageSquare, BarChart3 } from 'lucide-react';
import { getAlerts, getUnreadCount, markAlertRead, markAllAlertsRead } from '../../services/api';

const ALERT_ICONS = {
  low_stock: Package,
  shipment_delay: Truck,
  risk: Shield,
  system: AlertTriangle,
};

const SEVERITY_STYLES = {
  critical: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-blue-50 text-blue-600',
};

const SEARCH_ITEMS = [
  { label: 'Dashboard', description: 'Overview & live alerts', path: '/', icon: LayoutDashboard },
  { label: 'Inventory', description: 'Stock levels & reorder points', path: '/inventory', icon: Package },
  { label: 'Suppliers', description: 'Vendor performance & ratings', path: '/suppliers', icon: Users },
  { label: 'Shipments', description: 'Logistics & delivery tracking', path: '/shipments', icon: Truck },
  { label: 'Documents', description: 'Demand data & knowledge base', path: '/documents', icon: FileText },
  { label: 'AI Query', description: 'Ask questions about your data', path: '/query', icon: MessageSquare },
  { label: 'Reports', description: 'Generate intelligence reports', path: '/reports', icon: BarChart3 },
  // Quick actions
  { label: 'Check low stock items', description: 'AI Query → Inventory', path: '/query', icon: Package, query: 'Which items are below safety stock?' },
  { label: 'Delayed shipments', description: 'AI Query → Shipments', path: '/query', icon: Truck, query: 'Show me all delayed shipments' },
  { label: 'Supplier risk analysis', description: 'AI Query → Risk', path: '/query', icon: Shield, query: 'Which suppliers have the highest risk scores?' },
  { label: 'Demand forecast', description: 'AI Query → Demand', path: '/query', icon: BarChart3, query: 'What are the top selling products this month?' },
  { label: 'Generate report', description: 'Full supply chain analysis', path: '/reports', icon: BarChart3 },
];

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Header({ title, subtitle }) {
  const navigate = useNavigate();

  // Notification state
  const [unreadCount, setUnreadCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Poll unread count every 15 seconds
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await getUnreadCount();
        setUnreadCount(data.count);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch full alerts when panel opens
  useEffect(() => {
    if (showPanel) {
      (async () => {
        try {
          const data = await getAlerts(false, 20);
          setAlerts(data.alerts || []);
          setUnreadCount(data.unread_count || 0);
        } catch {}
      })();
    }
  }, [showPanel]);

  // Close panels on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) { setShowSearch(false); setSearchQuery(''); }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut: Ctrl+K to open search
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Filter search results
  const filteredResults = searchQuery.trim()
    ? SEARCH_ITEMS.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_ITEMS.slice(0, 7); // Show pages by default

  // Reset selection when results change
  useEffect(() => { setSelectedIndex(0); }, [searchQuery]);

  // Handle search keyboard navigation
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      handleSelectResult(filteredResults[selectedIndex]);
    }
  };

  const handleSelectResult = (item) => {
    setShowSearch(false);
    setSearchQuery('');
    navigate(item.path);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsRead();
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDismiss = async (alertId) => {
    try {
      await markAlertRead(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  return (
    <header className="sticky top-0 z-40 py-3 px-6 bg-background">
      <div className="flex items-center justify-between">
        <div className="min-w-0 mr-4">
          <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => { setShowSearch(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white/60 backdrop-blur-sm border border-black/5 rounded-full text-muted-foreground hover:bg-white hover:shadow-sm transition-all cursor-text"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 rounded text-muted-foreground/70 ml-4">
                Ctrl K
              </kbd>
            </button>

            {/* Search dropdown */}
            {showSearch && (
              <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden animate-fade-in z-50">
                <div className="p-3 border-b border-black/5">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search pages, actions..."
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                      autoFocus
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto py-1">
                  {filteredResults.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">No results found</div>
                  ) : (
                    <>
                      <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                        {searchQuery ? 'Results' : 'Pages'}
                      </p>
                      {filteredResults.map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={`${item.path}-${item.label}`}
                            onClick={() => handleSelectResult(item)}
                            onMouseEnter={() => setSelectedIndex(i)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                              i === selectedIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{item.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            </div>
                            {i === selectedIndex && (
                              <span className="text-[10px] text-muted-foreground/50">↵</span>
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>

                <div className="px-4 py-2 border-t border-black/5 flex items-center gap-3 text-[10px] text-muted-foreground/50">
                  <span>↑↓ navigate</span>
                  <span>↵ select</span>
                  <span>esc close</span>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="relative p-2.5 rounded-full bg-white/60 backdrop-blur-sm border border-black/5 text-muted-foreground hover:text-foreground hover:bg-white hover:shadow-sm transition-all"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showPanel && (
              <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden animate-fade-in z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium transition">
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowPanel(false)} className="p-1 rounded-full hover:bg-gray-100 text-muted-foreground transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Alerts appear when monitoring detects issues</p>
                    </div>
                  ) : (
                    alerts.map((alert) => {
                      const Icon = ALERT_ICONS[alert.alert_type] || AlertTriangle;
                      const severityStyle = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
                      return (
                        <div
                          key={alert.id}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-black/3 hover:bg-gray-50 transition group ${
                            !alert.read ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${severityStyle}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-tight ${!alert.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                              {alert.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.message}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(alert.timestamp)}</p>
                          </div>
                          {!alert.read && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDismiss(alert.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 text-muted-foreground transition shrink-0"
                              title="Dismiss"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
