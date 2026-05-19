import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { competitiveIntelAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';
import { Pagination } from '../components/Pagination';
import { Globe, Plus, Sparkles, Shield, TrendingUp, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const AICompetitiveIntel: React.FC = () => {
  const { team, user } = useAuth();
  const { showToast } = useToast();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<any | null>(null);
  const [form, setForm] = useState({ companyName: '', industry: 'Technology', ourProduct: '', targetCompetitors: '' });

  const fetchAnalyses = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const res = await competitiveIntelAPI.getAll({ teamId: team.id, page, limit: 20 });
      setAnalyses(res.data.analyses || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      showToast('Failed to load competitive intel', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, page]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const handleAnalyze = async () => {
    if (!form.industry) return showToast('Industry is required', 'error');
    setAnalyzing(true);
    try {
      const res = await competitiveIntelAPI.analyze({
        teamId: team?.id, userId: user?.id,
        companyName: form.companyName,
        industry: form.industry,
        ourProduct: form.ourProduct,
        targetCompetitors: form.targetCompetitors ? form.targetCompetitors.split(',').map(s => s.trim()) : [],
      });
      showToast('Competitive analysis complete!', 'success');
      setLatestAnalysis(res.data);
      setShowModal(false);
      fetchAnalyses();
    } catch (error) {
      showToast('Failed to analyze competitive landscape', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-500" /> Competitive Intelligence
          </h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered competitive analysis and battle cards</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Analysis
        </button>
      </div>

      {/* Latest Analysis Panel */}
      {latestAnalysis && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" /> Latest AI Analysis
          </h2>
          {latestAnalysis.competitors && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {latestAnalysis.competitors.slice(0, 4).map((comp: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-sm">{comp.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 mb-2">{comp.typicalCustomer}</p>
                  <div className="space-y-1">
                    <p className="text-xs text-green-600 font-medium">Our Advantage:</p>
                    <p className="text-xs text-gray-600">{comp.ourAdvantage}</p>
                  </div>
                  {comp.weaknesses && comp.weaknesses.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-red-500 font-medium">Their Weaknesses:</p>
                      <ul className="mt-0.5">
                        {comp.weaknesses.slice(0, 2).map((w: string, wi: number) => (
                          <li key={wi} className="text-xs text-gray-500">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {latestAnalysis.differentiators && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Our Key Differentiators</h3>
              <div className="flex flex-wrap gap-2">
                {latestAnalysis.differentiators.map((d: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-lg">{d}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analyses List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <SkeletonTable rows={4} columns={4} />
        ) : analyses.length === 0 && !latestAnalysis ? (
          <div className="text-center py-12 text-gray-400">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No competitive analyses yet</p>
            <p className="text-sm">Run an analysis to get AI-powered battle cards</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Run Analysis
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {analyses.map(analysis => (
              <div key={analysis.id} className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {analysis.company_name || 'General'} — {analysis.industry}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(analysis.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{(analysis.competitors || []).length} competitors</span>
                    {expandedId === analysis.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
                {expandedId === analysis.id && (
                  <div className="mt-4 space-y-3">
                    {(analysis.differentiators || []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Differentiators</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.differentiators.map((d: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded">{d}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(analysis.positioning_tips || []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Positioning Tips</p>
                        <ul className="space-y-0.5">
                          {analysis.positioning_tips.slice(0, 3).map((tip: string, i: number) => (
                            <li key={i} className="text-xs text-gray-600">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={20} onPageChange={setPage} />}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" /> Run Competitive Analysis
            </h2>
            <p className="text-sm text-gray-500 mb-4">AI will analyze your competitive landscape and generate battle cards</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  placeholder="e.g. B2B SaaS, FinTech, Healthcare"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Company Name</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  placeholder="Your company name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Our Product Description</label>
                <textarea
                  value={form.ourProduct}
                  onChange={e => setForm(f => ({ ...f, ourProduct: e.target.value }))}
                  rows={2}
                  placeholder="Briefly describe what your product does..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Known Competitors (comma-separated)</label>
                <input
                  type="text"
                  value={form.targetCompetitors}
                  onChange={e => setForm(f => ({ ...f, targetCompetitors: e.target.value }))}
                  placeholder="Outreach.io, Salesloft, Apollo.io"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {analyzing ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Run Analysis</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICompetitiveIntel;
