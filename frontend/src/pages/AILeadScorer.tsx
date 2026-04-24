import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { aiAPI, contactsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';
import {
  Target, TrendingUp, AlertTriangle, CheckCircle, Clock, Plus,
  Search, RefreshCw, Trash2, Eye, Sparkles, DollarSign
} from 'lucide-react';

interface LeadScore {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  company: string;
  jobTitle: string;
  score: number;
  confidence: number;
  engagementLevel: string;
  buyingSignals: string[];
  riskFactors: string[];
  nextBestAction: string;
  predictedDealValue: number;
  createdAt: string;
}

const AILeadScorer: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [selectedContact, setSelectedContact] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (team?.id) {
      fetchData();
    }
  }, [team?.id]);

  const fetchData = async () => {
    try {
      const [scoresRes, contactsRes] = await Promise.all([
        aiAPI.getLeadScores(team!.id),
        contactsAPI.getAll({ teamId: team!.id })
      ]);
      setLeadScores(scoresRes.data);
      setContacts(contactsRes.data.contacts || []);
    } catch (error) {
      showToast('Error fetching lead scores', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreLead = async () => {
    if (!selectedContact) return;
    setScoring(true);
    try {
      await aiAPI.scoreLead({ teamId: team!.id, contactId: selectedContact });
      await fetchData();
      setShowModal(false);
      setSelectedContact('');
      showToast('Lead scored successfully', 'success');
    } catch (error) {
      showToast('Error scoring lead', 'error');
    } finally {
      setScoring(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead score?')) {
      try {
        await aiAPI.deleteLeadScore(id);
        setLeadScores(leadScores.filter(ls => ls.id !== id));
        showToast('Lead score deleted successfully', 'success');
      } catch (error) {
        showToast('Error deleting lead score', 'error');
      }
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#dc2626';
  };

  const getEngagementBadge = (level: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      hot: { bg: '#fef2f2', color: '#dc2626' },
      warm: { bg: '#fefce8', color: '#ca8a04' },
      engaged: { bg: '#f0fdf4', color: '#16a34a' },
      cool: { bg: '#eff6ff', color: '#2563eb' },
      cold: { bg: '#f3f4f6', color: '#6b7280' }
    };
    const style = styles[level] || styles.cold;
    return (
      <span style={{ background: style.bg, color: style.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
        {level}
      </span>
    );
  };

  const filteredLeadScores = leadScores.filter(ls => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ls.contactName?.toLowerCase().includes(query) ||
      ls.contactEmail?.toLowerCase().includes(query) ||
      ls.company?.toLowerCase().includes(query) ||
      ls.jobTitle?.toLowerCase().includes(query) ||
      ls.engagementLevel?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Lead Scorer</h1>
            <p className="page-subtitle">AI-powered lead scoring and prioritization</p>
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
          <h1 className="page-title">AI Lead Scorer</h1>
          <p className="page-subtitle">AI-powered lead scoring and prioritization</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Score New Lead
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon green"><Target size={20} /></div>
          <div className="stat-value">{leadScores.filter(ls => ls.score >= 80).length}</div>
          <div className="stat-label">Hot Leads</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><TrendingUp size={20} /></div>
          <div className="stat-value">{leadScores.filter(ls => ls.score >= 60 && ls.score < 80).length}</div>
          <div className="stat-label">Warm Leads</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Clock size={20} /></div>
          <div className="stat-value">{leadScores.filter(ls => ls.score < 60).length}</div>
          <div className="stat-label">Nurture Queue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><DollarSign size={20} /></div>
          <div className="stat-value">${leadScores.reduce((sum, ls) => sum + ls.predictedDealValue, 0).toLocaleString()}</div>
          <div className="stat-label">Predicted Pipeline</div>
        </div>
      </div>

      {/* Search Box */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, email, company, or engagement level..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Lead Scores Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Company</th>
                <th>Score</th>
                <th>Engagement</th>
                <th>Signals</th>
                <th>Predicted Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeadScores.map(ls => (
                <tr key={ls.id} onClick={() => navigate(`/ai/lead-scores/${ls.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontWeight: '500' }}>{ls.contactName}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{ls.contactEmail}</div>
                  </td>
                  <td>
                    <div>{ls.company}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{ls.jobTitle}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: `conic-gradient(${getScoreColor(ls.score)} ${ls.score * 3.6}deg, #e5e7eb 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%', background: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '14px', color: getScoreColor(ls.score)
                        }}>
                          {ls.score}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{getEngagementBadge(ls.engagementLevel)}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {ls.buyingSignals.slice(0, 2).map((signal, i) => (
                        <span key={i} style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          {signal}
                        </span>
                      ))}
                      {ls.buyingSignals.length > 2 && (
                        <span style={{ color: '#6b7280', fontSize: '11px' }}>+{ls.buyingSignals.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: '600', color: '#16a34a' }}>${ls.predictedDealValue.toLocaleString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => navigate(`/ai/lead-scores/${ls.id}`)}>
                        <Eye size={16} />
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px', color: '#dc2626' }} onClick={() => handleDelete(ls.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeadScores.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    {searchQuery ? 'No lead scores match your search.' : 'No lead scores yet. Score your first lead!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '20px' }}>Score Lead with AI</h2>
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
              <button className="btn btn-primary" onClick={handleScoreLead} disabled={!selectedContact || scoring}>
                <Sparkles size={18} />
                {scoring ? 'Scoring...' : 'Score with AI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AILeadScorer;
