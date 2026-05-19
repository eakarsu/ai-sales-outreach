import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { playbookAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';
import { Pagination } from '../components/Pagination';
import { BookOpen, Sparkles, RefreshCw, TrendingUp, CheckCircle, Target, Lightbulb } from 'lucide-react';

const AIPlaybookLearner: React.FC = () => {
  const { team, user } = useAuth();
  const { showToast } = useToast();
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [latestPlaybook, setLatestPlaybook] = useState<any | null>(null);

  const fetchPlaybooks = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const res = await playbookAPI.getAll({ teamId: team.id, page, limit: 10 });
      setPlaybooks(res.data.playbooks || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      if ((res.data.playbooks || []).length > 0) {
        const pb = res.data.playbooks[0];
        setLatestPlaybook({
          ...pb,
          insights: pb.insights || [],
          topPatterns: pb.top_patterns || [],
          recommendedSequences: pb.recommended_sequences || [],
        });
      }
    } catch (error) {
      showToast('Failed to load playbooks', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, page]);

  useEffect(() => { fetchPlaybooks(); }, [fetchPlaybooks]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await playbookAPI.generate({ teamId: team?.id, userId: user?.id });
      showToast("Playbook generated from your team's performance data!", 'success');
      setLatestPlaybook(res.data);
      fetchPlaybooks();
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Failed to generate playbook', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const priorityColor = (priority: string) =>
    priority === 'high' ? 'text-red-600 bg-red-50' :
    priority === 'medium' ? 'text-yellow-600 bg-yellow-50' :
    'text-blue-600 bg-blue-50';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" /> AI Playbook Learner
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            AI analyzes your team performance to generate a living sales playbook
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {generating ? (
            <><RefreshCw className="h-4 w-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Generate Playbook</>
          )}
        </button>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-800">
          The AI learns from your top-performing templates, campaigns, and sequences.
          Generate a new playbook monthly to incorporate the latest performance data.
        </p>
      </div>

      {latestPlaybook && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{latestPlaybook.name || 'Current Playbook'}</h2>
            <span className="text-xs text-gray-400">
              Generated {new Date(latestPlaybook.created_at || latestPlaybook.savedAt || Date.now()).toLocaleDateString()}
            </span>
          </div>

          {(latestPlaybook.insights || []).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> Key Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(latestPlaybook.insights || []).map((insight: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">{insight.finding}</p>
                      {insight.priority && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${priorityColor(insight.priority)}`}>
                          {insight.priority}
                        </span>
                      )}
                    </div>
                    {insight.impact && <p className="text-xs text-gray-500 mb-1">{insight.impact}</p>}
                    {insight.action && (
                      <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                        <p className="text-xs text-emerald-700 font-medium">Action: {insight.action}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(latestPlaybook.topPatterns || []).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" /> Winning Patterns
              </h3>
              <div className="space-y-3">
                {(latestPlaybook.topPatterns || []).map((pattern: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pattern.pattern}</p>
                      {pattern.recommendation && <p className="text-xs text-gray-500 mt-0.5">{pattern.recommendation}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(latestPlaybook.recommendedSequences || []).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Recommended Sequences
              </h3>
              {(latestPlaybook.recommendedSequences || []).map((seq: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-2">
                  <p className="text-sm font-semibold text-gray-900">{seq.name}</p>
                  {seq.trigger && <p className="text-xs text-gray-500 mt-0.5 mb-2">Trigger: {seq.trigger}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    {(seq.steps || []).map((step: any, si: number) => (
                      <React.Fragment key={si}>
                        <div className="bg-white rounded px-2 py-1 border border-gray-200 text-xs">
                          <span className="text-gray-400">Step {step.step}:</span> {step.action}
                        </div>
                        {si < seq.steps.length - 1 && <span className="text-gray-300">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {latestPlaybook.coachingTips && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Team Coaching Tips</h3>
              <ul className="space-y-1">
                {(latestPlaybook.coachingTips || []).map((tip: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!loading && !latestPlaybook && playbooks.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl font-medium mb-2">No playbook generated yet</p>
          <p className="text-sm mb-6">Click "Generate Playbook" to learn from your team's data</p>
          <button onClick={handleGenerate} disabled={generating} className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50">
            Generate My First Playbook
          </button>
        </div>
      )}

      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={20} onPageChange={setPage} />}
    </div>
  );
};

export default AIPlaybookLearner;
