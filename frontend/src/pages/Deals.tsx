import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dealsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { Pagination } from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import {
  DollarSign, Plus, Target, TrendingUp, Award, RefreshCw,
  ChevronRight, Sparkles, BarChart3
} from 'lucide-react';

const STAGES = [
  { key: 'prospecting', label: 'Prospecting', color: 'bg-gray-100 text-gray-700' },
  { key: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700' },
  { key: 'proposal', label: 'Proposal', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-700' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-700' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-700' },
];

const Deals: React.FC = () => {
  const navigate = useNavigate();
  const { team, user } = useAuth();
  const { showToast } = useToast();
  const [deals, setDeals] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stageFilter, setStageFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scoringDeal, setScoringDeal] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', value: '', stage: 'prospecting', closeDate: '', notes: '' });

  const fetchDeals = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const params: any = { teamId: team.id, page, limit: 20 };
      if (stageFilter) params.stage = stageFilter;
      const res = await dealsAPI.getAll(params);
      setDeals(res.data.deals || []);
      setPipeline(res.data.pipeline || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      showToast('Failed to load deals', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, page, stageFilter]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const handleCreate = async () => {
    if (!form.title) return showToast('Deal title is required', 'error');
    try {
      await dealsAPI.create({
        teamId: team?.id, ownerId: user?.id,
        title: form.title, value: parseFloat(form.value) || 0,
        stage: form.stage, closeDate: form.closeDate || null, notes: form.notes,
      });
      showToast('Deal created', 'success');
      setShowCreateModal(false);
      setForm({ title: '', value: '', stage: 'prospecting', closeDate: '', notes: '' });
      fetchDeals();
    } catch (error) {
      showToast('Failed to create deal', 'error');
    }
  };

  const handleAIScore = async (dealId: string) => {
    setScoringDeal(dealId);
    try {
      const res = await dealsAPI.aiScore(dealId, { teamId: team?.id, userId: user?.id });
      showToast(`AI Win Probability: ${res.data.winProbability}%`, 'success');
      fetchDeals();
    } catch (error) {
      showToast('Failed to get AI score', 'error');
    } finally {
      setScoringDeal(null);
    }
  };

  const totalPipelineValue = pipeline.reduce((sum, p) => sum + p.totalValue, 0);
  const weightedValue = pipeline.reduce((sum, p) => sum + (p.totalValue * p.avgProbability / 100), 0);

  const getStageStyle = (stage: string) => STAGES.find(s => s.key === stage)?.color || 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage your sales opportunities</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" /> New Deal
        </button>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Pipeline</p>
          <p className="text-2xl font-bold text-gray-900">${totalPipelineValue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{total} deals</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Weighted Value</p>
          <p className="text-2xl font-bold text-green-600">${Math.round(weightedValue).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Probability-adjusted</p>
        </div>
        {pipeline.filter(p => p.stage === 'negotiation').map(p => (
          <div key={p.stage} className="bg-white rounded-xl p-4 border border-orange-200">
            <p className="text-sm text-orange-600">In Negotiation</p>
            <p className="text-2xl font-bold text-orange-700">${p.totalValue.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{p.count} deals</p>
          </div>
        ))}
        {pipeline.filter(p => p.stage === 'proposal').map(p => (
          <div key={p.stage} className="bg-white rounded-xl p-4 border border-yellow-200">
            <p className="text-sm text-yellow-600">Proposals Out</p>
            <p className="text-2xl font-bold text-yellow-700">${p.totalValue.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{p.count} deals</p>
          </div>
        ))}
      </div>

      {/* Stage Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setStageFilter(''); setPage(1); }}
          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
            !stageFilter ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Stages
        </button>
        {STAGES.map(s => (
          <button
            key={s.key}
            onClick={() => { setStageFilter(s.key); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              stageFilter === s.key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
            {pipeline.find(p => p.stage === s.key) && (
              <span className="ml-1 text-xs opacity-75">
                ({pipeline.find(p => p.stage === s.key)?.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} columns={6} />
        ) : deals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No deals yet</p>
            <p className="text-sm">Create your first deal to start tracking pipeline</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              Create Deal
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Deal</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Stage</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Value</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Close Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Win Prob.</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deals.map(deal => (
                <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{deal.title}</p>
                    {deal.owner && <p className="text-xs text-gray-400">{deal.owner.name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStageStyle(deal.stage)}`}>
                      {STAGES.find(s => s.key === deal.stage)?.label || deal.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900 text-sm">${deal.value.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    {deal.contact ? (
                      <div>
                        <p className="text-sm text-gray-900">{deal.contact.name}</p>
                        <p className="text-xs text-gray-400">{deal.contact.company}</p>
                      </div>
                    ) : <span className="text-gray-400 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {deal.aiWinProbability != null ? (
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${deal.aiWinProbability}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{deal.aiWinProbability}%</span>
                          <Sparkles className="h-3 w-3 text-purple-400" aria-label="AI Scored" />
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">{deal.probability}%</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleAIScore(deal.id)}
                      disabled={scoringDeal === deal.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 disabled:opacity-50"
                      title="Get AI Win Probability"
                    >
                      {scoringDeal === deal.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI Score
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={20} onPageChange={setPage} />
      )}

      {/* Create Deal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">New Deal</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deal Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Acme Corp - Enterprise Plan"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    placeholder="50000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select
                    value={form.stage}
                    onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {STAGES.slice(0, 4).map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
                <input
                  type="date"
                  value={form.closeDate}
                  onChange={e => setForm(f => ({ ...f, closeDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Any relevant context..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deals;
