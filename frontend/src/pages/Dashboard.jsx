import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { getHealth, getAlerts } from '../services/api';
import {
  Package, Users, Truck, FileText, AlertTriangle,
  TrendingUp, Activity, Shield, ArrowUpRight,
  Bell, CheckCircle
} from 'lucide-react';

const ALERT_ICONS = {
  low_stock: Package,
  shipment_delay: Truck,
  risk: Shield,
  system: AlertTriangle,
};

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500', border: 'border-red-100' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', border: 'border-amber-100' },
  info: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', border: 'border-blue-100' },
};

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const handleActionClick = (alert) => {
    const prompt = `Analyze this alert and recommend specific actions:\n\n**${alert.title}**\n${alert.message}`;
    navigate('/query', { state: { initialQuery: prompt } });
  };

  // Fetch health
  useEffect(() => {
    getHealth().then(setHealth).catch(() => {});
  }, []);

  // Poll alerts every 15 seconds
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getAlerts(false, 10);
        setAlerts(data.alerts || []);
      } catch {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const datasets = health?.datasets_loaded || {};

  const statCards = [
    {
      title: 'Inventory',
      icon: Package,
      loaded: datasets.inventory?.loaded,
      rows: datasets.inventory?.rows || 0,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Suppliers',
      icon: Users,
      loaded: datasets.supplier?.loaded,
      rows: datasets.supplier?.rows || 0,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Shipments',
      icon: Truck,
      loaded: datasets.shipment?.loaded,
      rows: datasets.shipment?.rows || 0,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      title: 'Documents',
      icon: FileText,
      value: health?.documents_indexed || 0,
      label: 'indexed',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  const unreadAlerts = alerts.filter(a => !a.read);
  const recentAlerts = alerts.slice(0, 8);

  return (
    <>
      <Header title="Dashboard" subtitle="Supply Chain Control Tower Overview" />
      <div className="p-6 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.title}
              className="glass rounded-xl p-5 transition-all duration-300 group animate-slide-up"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {card.value !== undefined ? card.value : card.rows}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {card.title} {card.label || (card.loaded ? '• Active' : '• Not loaded')}
              </p>
              {card.loaded !== undefined && (
                <div className={`mt-3 h-1 rounded-full ${card.loaded ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <div className={`h-full rounded-full transition-all duration-700 ${card.loaded ? 'bg-emerald-500 w-full' : 'w-0'}`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Live Alerts Section */}
        <div className="glass rounded-xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-5 h-5 text-blue-600" />
                {unreadAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-slow" />
                )}
              </div>
              <h3 className="font-semibold text-foreground">Live Alerts</h3>
              {unreadAlerts.length > 0 && (
                <span className="text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                  {unreadAlerts.length} new
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">Auto-refreshing every 15s</span>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-foreground">No active alerts</p>
                <p className="text-xs text-muted-foreground">System is healthy — monitoring is running</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[230px] overflow-y-auto pr-1 pb-1" style={{ scrollbarWidth: 'thin' }}>
              {recentAlerts.map((alert) => {
                const Icon = ALERT_ICONS[alert.alert_type] || AlertTriangle;
                const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.info;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      !alert.read
                        ? `${colors.bg} ${colors.border}`
                        : 'bg-white/50 border-black/3'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${colors.bg} ${colors.text}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${!alert.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {alert.title}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${colors.text} ${colors.bg}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(alert.timestamp)} • {alert.source}</p>
                    </div>
                    <button
                      onClick={() => handleActionClick(alert)}
                      className="px-2.5 py-1.5 ml-2 text-xs font-medium bg-white/50 hover:bg-white border hover:border-blue-200 text-blue-700 rounded-lg transition-colors shadow-sm shrink-0"
                    >
                      Action
                    </button>
                    {!alert.read && (
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-2 ml-2 ${colors.dot} animate-pulse-slow`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* System Health */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-foreground">System Health</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Groq API</span>
                <span className={`flex items-center gap-1.5 ${health?.groq_connected ? 'text-emerald-600' : 'text-red-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${health?.groq_connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {health?.groq_connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">API Status</span>
                <span className={`flex items-center gap-1.5 ${health ? 'text-emerald-600' : 'text-red-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {health ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monitor</span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
                  Active (30s loop)
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span className="text-foreground font-medium">{health?.version || '-'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-foreground">Quick Actions</h3>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Run Inventory Analysis', href: '/query' },
                { label: 'Evaluate Suppliers', href: '/query' },
                { label: 'Check Shipment Status', href: '/query' },
                { label: 'Generate Report', href: '/reports' },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
                >
                  {action.label}
                </a>
              ))}
            </div>
          </div>

          {/* Risk Overview */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">Risk Overview</h3>
            </div>
            <div className="space-y-3 text-sm">
              {alerts.filter(a => a.alert_type === 'risk').length > 0 ? (
                alerts.filter(a => a.alert_type === 'risk').slice(0, 3).map(alert => (
                  <div key={alert.id} className="flex items-start gap-2 text-amber-600">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="text-sm">{alert.title}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">
                  {health ? 'Upload datasets to enable risk monitoring.' : 'Connect to backend to view risks.'}
                </p>
              )}
              {!health && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Backend not connected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
