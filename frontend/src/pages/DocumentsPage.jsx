import { useState, useCallback } from 'react';
import Header from '../components/layout/Header';
import DocumentUploader from '../components/upload/DocumentUploader';
import { uploadDemand, uploadDocument, connectSheet } from '../services/api';
import {
  Lightbulb, Link2, Upload, CheckCircle, AlertTriangle,
  Loader2, FileText
} from 'lucide-react';

export default function DocumentsPage() {
  const [url, setUrl] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetResult, setSheetResult] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const handleConnect = async () => {
    if (!url.trim()) return;
    setSheetLoading(true);
    setSheetResult(null);
    try {
      const res = await connectSheet(url, 'demand');
      setSheetResult({ success: true, ...res });
      setIsConnected(true);
    } catch (err) {
      setSheetResult({ success: false, error: err.message });
    } finally {
      setSheetLoading(false);
    }
  };

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
    const f = e.dataTransfer.files?.[0];
    if (f?.name.endsWith('.csv')) { setFile(f); setUploadError(null); }
    else setUploadError('Only CSV files are accepted');
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await uploadDemand(file);
      setUploadResult(res);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Header title="Data & Documents" subtitle="Manage demand data and knowledge base documents" />
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <div className="glass rounded-xl p-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 shrink-0">
              <Lightbulb className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Tip:</strong> Connect a Google Sheet for live demand data (auto-refreshes every 30s). Upload PDFs below to build the AI knowledge base.
            </div>
          </div>
        </div>

        {/* Demand Data Card */}
        <div className="glass rounded-xl p-6 space-y-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Demand / Sales Data</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Required: sku, date, quantity. Optional: channel, region
              </p>
            </div>
            {isConnected && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" /> Live
              </span>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Link2 className="w-3.5 h-3.5" /> Option 1 — Google Sheet URL (live, auto-refreshes)
            </p>
            <div className="flex gap-2">
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-4 py-3 text-sm bg-white/60 border border-black/5 rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-white focus:border-black/10 focus:shadow-sm transition-all" />
              <button onClick={handleConnect} disabled={sheetLoading || !url.trim()}
                className="px-6 py-3 bg-foreground text-white rounded-full text-sm font-medium transition-all hover:bg-foreground/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shrink-0">
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

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-black/5" />
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-black/5" />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Upload className="w-3.5 h-3.5" /> Option 2 — Upload CSV file (one-time)
            </p>
            {uploadResult ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /><span>{uploadResult.message}</span>
                </div>
                <button onClick={() => { setUploadResult(null); setFile(null); }} className="text-xs text-muted-foreground hover:text-foreground mt-2 transition">Upload another</button>
              </div>
            ) : (
              <>
                <div
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => document.getElementById('csv-demand').click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${dragActive ? 'border-amber-400 bg-amber-50/50' : 'border-black/8 hover:border-black/15'}`}>
                  <input id="csv-demand" type="file" accept=".csv" onChange={(e) => { setFile(e.target.files?.[0] || null); setUploadError(null); }} className="hidden" />
                  {file ? (
                    <span className="flex items-center justify-center gap-2 text-sm text-foreground">
                      <FileText className="w-5 h-5 text-amber-600" /> {file.name} <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                    </span>
                  ) : (
                    <><Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Drag & drop CSV file or <span className="text-amber-600 font-medium">browse</span></p></>
                  )}
                </div>
                {uploadError && <div className="mt-2 flex items-center gap-2 text-xs text-red-600 animate-fade-in"><AlertTriangle className="w-3.5 h-3.5" /><span>{uploadError}</span></div>}
                {file && (
                  <button onClick={handleUpload} disabled={uploading}
                    className="mt-3 w-full py-3 bg-foreground text-white rounded-full text-sm font-medium transition-all hover:bg-foreground/80 disabled:opacity-50 flex items-center justify-center gap-2">
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Demand CSV</>}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Document Upload (separate) */}
        <DocumentUploader onUpload={uploadDocument} />
      </div>
    </>
  );
}
