import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft,
  Play,
  Pause,
  Mail,
  Eye,
  MessageSquare,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Edit,
  Trash2,
  Save
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CampaignDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, team } = useAuth();
  const isNew = id === 'new';
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [activeTab, setActiveTab] = useState('overview');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'outreach',
    targetAudience: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id || isNew) return;
      try {
        const response = await campaignsAPI.getById(id);
        setCampaign(response.data);
      } catch (error) {
        console.error('Error fetching campaign:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id, isNew]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team?.id) return;

    setSaving(true);
    try {
      const response = await campaignsAPI.create({
        teamId: team.id,
        createdBy: user?.id,
        ...formData,
      });
      navigate(`/campaigns/${response.data.id}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      if (campaign.status === 'active') {
        await campaignsAPI.pause(id!);
        setCampaign({ ...campaign, status: 'paused' });
      } else {
        await campaignsAPI.start(id!);
        setCampaign({ ...campaign, status: 'active' });
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
    }
  };

  const handleEmailClick = (emailId: string) => {
    navigate(`/contacts/${emailId}`);
  };

  const handleSequenceClick = (sequenceId: string) => {
    navigate(`/templates/${sequenceId}`);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (isNew) {
    return (
      <div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/campaigns')}
          style={{ marginBottom: '24px' }}
        >
          <ArrowLeft size={18} />
          Back to Campaigns
        </button>

        <div className="card">
          <h2 style={{ fontWeight: '600', marginBottom: '24px' }}>Create New Campaign</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Campaign Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter campaign name"
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
                placeholder="Describe your campaign"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Campaign Type</label>
              <select
                name="type"
                className="form-input"
                value={formData.type}
                onChange={handleInputChange}
              >
                <option value="outreach">Outreach</option>
                <option value="nurture">Nurture</option>
                <option value="re-engagement">Re-engagement</option>
                <option value="promotional">Promotional</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <input
                type="text"
                name="targetAudience"
                className="form-input"
                value={formData.targetAudience}
                onChange={handleInputChange}
                placeholder="e.g., Tech Startups, Enterprise Sales"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving || !formData.name}>
                <Save size={18} />
                {saving ? 'Creating...' : 'Create Campaign'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/campaigns')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return <div className="empty-state">Campaign not found</div>;
  }

  const stats = [
    { label: 'Emails Sent', value: campaign.emailsSent?.toLocaleString() || 0, icon: Mail, color: 'blue' },
    { label: 'Open Rate', value: `${campaign.openRate}%`, icon: Eye, color: 'green' },
    { label: 'Reply Rate', value: `${campaign.replyRate}%`, icon: MessageSquare, color: 'purple' },
    { label: 'Meetings', value: campaign.meetingsBooked || 0, icon: Calendar, color: 'orange' },
    { label: 'Revenue', value: `$${parseFloat(campaign.revenueGenerated || 0).toLocaleString()}`, icon: DollarSign, color: 'green' },
    { label: 'Contacts', value: campaign.totalContacts?.toLocaleString() || 0, icon: Users, color: 'indigo' },
  ];

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => navigate('/campaigns')}
        style={{ marginBottom: '24px' }}
      >
        <ArrowLeft size={18} />
        Back to Campaigns
      </button>

      <div className="detail-header">
        <div className="detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <h1 className="page-title">{campaign.name}</h1>
            <span className={`badge ${campaign.status}`}>{campaign.status}</span>
          </div>
          <p className="page-subtitle">{campaign.description || 'No description'}</p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>
            <span>Type: <strong>{campaign.type}</strong></span>
            <span>Created by: <strong>{campaign.creatorName}</strong></span>
            <span>Created: <strong>{new Date(campaign.createdAt).toLocaleDateString()}</strong></span>
          </div>
        </div>
        <div className="detail-actions">
          {campaign.status !== 'completed' && (
            <button
              className={`btn ${campaign.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleStatusChange}
            >
              {campaign.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
              {campaign.status === 'active' ? 'Pause' : 'Start'}
            </button>
          )}
          <button className="btn btn-secondary">
            <Edit size={18} />
            Edit
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {stats.map((stat, index) => (
          <div key={index} className="stat-card" onClick={() => navigate('/analytics')}>
            <div className={`stat-icon ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div className="stat-value" style={{ fontSize: '22px' }}>{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="tabs" style={{ marginTop: '24px' }}>
        {['overview', 'sequences', 'emails', 'analytics'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="detail-grid">
          <div>
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Campaign Performance</h3>
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateMockChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="sent" stroke="#4f46e5" strokeWidth={2} name="Sent" />
                    <Line type="monotone" dataKey="opened" stroke="#16a34a" strokeWidth={2} name="Opened" />
                    <Line type="monotone" dataKey="replied" stroke="#ea580c" strokeWidth={2} name="Replied" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Email Sequence</h3>
              {campaign.sequences?.length > 0 ? (
                <div>
                  {campaign.sequences.map((seq: any, index: number) => (
                    <div
                      key={seq.id}
                      className="list-item"
                      onClick={() => handleSequenceClick(seq.templateId)}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#e0e7ff',
                        color: '#4f46e5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600'
                      }}>
                        {seq.stepNumber}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500' }}>{seq.templateName}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{seq.templateSubject}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '13px' }}>
                        <Clock size={14} />
                        {seq.delayDays > 0 ? `${seq.delayDays} days` : 'Immediate'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280' }}>No sequences configured</p>
              )}
            </div>
          </div>

          <div>
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Campaign Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Target Audience</div>
                  <div style={{ fontWeight: '500' }}>{campaign.targetAudience || 'All contacts'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Start Date</div>
                  <div style={{ fontWeight: '500' }}>
                    {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'Not started'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>End Date</div>
                  <div style={{ fontWeight: '500' }}>
                    {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'Ongoing'}
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Funnel</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <FunnelStep label="Sent" value={campaign.emailsSent} total={campaign.emailsSent} color="#4f46e5" />
                <FunnelStep label="Opened" value={campaign.emailsOpened} total={campaign.emailsSent} color="#16a34a" />
                <FunnelStep label="Clicked" value={campaign.emailsClicked} total={campaign.emailsSent} color="#0891b2" />
                <FunnelStep label="Replied" value={campaign.repliesReceived} total={campaign.emailsSent} color="#ea580c" />
                <FunnelStep label="Meetings" value={campaign.meetingsBooked} total={campaign.emailsSent} color="#7c3aed" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'emails' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Opened</th>
                <th>Replied</th>
              </tr>
            </thead>
            <tbody>
              {campaign.recentEmails?.map((email: any) => (
                <tr key={email.id} onClick={() => handleEmailClick(email.contactId)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar sm">{email.contactName?.[0]}</div>
                      <div>
                        <div style={{ fontWeight: '500' }}>{email.contactName}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{email.company}</div>
                      </div>
                    </div>
                  </td>
                  <td>{email.subject}</td>
                  <td><span className={`badge ${email.status}`}>{email.status}</span></td>
                  <td>{new Date(email.sentAt).toLocaleDateString()}</td>
                  <td>{email.openedAt ? new Date(email.openedAt).toLocaleDateString() : '-'}</td>
                  <td>{email.repliedAt ? new Date(email.repliedAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sequences' && (
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Email Sequences</h3>
          {campaign.sequences?.length > 0 ? (
            campaign.sequences.map((seq: any) => (
              <div
                key={seq.id}
                className="card clickable"
                style={{ marginBottom: '12px', padding: '16px' }}
                onClick={() => handleSequenceClick(seq.templateId)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#e0e7ff',
                      color: '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700'
                    }}>
                      {seq.stepNumber}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{seq.templateName}</div>
                      <div style={{ color: '#6b7280', fontSize: '14px' }}>{seq.templateSubject}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '500' }}>
                      {seq.delayDays > 0 ? `Wait ${seq.delayDays} days` : 'Send immediately'}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>after previous step</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#6b7280' }}>No sequences configured for this campaign.</p>
          )}
        </div>
      )}
    </div>
  );
};

const FunnelStep: React.FC<{ label: string; value: number; total: number; color: string }> = ({
  label, value, total, color
}) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '500' }}>{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percentage}%`, background: color }}></div>
      </div>
    </div>
  );
};

const generateMockChartData = () => {
  return Array.from({ length: 14 }, (_, i) => ({
    day: `Day ${i + 1}`,
    sent: Math.floor(Math.random() * 50) + 20,
    opened: Math.floor(Math.random() * 30) + 10,
    replied: Math.floor(Math.random() * 10) + 2
  }));
};

export default CampaignDetail;
