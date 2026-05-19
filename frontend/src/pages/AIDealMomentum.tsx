import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { aiAPI, contactsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';
import { Activity, TrendingUp, TrendingDown, Plus, RefreshCw, Trash2, Calendar, AlertCircle } from 'lucide-react';

interface Momentum {
  id: string;
  contactId: string;
  contactName: string;
  company: string;
  currentMomentum: string; // 'accelerating' | 'steady' | 'cooling' | 'stalled'
  momentumScore: number;
  emailVelocity: number;
  replyLag: number;
  closeProbability: number;
  predictedCloseDate: string;
  weeklyTrend: number[];
  alerts: string[];
  recommendations: string[];
  createdAt: string;
}

const AIDealMomentum: React.FC = () => {
  const { team } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<Momentum[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [contactId, setContactId] = useState('');

  useEffect(() => {
    if (team?.id) load();
  }, [team?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([
        aiAPI.getMomentumScores(team!.id),
        contactsAPI.getAll({ teamId: team!.id })
      ]);
      setItems(m.data || []);
      setContacts(c.data?.contacts || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCalc = async () => {
    if (!contactId) return showToast('Select a contact', 'error');
    setCalculating(true);
    try {
      await aiAPI.calculateMomentum({ teamId: team!.id, contactId });
      showToast('Momentum calculated', 'success');
      setShowModal(false);
      setContactId('');
      load();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed', 'error');
    } finally {
      setCalculating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete?')) return;
    try {
      await aiAPI.deleteMomentum(id);
      load();
    } catch {
      showToast('Failed', 'error');
    }
  };

  const momentumIcon = (m: string) => {
    if (m === 'accelerating') return <TrendingUp size={14} color="#22c55e" />;
    if (m === 'cooling' || m === 'stalled') return <TrendingDown size={14} color="#ef4444" />;
    return <Activity size={14} color="#3b82f6" />;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Activity size={24} /> Deal Momentum Indicator</h1>
          <p>Track email velocity and reply lag to predict close probability week-by-week.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Calculate Momentum
        </button>
      </div>

      {loading ? <SkeletonTable rows={5} /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Contact</th><th>Company</th><th>Momentum</th><th>Score</th>
                <th>Email Velocity</th><th>Reply Lag</th><th>Close %</th><th>Predicted Close</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32 }}>No momentum data yet</td></tr>
              ) : items.map(m => (
                <tr key={m.id}>
                  <td>{m.contactName}</td>
                  <td>{m.company}</td>
                  <td>{momentumIcon(m.currentMomentum)} {m.currentMomentum}</td>
                  <td><strong>{m.momentumScore}/100</strong></td>
                  <td>{m.emailVelocity?.toFixed(1)}/wk</td>
                  <td>{m.replyLag?.toFixed(1)} days</td>
                  <td>{m.closeProbability}%</td>
                  <td><Calendar size={12} /> {m.predictedCloseDate ? new Date(m.predictedCloseDate).toLocaleDateString() : '-'}</td>
                  <td>
                    <button className="icon-btn" onClick={() => handleDelete(m.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.some(i => i.alerts?.length > 0) && (
        <div className="alerts-section">
          <h3><AlertCircle size={20} /> Active Alerts</h3>
          {items.flatMap(i => (i.alerts || []).map((a, j) => (
            <div key={`${i.id}-${j}`} className="alert">
              <strong>{i.contactName}:</strong> {a}
            </div>
          )))}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2><RefreshCw size={20} /> Calculate Momentum</h2></div>
            <div className="modal-body">
              <div className="form-group">
                <label>Contact *</label>
                <select value={contactId} onChange={e => setContactId(e.target.value)}>
                  <option value="">Select contact...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.company})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCalc} disabled={calculating}>
                {calculating ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIDealMomentum;
