import { useState } from 'react';
import Header from '../components/layout/Header';
import { sendQuery } from '../services/api';
import { BarChart3, Loader2, AlertTriangle, TrendingUp, Shield, Package, Lightbulb } from 'lucide-react';
import { renderMarkdown } from '../utils/markdown';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

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

  return (
    <>
      <Header title="Reports" subtitle="Generate supply chain intelligence reports" />
      <div className="p-6 space-y-5">
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
