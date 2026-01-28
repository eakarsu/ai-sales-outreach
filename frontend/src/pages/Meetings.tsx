import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { meetingsAPI } from '../services/api';
import { Calendar, Plus, Video, Clock, DollarSign, CheckCircle, XCircle, User } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  description: string;
  meetingType: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string;
  meetingLink: string;
  outcome: string;
  revenuePotential: number;
  contact: { id: string; name: string; company: string } | null;
  user: { id: string; name: string } | null;
  createdAt: string;
}

const Meetings: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (team?.id) {
      fetchMeetings();
    }
  }, [team?.id]);

  const fetchMeetings = async () => {
    try {
      const response = await meetingsAPI.getAll({ teamId: team?.id });
      setMeetings(response.data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      scheduled: { bg: '#dbeafe', color: '#2563eb' },
      completed: { bg: '#dcfce7', color: '#16a34a' },
      cancelled: { bg: '#fee2e2', color: '#dc2626' },
      no_show: { bg: '#fef3c7', color: '#d97706' },
    };
    const style = styles[status] || styles.scheduled;
    return (
      <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', background: style.bg, color: style.color }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getOutcomeBadge = (outcome: string) => {
    if (!outcome) return null;
    const styles: Record<string, { bg: string; color: string }> = {
      positive: { bg: '#dcfce7', color: '#16a34a' },
      neutral: { bg: '#f3f4f6', color: '#6b7280' },
      negative: { bg: '#fee2e2', color: '#dc2626' },
    };
    const style = styles[outcome] || styles.neutral;
    return (
      <span style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '500', background: style.bg, color: style.color }}>
        {outcome}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const filteredMeetings = meetings.filter(m => filter === 'all' || m.status === filter);

  const stats = {
    total: meetings.length,
    scheduled: meetings.filter(m => m.status === 'scheduled').length,
    completed: meetings.filter(m => m.status === 'completed').length,
    totalPipeline: meetings.reduce((sum, m) => sum + m.revenuePotential, 0),
  };

  if (loading) {
    return <div className="loading">Loading meetings...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="page-subtitle">Track and manage your sales meetings</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/meetings/new')}>
          <Plus size={18} />
          Schedule Meeting
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#ede9fe' }}><Calendar size={24} color="#7c3aed" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Meetings</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('scheduled')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dbeafe' }}><Clock size={24} color="#2563eb" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.scheduled}</div>
            <div className="stat-label">Scheduled</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('completed')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dcfce7' }}><CheckCircle size={24} color="#16a34a" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fef3c7' }}><DollarSign size={24} color="#d97706" /></div>
          <div className="stat-content">
            <div className="stat-value">${(stats.totalPipeline / 1000).toFixed(0)}K</div>
            <div className="stat-label">Pipeline Value</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {['all', 'scheduled', 'completed', 'cancelled'].map(f => (
              <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Meeting</th>
              <th>Contact</th>
              <th>Date & Time</th>
              <th>Type</th>
              <th>Status</th>
              <th>Outcome</th>
              <th>Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {filteredMeetings.map(meeting => (
              <tr key={meeting.id} onClick={() => navigate(`/meetings/${meeting.id}`)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ fontWeight: '500' }}>{meeting.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {meeting.durationMinutes} min
                  </div>
                </td>
                <td>
                  {meeting.contact ? (
                    <div>
                      <div style={{ fontWeight: '500' }}>{meeting.contact.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{meeting.contact.company}</div>
                    </div>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>No contact</span>
                  )}
                </td>
                <td>
                  <div>{formatDate(meeting.scheduledAt)}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatTime(meeting.scheduledAt)}</div>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{meeting.meetingType.replace('_', ' ')}</td>
                <td>{getStatusBadge(meeting.status)}</td>
                <td>{getOutcomeBadge(meeting.outcome)}</td>
                <td style={{ fontWeight: '500' }}>
                  {meeting.revenuePotential > 0 ? `$${meeting.revenuePotential.toLocaleString()}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMeetings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No meetings found
          </div>
        )}
      </div>
    </div>
  );
};

export default Meetings;
