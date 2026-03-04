import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import { sendQuery } from '../services/api';
import { BarChart3, Loader2, AlertTriangle, TrendingUp, Shield, Package, Lightbulb, Download } from 'lucide-react';
import { renderMarkdown } from '../utils/markdown';
import { jsPDF } from 'jspdf';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  
  // Load initial state from sessionStorage
  const [report, setReport] = useState(() => {
    const saved = sessionStorage.getItem('saved_report_data');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [error, setError] = useState(null);

  // Save to sessionStorage whenever report changes
  useEffect(() => {
    if (report) {
      sessionStorage.setItem('saved_report_data', JSON.stringify(report));
    }
  }, [report]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sendQuery('Generate a comprehensive supply chain health report with KPIs, risk assessment, and recommendations');
      setReport(res);
    } catch (err) {
      setError(err.message || 'Report generation failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    const maxW = pageW - margin * 2;
    let y = 20;

    const addPage = () => { doc.addPage(); y = 20; };
    const checkPage = (needed = 20) => { if (y + needed > 275) addPage(); };

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Supply Chain Report', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 5;
    doc.text(`Agents: ${report.metadata?.agents_used?.join(', ') || 'N/A'}  |  Processing: ${report.metadata?.processing_time_ms || 0}ms`, margin, y);
    y += 10;

    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // Each agent response
    report.responses?.forEach((resp) => {
      checkPage(30);
      doc.setTextColor(40);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`${resp.agent}  (${(resp.confidence * 100).toFixed(0)}% confidence)`, margin, y);
      y += 8;

      if (resp.reasoning) {
        checkPage(15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80);
        doc.text('Analysis', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        const lines = doc.splitTextToSize(resp.reasoning, maxW);
        lines.forEach((line) => {
          checkPage(6);
          doc.text(line, margin, y);
          y += 5;
        });
        y += 4;
      }

      if (resp.recommendation) {
        checkPage(15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80);
        doc.text('Recommendations', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        const lines = doc.splitTextToSize(resp.recommendation, maxW);
        lines.forEach((line) => {
          checkPage(6);
          doc.text(line, margin, y);
          y += 5;
        });
        y += 4;
      }

      checkPage(8);
      doc.setDrawColor(220);
      doc.line(margin, y, pageW - margin, y);
      y += 8;
    });

    const pdfData = doc.output('datauristring');
    const a = document.createElement('a');
    a.href = pdfData;
    a.download = `supply_chain_report_${new Date().toISOString().slice(0, 10)}.pdf`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
  };

  return (
    <>
      <Header title="Reports" subtitle="Generate supply chain intelligence reports" />
      <div className="p-4 md:p-6 space-y-5">
        {/* Tutorial Card */}
        <div className="glass rounded-xl p-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 shrink-0">
              <Lightbulb className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Tip:</strong> Generate AI-powered reports by clicking the button below. Reports analyze all loaded datasets — inventory levels, supplier reliability, shipment status, and overall risk. Connect live data via <a href="/sheets" className="text-blue-600 hover:underline">Data Sources</a> for the most current analysis.
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-accent/20">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Executive Report</h3>
                <p className="text-sm text-muted-foreground">AI-generated supply chain analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {report && (
                <button
                  onClick={downloadReport}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm transition-all hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
              <button
                onClick={generateReport}
                disabled={loading}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm transition-all hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm text-foreground">{error}</p>
          </div>
        )}

        {/* Report Results */}
        {report && (
          <div className="space-y-4 animate-slide-up">
            <div className="glass rounded-xl p-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span>Agents: {report.metadata?.agents_used?.join(', ')}</span>
              <span>Processing: {report.metadata?.processing_time_ms}ms</span>
            </div>

            {report.responses?.map((resp, idx) => (
              <div key={idx} className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  {resp.agent?.includes('Report') && <TrendingUp className="w-5 h-5 text-secondary" />}
                  {resp.agent?.includes('Risk') && <Shield className="w-5 h-5 text-warning" />}
                  {resp.agent?.includes('Inventory') && <Package className="w-5 h-5 text-primary" />}
                  <h3 className="font-semibold text-foreground">{resp.agent}</h3>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${
                    resp.confidence >= 0.7 ? 'bg-success/20 text-success' :
                    resp.confidence >= 0.4 ? 'bg-warning/20 text-warning' :
                    'bg-destructive/20 text-destructive'
                  }`}>
                    {(resp.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {resp.reasoning && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Analysis</h4>
                    <div className="text-sm text-foreground leading-relaxed">{renderMarkdown(resp.reasoning)}</div>
                  </div>
                )}
                {resp.recommendation && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Recommendations</h4>
                    <div className="text-sm text-foreground leading-relaxed">{renderMarkdown(resp.recommendation)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
