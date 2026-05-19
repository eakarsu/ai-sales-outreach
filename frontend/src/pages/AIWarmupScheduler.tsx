import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { warmupAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';
import { Pagination } from '../components/Pagination';
import { Flame, Plus, Calendar, Mail, RefreshCw, ChevronRight, Sparkles, CheckCircle } from 'lucide-react';

const AIWarmupScheduler: React.FC = () => {
  const { team, user } = useAuth();
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [form, setForm] = useState({ emailAddress: '', name: '', totalDays: '30' });

  const fetchSchedules = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const res = await warmupAPI.getAll({ teamId: team.id, page, limit: 20 });
      setSchedules(res.data.warmupSchedules || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      showToast('Failed to load warmup schedules', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, page]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const handleCreate = async () => {
    if (!form.emailAddress) return showToast('Email address is required', 'error');
    setCreating(true);
    try {
      const res = await warmupAPI.create({
        teamId: team?.id, userId: user?.id,
        emailAddress: form.emailAddress,
        name: form.name || `Warmup for ${form.emailAddress}`,
        totalDays: parseInt(form.totalDays) || 30,
      });
      showToast('Warmup schedule created with AI optimization!', 'success');
      setShowModal(false);
      setForm({ emailAddress: '', name: '', totalDays: '30' });
      setSelectedSchedule(res.data);
      fetchSchedules();
    } catch (error) {
      showToast('Failed to create warmup schedule', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleAdvance = async (id: string) => {
    try {
      await warmupAPI.advance(id);
      showToast('Advanced to next day', 'success');
      fetchSchedules();
    } catch (error) {
      showToast('Failed to advance schedule', 'error');
    }
  };

  const getProgressPercent = (schedule: any) =>
    Math.round((schedule.current_day / schedule.total_days) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" /> Email Warmup Scheduler
          </h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered email domain warm-up to maximize deliverability</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" /> New Warmup Schedule
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-orange-800">Why warm up your domain?</p>
          <p className="text-sm text-orange-700 mt-1">
            New domains and email addresses need to build a sending reputation gradually. Our AI creates an optimized ramp-up curve
            that maximizes deliverability while minimizing spam filter risk.
          </p>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedSchedule && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{selectedSchedule.name}</h2>
            <span className="text-sm text-gray-500">AI-generated warmup curve</span>
          </div>
          {selectedSchedule.aiSchedule?.recommendations && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">AI Recommendations</h3>
              <ul className="space-y-1">
                {selectedSchedule.aiSchedule.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selectedSchedule.aiSchedule?.dailySchedule && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Daily Volume Curve</h3>
              <div className="grid grid-cols-7 gap-1">
                {selectedSchedule.aiSchedule.dailySchedule.slice(0, 28).map((day: any) => (
                  <div key={day.day} className="text-center">
                    <div
                      className="bg-orange-400 rounded mx-auto"
                      style={{ height: `${Math.max(4, (day.volume / 200) * 60)}px`, width: '100%', maxWidth: '20px' }}
                      title={`Day ${day.day}: ${day.volume} emails`}
                    />
                    {day.day % 7 === 0 && (
                      <p className="text-xs text-gray-400 mt-1">D{day.day}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedules List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <SkeletonTable rows={4} columns={5} />
        ) : schedules.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Flame className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No warmup schedules yet</p>
            <p className="text-sm">Create one to start building your domain reputation</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
            >
              Create Schedule
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Name / Email</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Progress</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Current Volume</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map(schedule => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{schedule.name}</p>
                    <p className="text-xs text-gray-400">{schedule.email_address}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      schedule.status === 'active' ? 'bg-green-100 text-green-700' :
                      schedule.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {schedule.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all"
                          style={{ width: `${getProgressPercent(schedule)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">Day {schedule.current_day}/{schedule.total_days}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{schedule.daily_limit} emails/day</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedSchedule(schedule)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        View
                      </button>
                      {schedule.status === 'active' && (
                        <button
                          onClick={() => handleAdvance(schedule.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
                        >
                          <ChevronRight className="h-3 w-3" /> Advance Day
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={20} onPageChange={setPage} />}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" /> Create AI Warmup Schedule
            </h2>
            <p className="text-sm text-gray-500 mb-4">Our AI will generate an optimized daily sending curve</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email *</label>
                <input
                  type="email"
                  value={form.emailAddress}
                  onChange={e => setForm(f => ({ ...f, emailAddress: e.target.value }))}
                  placeholder="outreach@yourcompany.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Q2 Outreach Warmup"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warmup Duration</label>
                <select
                  value={form.totalDays}
                  onChange={e => setForm(f => ({ ...f, totalDays: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                >
                  <option value="14">14 days (Quick)</option>
                  <option value="30">30 days (Recommended)</option>
                  <option value="45">45 days (Thorough)</option>
                  <option value="60">60 days (Maximum)</option>
                </select>
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
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {creating ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Generating AI Schedule...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Create Schedule</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIWarmupScheduler;
