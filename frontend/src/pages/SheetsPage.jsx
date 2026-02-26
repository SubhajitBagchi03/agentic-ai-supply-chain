import { useState, useEffect, useCallback } from 'react';
import Header from '../components/layout/Header';
import { connectSheet, getSheetStatus, refreshSheets, uploadInventory, uploadSupplier, uploadShipment, uploadDemand } from '../services/api';
import {
  Link2, CheckCircle, AlertTriangle, Loader2, RefreshCw,
  Package, Users, Truck, TrendingUp, ExternalLink, Upload, FileText, Lightbulb
} from 'lucide-react';

const DATASETS = [
  {
    type: 'inventory',
    label: 'Inventory',
    icon: Package,
    placeholder: 'https://docs.google.com/spreadsheets/d/...  (Inventory tab)',
    description: 'Columns: sku, name, warehouse, on_hand, safety_stock, lead_time_days, avg_daily_demand, supplier_id',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    uploadFn: uploadInventory,
  },
  {
    type: 'supplier',
    label: 'Suppliers',
    icon: Users,
    placeholder: 'https://docs.google.com/spreadsheets/d/...  (Suppliers tab)',
    description: 'Columns: supplier_id, name, cost_index, lead_time, on_time_rate, quality_score, risk_score',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    uploadFn: uploadSupplier,
  },
  {
    type: 'shipment',
    label: 'Shipments',
    icon: Truck,
    placeholder: 'https://docs.google.com/spreadsheets/d/...  (Shipments tab)',
    description: 'Columns: shipment_id, sku, origin, destination, status, planned_date, carrier',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    uploadFn: uploadShipment,
  },
  {
    type: 'demand',
    label: 'Demand',
    icon: TrendingUp,
    placeholder: 'https://docs.google.com/spreadsheets/d/...  (Demand tab)',
    description: 'Columns: sku, date, quantity_sold, region, channel',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    uploadFn: uploadDemand,
  },
];

function DatasetCard({ ds, statuses, setStatuses }) {
  const [url, setUrl] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetResult, setSheetResult] = useState(null);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const isConnected = !!statuses[ds.type];
  const Icon = ds.icon;

  // Sheet connect
  const handleConnect = async () => {
    if (!url.trim()) return;
    setSheetLoading(true);
    setSheetResult(null);
    try {
      const res = await connectSheet(url, ds.type);
      setSheetResult({ success: true, ...res });
      setStatuses(prev => ({ ...prev, [ds.type]: { url, active: true } }));
    } catch (err) {
      setSheetResult({ success: false, error: err.message });
    } finally {
      setSheetLoading(false);
    }
  };

  // CSV drag & drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile?.name.endsWith('.csv')) {
      setFile(droppedFile);
      setUploadError(null);
    } else {
      setUploadError('Only CSV files are accepted');
    }
  }, []);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) { setFile(selected); setUploadError(null); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await ds.uploadFn(file);
      setUploadResult(res);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass rounded-xl p-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${ds.bg}`}>
          <Icon className={`w-4 h-4 ${ds.color}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground text-sm">{ds.label}</h4>
          <p className="text-xs text-muted-foreground">{ds.description}</p>
        </div>
        {isConnected && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
            Live
          </span>
        )}
      </div>

      {/* Method 1: Google Sheet URL */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <Link2 className="w-3 h-3" /> Option 1 — Google Sheet URL (live, auto-refreshes)
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={ds.placeholder}
            className="flex-1 px-4 py-2.5 text-sm bg-white/60 border border-black/5 rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-white focus:border-black/10 focus:shadow-sm transition-all"
          />
          <button
            onClick={handleConnect}
            disabled={sheetLoading || !url.trim()}
            className="px-5 py-2.5 bg-foreground text-white rounded-full text-sm font-medium transition-all hover:bg-foreground/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            {sheetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {isConnected ? 'Reconnect' : 'Connect'}
          </button>
        </div>
        {sheetResult && (
          <div className={`mt-2 flex items-center gap-2 text-xs animate-fade-in ${sheetResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
            {sheetResult.success ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{sheetResult.success ? sheetResult.message : sheetResult.error}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-black/5" />
        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-black/5" />
      </div>

      {/* Method 2: CSV File Upload */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <Upload className="w-3 h-3" /> Option 2 — Upload CSV file (one-time)
        </p>

        {uploadResult ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">{uploadResult.message}</span>
            </div>
            <button onClick={() => { setUploadResult(null); setFile(null); }} className="text-xs text-muted-foreground hover:text-foreground mt-1.5 transition">
              Upload another file
            </button>
          </div>
        ) : (
          <>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById(`csv-${ds.type}`).click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                dragActive ? 'border-blue-400 bg-blue-50/50' : 'border-black/8 hover:border-black/15'
              }`}
            >
              <input id={`csv-${ds.type}`} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              {file ? (
                <span className="flex items-center justify-center gap-2 text-sm text-foreground">
                  <FileText className="w-4 h-4 text-blue-600" />
                  {file.name}
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </span>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Drop CSV here or <span className="text-blue-600 font-medium">browse</span>
                </p>
              )}
            </div>

            {uploadError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-600 animate-fade-in">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {file && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="mt-3 w-full py-2.5 bg-foreground text-white rounded-full text-sm font-medium transition-all hover:bg-foreground/80 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload {ds.label} CSV</>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SheetsPage() {
  const [statuses, setStatuses] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getSheetStatus()
      .then(data => setStatuses(data.connected || {}))
      .catch(() => {});
  }, []);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try { await refreshSheets(); } catch {}
    setRefreshing(false);
  };

  const connectedCount = Object.keys(statuses).length;

  return (
    <>
      <Header title="Data Sources" subtitle="Connect Google Sheets or upload CSV files for real-time monitoring" />
      <div className="p-6 max-w-4xl mx-auto space-y-5">

        {/* Tutorial / How-it-works Card */}
        <div className="glass rounded-xl p-5 animate-slide-up">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-50">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground">How It Works</h3>
              <div className="text-sm text-muted-foreground mt-1.5 space-y-1.5 leading-relaxed">
                <p>
                  <strong>Google Sheets (recommended):</strong> Paste a public sheet URL → system auto-refreshes every 30 seconds → agents detect changes in real-time. Edit stock levels, add shipment delays, or change supplier ratings — alerts will appear automatically.
                </p>
                <p>
                  <strong>CSV Upload:</strong> Upload a one-time CSV file for each dataset type. Great for initial data loading or quick testing.
                </p>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <a
                  href="https://support.google.com/docs/answer/183965"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition"
                >
                  <ExternalLink className="w-3 h-3" />
                  How to make a sheet public
                </a>
                {connectedCount > 0 && (
                  <button
                    onClick={handleRefreshAll}
                    disabled={refreshing}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh all now
                  </button>
                )}
              </div>
            </div>
            {connectedCount > 0 && (
              <span className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full shrink-0">
                {connectedCount}/4 connected
              </span>
            )}
          </div>
        </div>

        {/* Dataset Cards */}
        {DATASETS.map((ds) => (
          <DatasetCard key={ds.type} ds={ds} statuses={statuses} setStatuses={setStatuses} />
        ))}
      </div>
    </>
  );
}
