import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { analyticsAPI, campaignsAPI, activityAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonCard } from '../components/Skeleton';
import {
  Mail,
  Eye,
  MessageSquare,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Wand2,
  Clock,
  Shield,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!team?.id) return;
      try {
        const [dashboardRes, campaignsRes, activityRes] = await Promise.all([
          analyticsAPI.getDashboard(team.id),
          campaignsAPI.getAll({ teamId: team.id, limit: 5 }),
          activityAPI.getAll({ teamId: team.id, limit: 10 })
        ]);
        setDashboardData(dashboardRes.data);
        setCampaigns(campaignsRes.data.slice(0, 5));
        setActivities(activityRes.data);
      } catch (error) {
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [team?.id]);

  const handleStatClick = (destination: string) => {
    navigate(destination);
  };

  const handleCampaignClick = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  const handleActivityClick = (activity: any) => {
    if (!activity.entityId) return;

    switch (activity.entityType) {
      case 'campaign':
        navigate(`/campaigns/${activity.entityId}`);
        break;
      case 'contact':
        navigate(`/contacts/${activity.entityId}`);
        break;
      case 'template':
        navigate(`/templates/${activity.entityId}`);
        break;
      case 'meeting':
        navigate(`/meetings/${activity.entityId}`);
        break;
      case 'email':
        navigate(`/campaigns`);
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Emails Sent',
      value: dashboardData?.overview?.totalEmailsSent?.toLocaleString() || '0',
      icon: Mail,
      color: 'blue',
      change: '+12.5%',
      positive: true,
      destination: '/analytics'
    },
    {
      label: 'Open Rate',
      value: `${dashboardData?.overview?.overallOpenRate || 0}%`,
      icon: Eye,
      color: 'green',
      change: '+3.2%',
      positive: true,
      destination: '/analytics'
    },
    {
      label: 'Reply Rate',
      value: `${dashboardData?.overview?.overallReplyRate || 0}%`,
      icon: MessageSquare,
      color: 'purple',
      change: '+5.1%',
      positive: true,
      destination: '/analytics'
    },
    {
      label: 'Meetings Booked',
      value: dashboardData?.overview?.totalMeetings?.toLocaleString() || '0',
      icon: Calendar,
      color: 'orange',
      change: '+8.7%',
      positive: true,
      destination: '/meetings'
    },
  ];

  const roiStats = [
    {
      label: 'Total Revenue',
      value: `$${(dashboardData?.overview?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'green',
      destination: '/analytics'
    },
    {
      label: 'Active Campaigns',
      value: dashboardData?.overview?.activeCampaigns || '0',
      icon: Target,
      color: 'indigo',
      destination: '/campaigns'
    },
    {
      label: 'Total Contacts',
      value: dashboardData?.contacts?.total?.toLocaleString() || '0',
      icon: Users,
      color: 'blue',
      destination: '/contacts'
    },
    {
      label: 'Qualified Leads',
      value: dashboardData?.contacts?.qualified?.toLocaleString() || '0',
      icon: TrendingUp,
      color: 'purple',
      destination: '/contacts'
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's your sales outreach overview.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/campaigns')}>
          <Mail size={18} />
          New Campaign
        </button>
      </div>

      {/* Main Stats */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="stat-card"
            onClick={() => handleStatClick(stat.destination)}
          >
            <div className="stat-card-header">
              <div className={`stat-icon ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
              {stat.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {stat.change} vs last month
            </div>
          </div>
        ))}
      </div>

      {/* ROI Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {roiStats.map((stat, index) => (
          <div
            key={index}
            className="stat-card"
            onClick={() => handleStatClick(stat.destination)}
          >
            <div className="stat-card-header">
              <div className={`stat-icon ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts and Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Performance Chart */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontWeight: '600' }}>Email Performance Trend</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboardData?.trend?.slice().reverse() || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="emailsSent" stroke="#4f46e5" strokeWidth={2} dot={false} name="Sent" />
                <Line type="monotone" dataKey="emailsOpened" stroke="#16a34a" strokeWidth={2} dot={false} name="Opened" />
                <Line type="monotone" dataKey="repliesReceived" stroke="#ea580c" strokeWidth={2} dot={false} name="Replies" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontWeight: '600' }}>Recent Activity</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {activities.map((activity, index) => (
              <div
                key={index}
                className="list-item"
                onClick={() => handleActivityClick(activity)}
                style={{ padding: '12px 0' }}
              >
                <div className="avatar sm" style={{ background: getActivityColor(activity.action) }}>
                  {activity.userName?.[0] || 'U'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{formatAction(activity.action)}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{activity.userName} - {formatTime(activity.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Features Cards */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} style={{ color: '#7c3aed' }} />
          AI Features
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          <div
            className="stat-card"
            onClick={() => navigate('/ai/lead-scores')}
            style={{ cursor: 'pointer', transition: 'all 0.2s', border: '2px solid transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div className="stat-icon purple"><Target size={20} /></div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Lead Scorer</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>AI-powered lead scoring</div>
          </div>
          <div
            className="stat-card"
            onClick={() => navigate('/ai/personalizations')}
            style={{ cursor: 'pointer', transition: 'all 0.2s', border: '2px solid transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div className="stat-icon blue"><Wand2 size={20} /></div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Personalization</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>AI content personalization</div>
          </div>
          <div
            className="stat-card"
            onClick={() => navigate('/ai/best-times')}
            style={{ cursor: 'pointer', transition: 'all 0.2s', border: '2px solid transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div className="stat-icon green"><Clock size={20} /></div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Best Time</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Optimal contact timing</div>
          </div>
          <div
            className="stat-card"
            onClick={() => navigate('/ai/objections')}
            style={{ cursor: 'pointer', transition: 'all 0.2s', border: '2px solid transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div className="stat-icon orange"><Shield size={20} /></div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Objection Handler</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>AI objection responses</div>
          </div>
          <div
            className="stat-card"
            onClick={() => navigate('/ai/forecasts')}
            style={{ cursor: 'pointer', transition: 'all 0.2s', border: '2px solid transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div className="stat-icon indigo"><BarChart3 size={20} /></div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Pipeline Forecast</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>AI revenue prediction</div>
          </div>
        </div>
      </div>

      {/* Top Campaigns */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontWeight: '600' }}>Top Performing Campaigns</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/campaigns')}>View All</button>
        </div>
        <div className="table-container" style={{ boxShadow: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Open Rate</th>
                <th>Reply Rate</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(dashboardData?.topCampaigns || campaigns).map((campaign: any) => (
                <tr key={campaign.id} onClick={() => handleCampaignClick(campaign.id)}>
                  <td style={{ fontWeight: '500' }}>{campaign.name}</td>
                  <td><span className={`badge ${campaign.status}`}>{campaign.status}</span></td>
                  <td>{campaign.emailsSent?.toLocaleString()}</td>
                  <td>{campaign.openRate}%</td>
                  <td>{campaign.replyRate}%</td>
                  <td style={{ fontWeight: '600', color: '#16a34a' }}>${parseFloat(campaign.revenueGenerated || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const formatAction = (action: string) => {
  const actions: Record<string, string> = {
    email_sent: 'Sent an email',
    contact_added: 'Added a contact',
    campaign_created: 'Created campaign',
    template_used: 'Used template',
    meeting_booked: 'Meeting booked',
    deal_closed: 'Closed a deal',
    ai_generated: 'Generated AI content',
    login: 'Logged in',
    settings_updated: 'Updated settings'
  };
  return actions[action] || action;
};

const getActivityColor = (action: string) => {
  const colors: Record<string, string> = {
    email_sent: '#4f46e5',
    contact_added: '#16a34a',
    campaign_created: '#7c3aed',
    meeting_booked: '#ea580c',
    deal_closed: '#059669',
  };
  return colors[action] || '#6b7280';
};

const formatTime = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export default Dashboard;
