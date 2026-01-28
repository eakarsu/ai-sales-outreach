import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { sequencesAPI } from '../services/api';
import { GitBranch, Play, Pause, Plus, Users, CheckCircle, TrendingUp } from 'lucide-react';

interface Sequence {
  id: string;
  name: string;
  description: string;
  status: string;
  triggerType: string;
  totalContacts: number;
  activeContacts: number;
  completedContacts: number;
  conversionRate: number;
  stepCount: number;
  createdBy: string;
  createdAt: string;
}

const Sequences: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (team?.id) {
      fetchSequences();
    }
  }, [team?.id]);

  const fetchSequences = async () => {
    try {
      const response = await sequencesAPI.getAll({ teamId: team?.id });
      setSequences(response.data);
    } catch (error) {
      console.error('Error fetching sequences:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      active: { bg: '#dcfce7', color: '#16a34a' },
      paused: { bg: '#fef3c7', color: '#d97706' },
      completed: { bg: '#dbeafe', color: '#2563eb' },
      draft: { bg: '#f3f4f6', color: '#6b7280' },
    };
    const style = styles[status] || styles.draft;
    return (
      <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', background: style.bg, color: style.color }}>
        {status}
      </span>
    );
  };

  const filteredSequences = sequences.filter(s => filter === 'all' || s.status === filter);

  const stats = {
    total: sequences.length,
    active: sequences.filter(s => s.status === 'active').length,
    totalContacts: sequences.reduce((sum, s) => sum + s.totalContacts, 0),
    avgConversion: sequences.length > 0 ? (sequences.reduce((sum, s) => sum + s.conversionRate, 0) / sequences.length).toFixed(1) : 0,
  };

  if (loading) {
    return <div className="loading">Loading sequences...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sequences</h1>
          <p className="page-subtitle">Automated email drip campaigns</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/sequences/new')}>
          <Plus size={18} />
          New Sequence
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#ede9fe' }}><GitBranch size={24} color="#7c3aed" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Sequences</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('active')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dcfce7' }}><Play size={24} color="#16a34a" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/contacts')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dbeafe' }}><Users size={24} color="#2563eb" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalContacts.toLocaleString()}</div>
            <div className="stat-label">Total Contacts</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fef3c7' }}><TrendingUp size={24} color="#d97706" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.avgConversion}%</div>
            <div className="stat-label">Avg Conversion</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {['all', 'active', 'paused', 'draft'].map(f => (
              <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Trigger</th>
              <th>Steps</th>
              <th>Active</th>
              <th>Completed</th>
              <th>Conversion</th>
            </tr>
          </thead>
          <tbody>
            {filteredSequences.map(sequence => (
              <tr key={sequence.id} onClick={() => navigate(`/sequences/${sequence.id}`)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ fontWeight: '500' }}>{sequence.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{sequence.description}</div>
                </td>
                <td>{getStatusBadge(sequence.status)}</td>
                <td style={{ textTransform: 'capitalize' }}>{sequence.triggerType.replace('_', ' ')}</td>
                <td>{sequence.stepCount} steps</td>
                <td>{sequence.activeContacts}</td>
                <td>{sequence.completedContacts}</td>
                <td style={{ fontWeight: '500', color: sequence.conversionRate > 20 ? '#16a34a' : '#6b7280' }}>
                  {sequence.conversionRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSequences.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No sequences found
          </div>
        )}
      </div>
    </div>
  );
};

export default Sequences;
