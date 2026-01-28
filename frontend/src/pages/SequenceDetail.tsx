import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sequencesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Play, Pause, Mail, Clock, Users, CheckCircle, TrendingUp, Save } from 'lucide-react';

interface SequenceStep {
  id: string;
  stepNumber: number;
  stepType: string;
  templateName: string;
  delayDays: number;
  delayHours: number;
  sentCount: number;
  openCount: number;
  replyCount: number;
}

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
  createdBy: string;
  createdAt: string;
  steps: SequenceStep[];
}

const SequenceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, team } = useAuth();
  const isNew = id === 'new';
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'manual',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && !isNew) {
      fetchSequence();
    }
  }, [id, isNew]);

  const fetchSequence = async () => {
    try {
      const response = await sequencesAPI.getById(id!);
      setSequence(response.data);
    } catch (error) {
      console.error('Error fetching sequence:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team?.id) return;

    setSaving(true);
    try {
      const response = await sequencesAPI.create({
        teamId: team.id,
        createdBy: user?.id,
        ...formData,
      });
      navigate(`/sequences/${response.data.id}`);
    } catch (error) {
      console.error('Error creating sequence:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!sequence) return;
    try {
      if (sequence.status === 'active') {
        await sequencesAPI.pause(sequence.id);
      } else {
        await sequencesAPI.activate(sequence.id);
      }
      fetchSequence();
    } catch (error) {
      console.error('Error updating sequence:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading sequence...</div>;
  }

  if (isNew) {
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => navigate('/sequences')} style={{ marginBottom: '20px' }}>
          <ArrowLeft size={18} /> Back to Sequences
        </button>

        <div className="card">
          <h2 style={{ fontWeight: '600', marginBottom: '24px' }}>Create New Sequence</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Sequence Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., New Customer Onboarding"
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
                placeholder="Describe the purpose of this sequence"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trigger Type</label>
              <select
                name="triggerType"
                className="form-input"
                value={formData.triggerType}
                onChange={handleInputChange}
              >
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
                <option value="event_based">Event Based</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving || !formData.name}>
                <Save size={18} />
                {saving ? 'Creating...' : 'Create Sequence'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/sequences')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!sequence) {
    return <div>Sequence not found</div>;
  }

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/sequences')} style={{ marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Back to Sequences
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{sequence.name}</h1>
          <p className="page-subtitle">{sequence.description}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleToggleStatus}>
            {sequence.status === 'active' ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Activate</>}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}><Users size={24} color="#2563eb" /></div>
          <div className="stat-content">
            <div className="stat-value">{sequence.totalContacts}</div>
            <div className="stat-label">Total Contacts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7' }}><Play size={24} color="#16a34a" /></div>
          <div className="stat-content">
            <div className="stat-value">{sequence.activeContacts}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ede9fe' }}><CheckCircle size={24} color="#7c3aed" /></div>
          <div className="stat-content">
            <div className="stat-value">{sequence.completedContacts}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}><TrendingUp size={24} color="#d97706" /></div>
          <div className="stat-content">
            <div className="stat-value">{sequence.conversionRate}%</div>
            <div className="stat-label">Conversion Rate</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Sequence Steps</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sequence.steps.map((step, index) => (
            <div key={step.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#2563eb',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                flexShrink: 0
              }}>
                {step.stepNumber}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Mail size={16} color="#6b7280" />
                  <span style={{ fontWeight: '500' }}>{step.templateName || 'Email'}</span>
                  {index > 0 && (
                    <span style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {step.delayDays > 0 ? `${step.delayDays} days` : `${step.delayHours} hours`} delay
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#6b7280' }}>
                  <span>Sent: <strong style={{ color: '#111827' }}>{step.sentCount}</strong></span>
                  <span>Opens: <strong style={{ color: '#111827' }}>{step.openCount}</strong> ({step.sentCount > 0 ? ((step.openCount / step.sentCount) * 100).toFixed(1) : 0}%)</span>
                  <span>Replies: <strong style={{ color: '#111827' }}>{step.replyCount}</strong> ({step.sentCount > 0 ? ((step.replyCount / step.sentCount) * 100).toFixed(1) : 0}%)</span>
                </div>
              </div>
            </div>
          ))}

          {sequence.steps.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No steps configured yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SequenceDetail;
