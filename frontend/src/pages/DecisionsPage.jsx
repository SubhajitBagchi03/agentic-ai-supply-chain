import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import { getSkuDecisions, sendQuery } from '../services/api';
import {
  Search, Package, Truck, Users, AlertTriangle,
  CheckCircle, Loader2, ArrowRight, Shield,
  TrendingDown, Clock, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { renderMarkdown } from '../utils/markdown';

const STATUS_STYLES = {
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  'AT RISK': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  HEALTHY: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

export default function DecisionsPage() {
  const [skuInput, setSkuInput] = useState(() => {
    return sessionStorage.getItem('decisions_sku') || '';
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => {
    const saved = sessionStorage.getItem('decisions_result');
    return saved ? JSON.parse(saved) : null;
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(() => {
    const saved = sessionStorage.getItem('decisions_ai');
    return saved ? JSON.parse(saved) : null;
  });
  const [showAi, setShowAi] = useState(() => {
    return sessionStorage.getItem('decisions_ai') !== null;
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (result) sessionStorage.setItem('decisions_result', JSON.stringify(result));
    if (skuInput) sessionStorage.setItem('decisions_sku', skuInput);
  }, [result, skuInput]);

  useEffect(() => {
    if (aiAnalysis) sessionStorage.setItem('decisions_ai', JSON.stringify(aiAnalysis));
  }, [aiAnalysis]);

  const handleLookup = async () => {
    if (!skuInput.trim()) return;
    setLoading(true);
    setResult(null);
    setAiAnalysis(null);
    setShowAi(false);
    try {
      const data = await getSkuDecisions(skuInput.trim());
      setResult(data);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  const handleAiDeepDive = async () => {
    if (!skuInput.trim()) return;
    setAiLoading(true);
    setShowAi(true);
    try {
      const res = await sendQuery(`Give me a very short, highly structured risk analysis and recommended actions for SKU ${skuInput.trim()}. Use bullet points for readability. Be concise. Include brief reorder suggestions, supplier evaluation, and any immediate shipment concerns.`);
      setAiAnalysis(res);
    } catch (e) {
      setAiAnalysis({ error: e.message });
    }
    setAiLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLookup();
  };

  const inv = result?.inventory;
  const style = inv ? (STATUS_STYLES[inv.status] || STATUS_STYLES.HEALTHY) : null;

  return (
    <>
      <Header title="Agent Decisions" subtitle="Deep-dive AI reasoning for any SKU" />
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

        {/* Search Bar */}
        <div className="glass rounded-xl p-5 animate-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <Search className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-foreground">SKU Decision Explainer</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Enter any SKU ID to see the AI's full reasoning chain — risk factors, supplier cross-reference, shipment status, and actionable recommendations.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="e.g. SKU-101, SKU-102..."
              className="flex-1 px-4 py-2.5 text-sm bg-white border border-black/8 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            <button
              onClick={handleLookup}
              disabled={loading || !skuInput.trim()}
              className="px-5 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-foreground/80 disabled:opacity-40 transition-all flex items-center gap-2 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Analyze
            </button>
          </div>
        </div>

        {/* Results */}
        {result && !result.error && (
          <div className="space-y-4 animate-slide-up">

            {/* Inventory Overview Card */}
            {inv && (
              <div className={`rounded-xl border-2 ${style.border} ${style.bg} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-foreground" />
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{inv.name}</h3>
                      <p className="text-xs text-muted-foreground">{result.sku} • {inv.warehouse}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
                    <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className="text-xs font-bold">{inv.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'On Hand', value: inv.on_hand, icon: Package },
                    { label: 'Safety Stock', value: inv.safety_stock, icon: Shield },
                    { label: 'Daily Demand', value: inv.avg_daily_demand, icon: TrendingDown },
                    { label: 'Days of Supply', value: inv.days_of_supply ? `${inv.days_of_supply}d` : 'N/A', icon: Clock },
                  ].map((m) => (
                    <div key={m.label} className="bg-white/60 rounded-lg p-3 text-center">
                      <m.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{m.value}</p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Stock Health Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Stock Level</span>
                    <span>{inv.on_hand} / {Math.max(inv.on_hand, inv.safety_stock * 2)}</span>
                  </div>
                  <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        inv.on_hand <= inv.safety_stock ? 'bg-red-500' :
                        inv.on_hand <= inv.safety_stock * 1.5 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (inv.on_hand / Math.max(inv.on_hand, inv.safety_stock * 2)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] mt-1">
                    <span className="text-red-500">Critical</span>
                    <span className="text-amber-500">Safety ({inv.safety_stock})</span>
                    <span className="text-emerald-500">Healthy</span>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {result.risk_factors?.length > 0 && (
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-foreground">Risk Factors</h3>
                  <span className="ml-auto text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                    {result.risk_factors.length} detected
                  </span>
                </div>
                <div className="space-y-2">
                  {result.risk_factors.map((rf, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-red-50/50 border border-red-100 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <span className="text-foreground">{rf}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold text-foreground">Recommendations</h3>
                </div>
                <div className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                      <ArrowRight className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supplier Cross-Reference */}
            {result.suppliers?.length > 0 && (
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-foreground">Linked Supplier</h3>
                </div>
                {result.suppliers.map((s, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm">
                    <div className="bg-blue-50 rounded-lg p-3 text-center flex-1">
                      <p className="text-lg font-bold text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.supplier_id}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 text-center flex-1">
                      <p className="text-lg font-bold text-emerald-700">{(s.on_time_rate * 100).toFixed(0)}%</p>
                      <p className="text-[10px] text-muted-foreground">On-Time</p>
                    </div>
                    <div className="bg-violet-50 rounded-lg p-3 text-center flex-1">
                      <p className="text-lg font-bold text-violet-700">{(s.quality_score * 100).toFixed(0)}%</p>
                      <p className="text-[10px] text-muted-foreground">Quality</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Shipment Cross-Reference */}
            {result.shipments?.length > 0 && (
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-violet-600" />
                  <h3 className="font-semibold text-foreground">Active Shipments</h3>
                </div>
                <div className="space-y-2">
                  {result.shipments.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-violet-50/30 border border-violet-100 rounded-lg p-3">
                      <div>
                        <p className="font-medium text-foreground">{s.shipment_id}</p>
                        <p className="text-xs text-muted-foreground">{s.origin} → {s.destination}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{s.quantity} units</p>
                        <p className={`text-xs font-medium ${s.status.toLowerCase().includes('delay') ? 'text-red-600' : 'text-emerald-600'}`}>
                          {s.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Deep-Dive Button */}
            <div className="glass rounded-xl p-5">
              <button
                onClick={handleAiDeepDive}
                disabled={aiLoading}
                className="w-full py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Consulting AI Agents...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Run Full AI Deep-Dive Analysis</>
                )}
              </button>

              {showAi && aiAnalysis && !aiAnalysis.error && (
                <div className="mt-4 bg-linear-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-foreground">AI Multi-Agent Analysis</span>
                    {aiAnalysis.responses?.[0]?.confidence && (
                      <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                        aiAnalysis.responses[0].confidence >= 0.7 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {(aiAnalysis.responses[0].confidence * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </div>
                  {aiAnalysis.responses?.map((resp, i) => (
                    <div key={i} className="mb-3 last:mb-0">
                      <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-1">{resp.agent}</p>
                      <div className="text-sm text-foreground leading-relaxed">
                        {renderMarkdown(resp.reasoning)}
                      </div>
                      {resp.recommendation && resp.recommendation !== resp.reasoning && (
                        <div className="text-sm text-foreground mt-2 bg-white/60 rounded-lg p-3 border border-blue-100">
                          <strong>Recommendation:</strong>
                          <div className="mt-1">{renderMarkdown(resp.recommendation)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {result?.error && (
          <div className="glass rounded-xl p-5 animate-slide-up">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm">{result.error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !loading && (
          <div className="glass rounded-xl p-10 text-center animate-slide-up">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Enter a SKU to begin analysis</p>
            <p className="text-xs text-muted-foreground mt-1">
              The AI will cross-reference inventory, suppliers, and shipments to build a complete decision chain
            </p>
          </div>
        )}
      </div>
    </>
  );
}
