import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { getHealth, getAlerts, getDashboardAnalytics } from '../services/api';
import {
  Package, Users, Truck, FileText, AlertTriangle,
  TrendingUp, TrendingDown, Activity, Shield, ArrowUpRight,
  Bell, CheckCircle, Check, BarChart3, Target, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

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

/* Custom Tooltip for Recharts */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-black/5 px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const handleActionClick = (alert) => {
    const prompt = `Analyze this alert and recommend specific actions:\n\n**${alert.title}**\n${alert.message}`;
    navigate('/query', { state: { initialQuery: prompt } });
  };

  // Fetch health
  useEffect(() => {
    getHealth().then(setHealth).catch(() => {});
  }, []);

  // Fetch analytics
  useEffect(() => {
    getDashboardAnalytics().then(setAnalytics).catch(() => {});
    const interval = setInterval(() => {
      getDashboardAnalytics().then(setAnalytics).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
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
  const kpis = analytics?.kpis || {};
  const charts = analytics?.charts || {};

  const kpiCards = [
    {
      title: 'Fill Rate',
      value: kpis.fill_rate ? `${kpis.fill_rate}%` : '—',
      subtitle: `${kpis.total_skus || 0} SKUs tracked`,
      icon: Target,
      trend: kpis.fill_rate >= 90 ? 'up' : kpis.fill_rate > 0 ? 'down' : null,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Stockout Risk',
      value: kpis.stockout_risk ? `${kpis.stockout_risk}%` : '—',
      subtitle: `${kpis.low_stock_count || 0} items below safety`,
      icon: AlertTriangle,
      trend: kpis.stockout_risk > 20 ? 'down' : kpis.stockout_risk > 0 ? 'up' : null,
      iconBg: kpis.stockout_risk > 20 ? 'bg-red-50' : 'bg-amber-50',
      iconColor: kpis.stockout_risk > 20 ? 'text-red-600' : 'text-amber-600',
    },
    {
      title: 'Days of Supply',
      value: kpis.days_of_supply ? `${kpis.days_of_supply}d` : '—',
      subtitle: 'Avg across all SKUs',
      icon: Clock,
      trend: kpis.days_of_supply >= 14 ? 'up' : kpis.days_of_supply > 0 ? 'down' : null,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'On-Time Rate',
      value: kpis.avg_on_time_rate ? `${kpis.avg_on_time_rate}%` : '—',
      subtitle: `${kpis.total_suppliers || 0} suppliers evaluated`,
      icon: Truck,
      trend: kpis.avg_on_time_rate >= 90 ? 'up' : kpis.avg_on_time_rate > 0 ? 'down' : null,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
  ];

  const unreadAlerts = alerts.filter(a => !a.read);
  const recentAlerts = alerts.slice(0, 8);
  const hasInventoryChart = charts.inventory_health?.length > 0;
  const hasRiskChart = charts.risk_distribution?.some(d => d.value > 0);
  const hasSupplierChart = charts.supplier_comparison?.length > 0;

  return (
    <>
      <Header title="Dashboard" subtitle="Supply Chain Control Tower Overview" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {kpiCards.map((card) => (
            <div
              key={card.title}
              className="glass rounded-xl p-4 md:p-5 transition-all duration-300 group animate-slide-up"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${card.iconBg}`}>
                  <card.icon className={`w-4 h-4 md:w-5 md:h-5 ${card.iconColor}`} />
                </div>
                {card.trend && (
                  <div className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    card.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {card.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  </div>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground">
                {card.value}
              </h3>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 truncate">
                {card.subtitle}
              </p>
            </div>
          ))}
        </div>

        {/* ── Dataset Status Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { title: 'Inventory', icon: Package, loaded: datasets.inventory?.loaded, rows: datasets.inventory?.rows || 0, bg: 'bg-blue-50', color: 'text-blue-600' },
            { title: 'Suppliers', icon: Users, loaded: datasets.supplier?.loaded, rows: datasets.supplier?.rows || 0, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { title: 'Shipments', icon: Truck, loaded: datasets.shipment?.loaded, rows: datasets.shipment?.rows || 0, bg: 'bg-violet-50', color: 'text-violet-600' },
            { title: 'Documents', icon: FileText, val: health?.documents_indexed || 0, bg: 'bg-amber-50', color: 'text-amber-600' },
          ].map((d) => (
            <div key={d.title} className="glass rounded-xl p-3 md:p-4 flex items-center gap-3 animate-slide-up">
              <div className={`p-2 rounded-lg ${d.bg} shrink-0`}>
                <d.icon className={`w-4 h-4 ${d.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">{d.val !== undefined ? d.val : d.rows}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {d.title} {d.val !== undefined ? 'indexed' : (d.loaded ? '• Active' : '• Not loaded')}
                </p>
              </div>
              {d.loaded !== undefined && (
                <div className={`ml-auto w-2 h-2 rounded-full shrink-0 ${d.loaded ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Charts Row ── */}
        {(hasInventoryChart || hasRiskChart || hasSupplierChart) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Inventory Health Chart */}
            {hasInventoryChart && (
              <div className="glass rounded-xl p-5 animate-slide-up lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-foreground">Inventory Health</h3>
                  <span className="text-[10px] text-muted-foreground ml-auto">On-Hand vs Safety Stock</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={charts.inventory_health} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="on_hand" name="On Hand" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="safety_stock" name="Safety Stock" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Risk Distribution Donut */}
            {hasRiskChart && (
              <div className="glass rounded-xl p-5 animate-slide-up">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-foreground">Risk Distribution</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={charts.risk_distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {charts.risk_distribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── Supplier Comparison Chart ── */}
        {hasSupplierChart && (
          <div className="glass rounded-xl p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-foreground">Supplier Comparison</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">On-Time % / Quality % / Cost Index</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.supplier_comparison} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="on_time" name="On-Time %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quality" name="Quality %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Live Alerts Section ── */}
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

        {/* ── Bottom Row: System Health + Quick Actions ── */}
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
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <Check className="w-4 h-4" />
                  <span>No active risks detected</span>
                </div>
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
