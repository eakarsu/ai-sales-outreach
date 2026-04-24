import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { aiAPI, contactsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';
import {
  Clock, Calendar, Sun, Moon, Plus, Eye, Trash2, Sparkles, Globe, TrendingUp, Search
} from 'lucide-react';

interface BestTime {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  company: string;
  jobTitle: string;
  bestDay: string;
  bestTimeStart: string;
  bestTimeEnd: string;
  timezone: string;
  confidence: number;
  optimalFrequency: string;
  avoidTimes: string[];
  industryInsights: string;
  createdAt: string;
}

const AIBestTime: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [bestTimes, setBestTimes] = useState<BestTime[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (team?.id) {
      fetchData();
    }
  }, [team?.id]);

  const fetchData = async () => {
    try {
      const [timesRes, contactsRes] = await Promise.all([
        aiAPI.getBestTimes(team!.id),
        contactsAPI.getAll({ teamId: team!.id })
      ]);
      setBestTimes(timesRes.data);
      setContacts(contactsRes.data.contacts || []);
    } catch (error) {
      showToast('Error fetching best time predictions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    if (!selectedContact) return;
    setPredicting(true);
    try {
      await aiAPI.predictBestTime({ teamId: team!.id, contactId: selectedContact });
      await fetchData();
      setShowModal(false);
      setSelectedContact('');
      showToast('Best time predicted successfully', 'success');
    } catch (error) {
      showToast('Error predicting best time', 'error');
    } finally {
      setPredicting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this prediction?')) {
      try {
        await aiAPI.deleteBestTime(id);
        setBestTimes(bestTimes.filter(bt => bt.id !== id));
        showToast('Prediction deleted successfully', 'success');
      } catch (error) {
        showToast('Error deleting prediction', 'error');
      }
    }
  };

  const getDayColor = (day: string) => {
    const colors: Record<string, string> = {
      Monday: '#3b82f6', Tuesday: '#16a34a', Wednesday: '#7c3aed',
      Thursday: '#f97316', Friday: '#ec4899', Saturday: '#6b7280', Sunday: '#6b7280'
    };
    return colors[day] || '#6b7280';
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const filteredBestTimes = bestTimes.filter(bt => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      bt.contactName?.toLowerCase().includes(query) ||
      bt.contactEmail?.toLowerCase().includes(query) ||
      bt.company?.toLowerCase().includes(query) ||
      bt.bestDay?.toLowerCase().includes(query) ||
      bt.timezone?.toLowerCase().includes(query) ||
      bt.optimalFrequency?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Best Time Predictor</h1>
            <p className="page-subtitle">Optimize outreach timing for maximum engagement</p>
          </div>
        </div>
        <SkeletonTable rows={8} columns={5} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Best Time Predictor</h1>
          <p className="page-subtitle">Optimize outreach timing for maximum engagement</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Predict Best Time
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon blue"><Clock size={20} /></div>
          <div className="stat-value">{bestTimes.length}</div>
          <div className="stat-label">Time Predictions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={20} /></div>
          <div className="stat-value">{Math.round(bestTimes.reduce((sum, bt) => sum + bt.confidence, 0) / bestTimes.length || 0)}%</div>
          <div className="stat-label">Avg Confidence</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Calendar size={20} /></div>
          <div className="stat-value">{bestTimes.filter(bt => bt.bestDay === 'Tuesday' || bt.bestDay === 'Wednesday').length}</div>
          <div className="stat-label">Mid-Week Optimal</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Sun size={20} /></div>
          <div className="stat-value">{bestTimes.filter(bt => parseInt(bt.bestTimeStart?.split(':')[0] || '12') < 12).length}</div>
          <div className="stat-label">Morning Preferred</div>
        </div>
      </div>

      {/* Search Box */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, company, day, or timezone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Best Times Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredBestTimes.map(bt => (
          <div key={bt.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/ai/best-times/${bt.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{bt.contactName}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{bt.company}</div>
              </div>
              <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                {bt.confidence}% confident
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{
                flex: 1, textAlign: 'center', padding: '16px', borderRadius: '12px',
                background: `${getDayColor(bt.bestDay)}15`, border: `2px solid ${getDayColor(bt.bestDay)}30`
              }}>
                <Calendar size={24} style={{ color: getDayColor(bt.bestDay), marginBottom: '8px' }} />
                <div style={{ fontWeight: '600', color: getDayColor(bt.bestDay) }}>{bt.bestDay}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Best Day</div>
              </div>
              <div style={{
                flex: 1, textAlign: 'center', padding: '16px', borderRadius: '12px',
                background: '#faf5ff', border: '2px solid #e9d5ff'
              }}>
                <Clock size={24} style={{ color: '#7c3aed', marginBottom: '8px' }} />
                <div style={{ fontWeight: '600', color: '#7c3aed' }}>{formatTime(bt.bestTimeStart)} - {formatTime(bt.bestTimeEnd)}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Optimal Window</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#6b7280', fontSize: '13px' }}>
              <Globe size={14} />
              {bt.timezone}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Frequency</div>
              <div style={{ fontWeight: '500' }}>{bt.optimalFrequency}</div>
            </div>

            {bt.avoidTimes && bt.avoidTimes.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '6px' }}>Avoid</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {bt.avoidTimes.slice(0, 3).map((time, i) => (
                    <span key={i} style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: '12px', fontSize: '11px' }}>
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => navigate(`/ai/best-times/${bt.id}`)}>
                <Eye size={16} />
              </button>
              <button className="btn btn-secondary" style={{ padding: '6px', color: '#dc2626' }} onClick={() => handleDelete(bt.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {filteredBestTimes.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            {searchQuery ? 'No predictions match your search.' : 'No predictions yet. Predict your first best time!'}
          </div>
        )}
      </div>

      {/* Predict Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '20px' }}>Predict Best Contact Time</h2>
            <div className="form-group">
              <label className="form-label">Select Contact</label>
              <select
                className="form-input"
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
              >
                <option value="">Choose a contact...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} - {c.company}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePredict} disabled={!selectedContact || predicting}>
                <Sparkles size={18} />
                {predicting ? 'Analyzing...' : 'Predict with AI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIBestTime;
