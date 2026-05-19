import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { prospectResearchAPI, contactsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';
import { Pagination } from '../components/Pagination';
import { Search, Sparkles, RefreshCw, User, Building2, Lightbulb, AlertTriangle } from 'lucide-react';

const AIProspectResearch: React.FC = () => {
  const { team, user } = useAuth();
  const { showToast } = useToast();
  const [research, setResearch] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedResearch, setSelectedResearch] = useState<any | null>(null);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const [researchRes, contactsRes] = await Promise.all([
        prospectResearchAPI.getAll({ teamId: team.id, page, limit: 20 }),
        contactsAPI.getAll({ teamId: team.id, limit: 100 }),
      ]);
      setResearch(researchRes.data.research || []);
      setTotal(researchRes.data.total || 0);
      setTotalPages(researchRes.data.totalPages || 1);
      setContacts(contactsRes.data.contacts || []);
    } catch (error) {
      showToast('Failed to load prospect research', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResearch = async () => {
    if (!selectedContactId) return showToast('Please select a contact', 'error');
    setResearching(true);
    try {
      const res = await prospectResearchAPI.research({
        teamId: team?.id, userId: user?.id, contactId: selectedContactId,
      });
      showToast('Prospect research complete!', 'success');
      setSelectedResearch(res.data);
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Failed to research prospect', 'error');
    } finally {
      setResearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="h-6 w-6 text-violet-600" /> AI Prospect Research
          </h1>
          <p className="text-gray-500 text-sm mt-1">AI-generated deep-dive briefs on your prospects</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          <Sparkles className="h-4 w-4" /> Research a Prospect
        </button>
      </div>

      {/* Selected Research Panel */}
      {selectedResearch && (
        <div className="bg-white rounded-xl border border-violet-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedResearch.contactName}</h2>
              <p className="text-sm text-gray-500">{selectedResearch.company}</p>
            </div>
            {selectedResearch.aiConfidence && (
              <span className="text-xs font-medium text-violet-700 bg-violet-50 px-2 py-1 rounded-full">
                {selectedResearch.aiConfidence}% confidence
              </span>
            )}
          </div>

          {selectedResearch.companyOverview && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" /> Company Overview
              </h3>
              <p className="text-sm text-gray-600">{selectedResearch.companyOverview}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(selectedResearch.painPoints || []).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-orange-500" /> Pain Points
                </h3>
                <ul className="space-y-1">
                  {selectedResearch.painPoints.map((p: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                      <span className="text-orange-400 flex-shrink-0">•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(selectedResearch.triggerEvents || []).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-yellow-500" /> Trigger Events to Watch
                </h3>
                <ul className="space-y-1">
                  {selectedResearch.triggerEvents.map((t: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                      <span className="text-yellow-500 flex-shrink-0">•</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {selectedResearch.recommendedApproach && (
            <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
              <h3 className="text-sm font-semibold text-violet-800 mb-1">Recommended Approach</h3>
              <p className="text-sm text-violet-700">{selectedResearch.recommendedApproach}</p>
            </div>
          )}

          {selectedResearch.emailOpeningLine && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Personalized Email Opening</h3>
              <p className="text-sm text-gray-600 italic">"{selectedResearch.emailOpeningLine}"</p>
            </div>
          )}

          {(selectedResearch.techStack || []).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Likely Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {selectedResearch.techStack.map((tech: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{tech}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Research History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <SkeletonTable rows={4} columns={4} />
        ) : research.length === 0 && !selectedResearch ? (
          <div className="text-center py-12 text-gray-400">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No prospect research yet</p>
            <p className="text-sm">Select a contact to generate a deep-dive AI brief</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm"
            >
              Research a Prospect
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Company</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Pain Points</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {research.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{r.contactName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">{r.company}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">
                      {(r.pain_points || []).slice(0, 2).join(', ')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedResearch({ ...r, contactName: r.contactName, painPoints: r.pain_points, triggerEvents: r.trigger_events, techStack: r.tech_stack, recommendedApproach: r.recommended_approach })}
                      className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={20} onPageChange={setPage} />}

      {/* Research Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" /> Research a Prospect
            </h2>
            <p className="text-sm text-gray-500 mb-4">AI will generate a deep-dive brief based on contact info</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Contact</label>
              <select
                value={selectedContactId}
                onChange={e => setSelectedContactId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Choose a contact...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} — {c.company || 'No company'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResearch}
                disabled={researching || !selectedContactId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {researching ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Researching...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Research</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIProspectResearch;
