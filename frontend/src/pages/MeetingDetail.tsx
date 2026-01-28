import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Calendar, Clock, Video, User, Building, Mail, DollarSign, CheckCircle, XCircle, Save } from 'lucide-react';

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
  notes: string;
  revenuePotential: number;
  contact: { id: string; name: string; company: string; email: string; title: string } | null;
  user: { id: string; name: string } | null;
  createdAt: string;
}

const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, team } = useAuth();
  const isNew = id === 'new';
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingType: 'discovery',
    scheduledAt: '',
    durationMinutes: 30,
    location: '',
    meetingLink: '',
    revenuePotential: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && !isNew) {
      fetchMeeting();
    }
  }, [id, isNew]);

  const fetchMeeting = async () => {
    try {
      const response = await meetingsAPI.getById(id!);
      setMeeting(response.data);
    } catch (error) {
      console.error('Error fetching meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team?.id) return;

    setSaving(true);
    try {
      const response = await meetingsAPI.create({
        teamId: team.id,
        userId: user?.id,
        ...formData,
      });
      navigate(`/meetings/${response.data.id}`);
    } catch (error) {
      console.error('Error creating meeting:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (outcome: string) => {
    try {
      await meetingsAPI.complete(meeting!.id, { outcome, notes: '' });
      fetchMeeting();
    } catch (error) {
      console.error('Error completing meeting:', error);
    }
  };

  const handleCancel = async () => {
    try {
      await meetingsAPI.cancel(meeting!.id);
      fetchMeeting();
    } catch (error) {
      console.error('Error cancelling meeting:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return <div className="loading">Loading meeting...</div>;
  }

  if (isNew) {
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => navigate('/meetings')} style={{ marginBottom: '20px' }}>
          <ArrowLeft size={18} /> Back to Meetings
        </button>

        <div className="card">
          <h2 style={{ fontWeight: '600', marginBottom: '24px' }}>Schedule New Meeting</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Meeting Title *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Discovery Call with Acme Corp"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-input"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Meeting agenda and notes"
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Meeting Type</label>
                <select
                  name="meetingType"
                  className="form-input"
                  value={formData.meetingType}
                  onChange={handleInputChange}
                >
                  <option value="discovery">Discovery</option>
                  <option value="demo">Demo</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closing">Closing</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <select
                  name="durationMinutes"
                  className="form-input"
                  value={formData.durationMinutes}
                  onChange={handleInputChange}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Scheduled Date & Time *</label>
              <input
                type="datetime-local"
                name="scheduledAt"
                className="form-input"
                value={formData.scheduledAt}
                onChange={handleInputChange}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  name="location"
                  className="form-input"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Office address or 'Virtual'"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Meeting Link</label>
                <input
                  type="url"
                  name="meetingLink"
                  className="form-input"
                  value={formData.meetingLink}
                  onChange={handleInputChange}
                  placeholder="https://zoom.us/j/..."
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Revenue Potential ($)</label>
              <input
                type="number"
                name="revenuePotential"
                className="form-input"
                value={formData.revenuePotential}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving || !formData.title || !formData.scheduledAt}>
                <Save size={18} />
                {saving ? 'Scheduling...' : 'Schedule Meeting'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/meetings')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return <div>Meeting not found</div>;
  }

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/meetings')} style={{ marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Back to Meetings
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{meeting.title}</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{meeting.meetingType.replace('_', ' ')} Meeting</p>
        </div>
        {meeting.status === 'scheduled' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleCancel}>
              <XCircle size={18} /> Cancel
            </button>
            <button className="btn btn-primary" onClick={() => handleComplete('positive')}>
              <CheckCircle size={18} /> Mark Complete
            </button>
          </div>
        )}
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Meeting Details</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={20} color="#6b7280" />
                <div>
                  <div style={{ fontWeight: '500' }}>{formatDate(meeting.scheduledAt)}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>{formatTime(meeting.scheduledAt)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={20} color="#6b7280" />
                <span>{meeting.durationMinutes} minutes</span>
              </div>

              {meeting.meetingLink && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Video size={20} color="#6b7280" />
                  <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                    Join Meeting
                  </a>
                </div>
              )}

              {meeting.revenuePotential > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <DollarSign size={20} color="#6b7280" />
                  <span style={{ fontWeight: '500' }}>${meeting.revenuePotential.toLocaleString()} potential</span>
                </div>
              )}

              <div style={{
                marginTop: '8px',
                padding: '12px',
                background: meeting.status === 'completed' ? '#dcfce7' : meeting.status === 'cancelled' ? '#fee2e2' : '#dbeafe',
                borderRadius: '8px'
              }}>
                <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                  Status: {meeting.status}
                </span>
                {meeting.outcome && (
                  <span style={{ marginLeft: '12px', textTransform: 'capitalize' }}>
                    | Outcome: {meeting.outcome}
                  </span>
                )}
              </div>
            </div>
          </div>

          {meeting.description && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Description</h3>
              <p style={{ color: '#6b7280', lineHeight: '1.6' }}>{meeting.description}</p>
            </div>
          )}

          {meeting.notes && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Notes</h3>
              <p style={{ color: '#6b7280', lineHeight: '1.6' }}>{meeting.notes}</p>
            </div>
          )}
        </div>

        <div>
          {meeting.contact && (
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Contact</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <User size={20} color="#6b7280" />
                  <div>
                    <div style={{ fontWeight: '500' }}>{meeting.contact.name}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>{meeting.contact.title}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Building size={20} color="#6b7280" />
                  <span>{meeting.contact.company}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Mail size={20} color="#6b7280" />
                  <a href={`mailto:${meeting.contact.email}`} style={{ color: '#2563eb' }}>
                    {meeting.contact.email}
                  </a>
                </div>
              </div>

              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '20px' }}
                onClick={() => navigate(`/contacts/${meeting.contact!.id}`)}
              >
                View Contact Profile
              </button>
            </div>
          )}

          {meeting.user && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Host</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  color: '#4338ca'
                }}>
                  {meeting.user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span style={{ fontWeight: '500' }}>{meeting.user.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingDetail;
