import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersAPI } from '../services/api';
import { ArrowLeft, Mail, Calendar, Shield, Edit, Trash2, BarChart3 } from 'lucide-react';

const TeamMemberDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMember = async () => {
      if (!id) return;
      try {
        const response = await usersAPI.getById(id);
        setMember(response.data);
      } catch (error) {
        console.error('Error fetching member:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [id]);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!member) {
    return <div className="empty-state">Team member not found</div>;
  }

  // Mock stats for the team member
  const stats = {
    emailsSent: Math.floor(Math.random() * 5000) + 500,
    repliesReceived: Math.floor(Math.random() * 500) + 50,
    meetingsBooked: Math.floor(Math.random() * 50) + 5,
    revenueGenerated: Math.floor(Math.random() * 100000) + 10000
  };

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => navigate('/team')}
        style={{ marginBottom: '24px' }}
      >
        <ArrowLeft size={18} />
        Back to Team
      </button>

      <div className="detail-header">
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="avatar lg">
            {member.firstName?.[0]}{member.lastName?.[0]}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 className="page-title">{member.firstName} {member.lastName}</h1>
              <span className={`badge ${member.role}`}>{member.role}</span>
            </div>
            <p className="page-subtitle">{member.email}</p>
            <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '14px' }}>
              Member since {new Date(member.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary">
            <Edit size={18} />
            Edit
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card" onClick={() => navigate('/campaigns')}>
          <div className="stat-icon blue"><Mail size={18} /></div>
          <div className="stat-value">{stats.emailsSent.toLocaleString()}</div>
          <div className="stat-label">Emails Sent</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics')}>
          <div className="stat-icon green"><Mail size={18} /></div>
          <div className="stat-value">{stats.repliesReceived}</div>
          <div className="stat-label">Replies Received</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics')}>
          <div className="stat-icon purple"><Calendar size={18} /></div>
          <div className="stat-value">{stats.meetingsBooked}</div>
          <div className="stat-label">Meetings Booked</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics')}>
          <div className="stat-icon orange"><BarChart3 size={18} /></div>
          <div className="stat-value">${stats.revenueGenerated.toLocaleString()}</div>
          <div className="stat-label">Revenue Generated</div>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Recent Activity</h3>
            {[
              { action: 'Sent email to contact', icon: Mail, time: '1 hour ago', path: '/campaigns' },
              { action: 'Booked a meeting', icon: Calendar, time: '2 hours ago', path: '/meetings' },
              { action: 'Updated contact info', icon: Mail, time: '3 hours ago', path: '/contacts' },
              { action: 'Created new template', icon: Mail, time: '5 hours ago', path: '/templates' },
              { action: 'Completed a task', icon: Shield, time: '1 day ago', path: '/tasks' },
            ].map((activity, index) => (
              <div key={index} className="list-item" onClick={() => navigate(activity.path)} style={{ cursor: 'pointer' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <activity.icon size={16} color="#6b7280" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500' }}>{activity.action}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Profile Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ProfileItem label="Full Name" value={`${member.firstName} ${member.lastName}`} />
              <ProfileItem label="Email" value={member.email} />
              <ProfileItem label="Role" value={member.role} />
              <ProfileItem label="Member Since" value={new Date(member.createdAt).toLocaleDateString()} />
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Permissions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <PermissionItem label="Create Campaigns" enabled={true} />
              <PermissionItem label="View Analytics" enabled={true} />
              <PermissionItem label="Manage Templates" enabled={true} />
              <PermissionItem label="Manage Team" enabled={member.role === 'admin'} />
              <PermissionItem label="Billing Access" enabled={member.role === 'admin'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>{label}</div>
    <div style={{ fontWeight: '500' }}>{value}</div>
  </div>
);

const PermissionItem: React.FC<{ label: string; enabled: boolean }> = ({ label, enabled }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span>{label}</span>
    <span style={{
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background: enabled ? '#dcfce7' : '#fee2e2',
      color: enabled ? '#16a34a' : '#dc2626',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px'
    }}>
      {enabled ? '✓' : '×'}
    </span>
  </div>
);

export default TeamMemberDetail;
