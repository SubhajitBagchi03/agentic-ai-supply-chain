import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { sendQuery } from '../services/api';
import {
  Send, Loader2, Bot, AlertTriangle,
  ChevronDown, ChevronUp, Plus, Clock, Sparkles
} from 'lucide-react';

import { renderMarkdown } from '../utils/markdown';

/* ------------------------------------------------------------------ */
/*  LocalStorage helpers for chat persistence                         */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = 'supply_chain_chat_history';

function loadConversations() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveConversations(convos) {
  try {
    // Keep last 50 messages to avoid storage bloat
    const trimmed = convos.slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function QueryPage() {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState(loadConversations);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const hasFetchedRef = useRef(false);

  // Persist conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [query]);

  const executeQuery = async (queryText) => {
    if (!queryText.trim() || loading) return;

    setConversations(prev => [...prev, { type: 'user', text: queryText, ts: Date.now() }]);
    setLoading(true);
    setError(null);

    try {
      const res = await sendQuery(queryText);
      setConversations(prev => [...prev, { type: 'assistant', data: res, ts: Date.now() }]);
    } catch (err) {
      setConversations(prev => [...prev, { type: 'error', text: err.message || 'Query failed', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.initialQuery && !hasFetchedRef.current) {
      const q = location.state.initialQuery;
      hasFetchedRef.current = true;
      // Clear the state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title);
      executeQuery(q);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userQuery = query.trim();
    setQuery('');
    await executeQuery(userQuery);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewChat = () => {
    setConversations([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const exampleQueries = [
    'Which items are low on stock?',
    'Who is the best supplier?',
    'Any delayed shipments?',
    'Generate a risk report',
  ];

  /* Build a clean, user-friendly response from agent data */
  const buildResponse = (data) => {
    const responses = data.responses || [];
    if (responses.length === 0) {
      return { summary: 'No analysis available.', details: null, confidence: 0 };
    }

    // Combine all agent responses
    const allReasoning = [];
    const allRecommendations = [];
    const allWarnings = [];
    let maxConfidence = 0;
    const agents = [];

    responses.forEach(resp => {
      if (resp.confidence > maxConfidence) maxConfidence = resp.confidence;
      agents.push(resp.agent);

      // Deduplicate: if recommendation is identical to reasoning, skip it
      const reasoning = (resp.reasoning || '').trim();
      const recommendation = (resp.recommendation || '').trim();

      if (reasoning) allReasoning.push(reasoning);
      if (recommendation && recommendation !== reasoning) {
        allRecommendations.push(recommendation);
      }

      if (resp.warnings?.length) allWarnings.push(...resp.warnings);
    });

    // Build a single, clean response text
    let fullText = '';
    if (allReasoning.length) fullText += allReasoning.join('\n\n');
    if (allRecommendations.length) fullText += '\n\n' + allRecommendations.join('\n\n');

    return {
      fullText,
      warnings: allWarnings,
      confidence: maxConfidence,
      agents,
      latency: data.metadata?.total_latency_ms,
    };
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Welcome state */}
          {conversations.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
              <div className="mb-6">
                <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4" />
                <h1 className="text-2xl font-semibold text-foreground text-center">
                  Supply Chain Assistant
                </h1>
                <p className="text-muted-foreground text-center mt-2 text-sm">
                  Ask questions about your inventory, suppliers, shipments, and more
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                {exampleQueries.map((eq) => (
                  <button
                    key={eq}
                    onClick={() => setQuery(eq)}
                    className="px-4 py-2 text-sm bg-white border border-black/8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white hover:shadow-md transition-all"
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation messages */}
          {conversations.map((conv, convIdx) => (
            <div key={convIdx} className="animate-slide-up">
              {/* User message */}
              {conv.type === 'user' && (
                <div className="flex justify-end mb-4">
                  <div className="bg-foreground text-white px-5 py-3 rounded-3xl rounded-br-lg max-w-lg text-sm">
                    {conv.text}
                  </div>
                </div>
              )}

              {/* Assistant response — modern, clean, readable */}
              {conv.type === 'assistant' && (() => {
                const parsed = buildResponse(conv.data);
                return (
                  <div className="mb-6">
                    {/* AI avatar + metadata */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium text-foreground text-sm">Supply Chain AI</span>
                      <span className="text-xs text-muted-foreground/60">•</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        parsed.confidence >= 0.7 ? 'bg-green-50 text-green-700' :
                        parsed.confidence >= 0.4 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {(parsed.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>

                    {/* Main response body */}
                    <div className="ml-11">
                      <div className="bg-white rounded-2xl border border-black/5 px-5 py-4 shadow-sm">
                        <div className="text-foreground">
                          {renderMarkdown(parsed.fullText, { stripHeaders: true })}
                        </div>

                        {/* Warnings */}
                        {parsed.warnings?.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-black/5 space-y-1.5">
                            {parsed.warnings.map((w, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-amber-600">
                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>{w}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer metadata */}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground/50">
                        {parsed.agents.length > 0 && (
                          <span>{parsed.agents.join(' + ')}</span>
                        )}
                        {parsed.latency && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {(parsed.latency / 1000).toFixed(1)}s
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Error message */}
              {conv.type === 'error' && (
                <div className="flex items-start gap-3 mb-4 ml-11">
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-sm text-red-700">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{conv.text}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing data and generating insights...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Bottom Input Bar */}
      <div className="sticky bottom-0 px-6 pb-4 pt-2 bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl border border-black/8 shadow-lg px-4 py-2 flex items-end gap-2">
            <button
              type="button"
              onClick={handleNewChat}
              className="p-2 rounded-full text-muted-foreground hover:bg-gray-100 transition shrink-0 mb-0.5"
              title="New conversation"
            >
              <Plus className="w-5 h-5" />
            </button>

            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your supply chain..."
              rows={1}
              className="flex-1 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none bg-transparent leading-relaxed"
            />

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="p-2.5 rounded-full bg-foreground text-white transition-all hover:bg-foreground/80 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 mb-0.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-2">
            AI responses are generated based on your uploaded supply chain data
          </p>
        </form>
      </div>
    </div>
  );
}
