import { useState, useCallback } from 'react';
import { Upload, CheckCircle, AlertTriangle, X, FileText } from 'lucide-react';

export default function DataUploader({ title, description, datasetType, onUpload }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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
    if (droppedFile?.name.endsWith('.csv')) setFile(droppedFile);
    else setError('Only CSV files are accepted');
  }, []);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !onUpload) return;
    setUploading(true);
    setError(null);
    try {
      const res = await onUpload(file);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="glass rounded-xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        {result && (
          <button onClick={reset} className="p-1 text-muted-foreground hover:text-foreground transition">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Success State */}
      {result && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 animate-slide-up">
          <div className="flex items-center gap-2 text-success mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium text-sm">Upload Successful</span>
          </div>
          <p className="text-sm text-foreground">{result.message}</p>
          <p className="text-xs text-muted-foreground mt-1">Rows loaded: {result.rows_loaded}</p>
          {result.warnings?.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-warning">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      {!result && (
        <>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            }`}
            onClick={() => document.getElementById(`file-${datasetType}`).click()}
          >
            <input
              id={`file-${datasetType}`}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className={`w-8 h-8 mx-auto mb-3 transition ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-sm text-foreground">
              {file ? (
                <span className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  {file.name}
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </span>
              ) : (
                <>Drag & drop CSV file or <span className="text-primary">browse</span></>
              )}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-destructive animate-fade-in">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Button */}
          {file && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-full font-medium text-sm transition-all hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {title}
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
