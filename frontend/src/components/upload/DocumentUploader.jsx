import { useState, useCallback } from 'react';
import { Upload, CheckCircle, AlertTriangle, X, FileText } from 'lucide-react';

export default function DocumentUploader({ onUpload }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [docType, setDocType] = useState('general');
  const [supplierName, setSupplierName] = useState('');

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
    const ext = droppedFile?.name.split('.').pop().toLowerCase();
    if (['pdf', 'txt', 'md'].includes(ext)) setFile(droppedFile);
    else setError('Supported formats: PDF, TXT, MD');
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
      const res = await onUpload(file, {
        document_type: docType,
        supplier_name: supplierName || undefined,
      });
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
    setDocType('general');
    setSupplierName('');
  };

  const docTypes = ['general', 'contract', 'delivery_note', 'report', 'email', 'purchase_order'];

  return (
    <div className="glass rounded-xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Upload Document</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload documents to the RAG knowledge base
          </p>
        </div>
        {result && (
          <button onClick={reset} className="p-1 text-muted-foreground hover:text-foreground transition">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {result ? (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 animate-slide-up">
          <div className="flex items-center gap-2 text-success mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium text-sm">Document Uploaded</span>
          </div>
          <p className="text-sm text-foreground">{result.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Document ID: {result.document_id}
          </p>
        </div>
      ) : (
        <>
          {/* Metadata Fields */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {docTypes.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Supplier (optional)</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Acme Materials"
                className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
            }`}
            onClick={() => document.getElementById('doc-file').click()}
          >
            <input
              id="doc-file"
              type="file"
              accept=".pdf,.txt,.md"
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
                <>Drag & drop PDF, TXT, or MD file or <span className="text-primary">browse</span></>
              )}
            </p>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-destructive animate-fade-in">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {file && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium text-sm transition-all hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload to Knowledge Base
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
