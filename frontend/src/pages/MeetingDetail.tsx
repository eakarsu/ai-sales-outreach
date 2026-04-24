import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard } from '../components/Skeleton';
import {
  ArrowLeft, Calendar, Clock, Video, User, Building, Mail, DollarSign,
  CheckCircle, XCircle, Save, Edit, Trash2, X
} from 'lucide-react';

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
  const { showToast } = useToast();
  const isNew = id === 'new';
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [editing, setEditing] = useState(isNew);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingType: 'discovery',
    scheduledAt: '',
    durationMinutes: 30,
    location: '',
    meetingLink: '',
    revenuePotential: 0,
    notes: '',
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
      setFormData({
        title: response.data.title || '',
        description: response.data.description || '',
        meetingType: response.data.meetingType || 'discovery',
        scheduledAt: response.data.scheduledAt ? new Date(response.data.scheduledAt).toISOString().slice(0, 16) : '',
        durationMinutes: response.data.durationMinutes || 30,
        location: response.data.location || '',
        meetingLink: response.data.meetingLink || '',
        revenuePotential: response.data.revenuePotential || 0,
        notes: response.data.notes || '',
      });
    } catch (error) {
      showToast('Failed to load meeting', 'error');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team?.id) return;

    setSaving(true);
    try {
      if (isNew) {
        const response = await meetingsAPI.create({
          teamId: team.id,
          userId: user?.id,
          ...formData,
        });
        showToast('Meeting created successfully', 'success');
        navigate(`/meetings/${response.data.id}`);
      } else {
        await meetingsAPI.update(id!, formData);
        const response = await meetingsAPI.getById(id!);
        setMeeting(response.data);
        setEditing(false);
        showToast('Meeting updated successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to save meeting', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await meetingsAPI.delete(id!);
      showToast('Meeting deleted successfully', 'success');
      navigate('/meetings');
    } catch { showToast('Failed to delete meeting', 'error'); }
  };

  const handleComplete = async (outcome: string) => {
    try {
      await meetingsAPI.complete(meeting!.id, { outcome, notes: '' });
      showToast('Meeting marked as completed', 'success');
      fetchMeeting();
    } catch (error) {
      showToast('Failed to complete meeting', 'error');
    }
  };

  const handleCancel = async () => {
    try {
      await meetingsAPI.cancel(meeting!.id);
      showToast('Meeting cancelled', 'success');
      fetchMeeting();
    } catch (error) {
      showToast('Failed to cancel meeting', 'error');
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
    return (
      <div style={{ padding: '24px' }}>
        <SkeletonCard />
        <div style={{ marginTop: '24px' }}><SkeletonCard /></div>
      </div>
    );
  }

  if (isNew || editing) {
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => editing && !isNew ? setEditing(false) : navigate('/meetings')}
          style={{ marginBottom: '24px' }}>
          <ArrowLeft size={18} /> {isNew ? 'Back to Meetings' : 'Cancel Editing'}
        </button>

        <div className="card">
          <h2 style={{ fontWeight: '600', marginBottom: '24px' }}>{isNew ? 'Schedule New Meeting' : 'Edit Meeting'}</h2>
          <form onSubmit={handleSave}>
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
                <select name="meetingType" className="form-input" value={formData.meetingType} onChange={handleInputChange}>
                  <option value="discovery">Discovery</option>
                  <option value="demo">Demo</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closing">Closing</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <select name="durationMinutes" className="form-input" value={formData.durationMinutes} onChange={handleInputChange}>
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
                <input type="text" name="location" className="form-input" value={formData.location}
                  onChange={handleInputChange} placeholder="Office address or 'Virtual'" />
              </div>
              <div className="form-group">
                <label className="form-label">Meeting Link</label>
                <input type="url" name="meetingLink" className="form-input" value={formData.meetingLink}
                  onChange={handleInputChange} placeholder="https://zoom.us/j/..." />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Revenue Potential ($)</label>
              <input type="number" name="revenuePotential" className="form-input" value={formData.revenuePotential}
                onChange={handleInputChange} placeholder="0" min="0" />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea name="notes" className="form-input" value={formData.notes}
                onChange={handleInputChange} placeholder="Additional notes..." rows={3} />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving || !formData.title || !formData.scheduledAt}>
                <Save size={18} />
                {saving ? 'Saving...' : isNew ? 'Schedule Meeting' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary"
                onClick={() => isNew ? navigate('/meetings') : setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return <div className="empty-state">Meeting not found</div>;
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
        <div style={{ display: 'flex', gap: '12px' }}>
          {meeting.status === 'scheduled' && (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>
                <XCircle size={18} /> Cancel
              </button>
              <button className="btn btn-primary" onClick={() => handleComplete('positive')}>
                <CheckCircle size={18} /> Mark Complete
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>
            <Edit size={18} /> Edit
          </button>
          <button className="btn btn-danger" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 size={18} /> Delete
          </button>
        </div>
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

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Meeting"
        message={`Are you sure you want to delete "${meeting.title}"? This action cannot be undone.`}
        confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleDelete} onCancel={() => setShowDeleteDialog(false)} />
    </div>
  );
};

export default MeetingDetail;
