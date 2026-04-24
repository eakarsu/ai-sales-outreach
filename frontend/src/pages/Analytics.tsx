import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { analyticsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonCard } from '../components/Skeleton';
import {
  Mail, Eye, MousePointer, MessageSquare, Calendar, DollarSign,
  TrendingUp, TrendingDown, Users, Target
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [roiData, setRoiData] = useState<any>(null);
  const [emailStats, setEmailStats] = useState<any>(null);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!team?.id) return;
      try {
        const [dashboardRes, roiRes, emailRes] = await Promise.all([
          analyticsAPI.getDashboard(team.id),
          analyticsAPI.getROI(team.id),
          analyticsAPI.getEmailStats(team.id)
        ]);
        setDashboardData(dashboardRes.data);
        setRoiData(roiRes.data);
        setEmailStats(emailRes.data);
      } catch (error) {
        showToast('Failed to load analytics data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [team?.id]);

  const handleStatClick = (destination: string) => {
    navigate(destination);
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Track your sales outreach performance and ROI</p>
          </div>
        </div>
        <div className="stats-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const emailFunnelData = [
    { name: 'Sent', value: emailStats?.sent || 0, color: '#4f46e5' },
    { name: 'Opened', value: emailStats?.opened || 0, color: '#16a34a' },
    { name: 'Clicked', value: emailStats?.clicked || 0, color: '#0891b2' },
    { name: 'Replied', value: emailStats?.replied || 0, color: '#ea580c' },
  ];

  const stats = [
    { label: 'Total Emails', value: emailStats?.total?.toLocaleString() || '0', icon: Mail, color: 'blue', destination: '/campaigns' },
    { label: 'Open Rate', value: `${emailStats?.openRate || 0}%`, icon: Eye, color: 'green', destination: '/campaigns' },
    { label: 'Click Rate', value: `${emailStats?.clickRate || 0}%`, icon: MousePointer, color: 'purple', destination: '/campaigns' },
    { label: 'Reply Rate', value: `${emailStats?.replyRate || 0}%`, icon: MessageSquare, color: 'orange', destination: '/campaigns' },
  ];

  const roiStats = [
    { label: 'Total Revenue', value: `$${roiData?.totalRevenue?.toLocaleString() || 0}`, icon: DollarSign, color: 'green' },
    { label: 'ROI', value: `${roiData?.roi || 0}%`, icon: TrendingUp, color: 'purple' },
    { label: 'Meetings Booked', value: roiData?.totalMeetings || 0, icon: Calendar, color: 'blue' },
    { label: 'Rev/Meeting', value: `$${roiData?.revenuePerMeeting || 0}`, icon: Target, color: 'orange' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Track your sales outreach performance and ROI</p>
        </div>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {['7', '14', '30', '90'].map(p => (
            <button
              key={p}
              className={`tab ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p} Days
            </button>
          ))}
        </div>
      </div>

      {/* Email Stats */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card" onClick={() => handleStatClick(stat.destination)}>
            <div className={`stat-icon ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ROI Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {roiStats.map((stat, index) => (
          <div key={index} className="stat-card" onClick={() => handleStatClick('/campaigns')}>
            <div className={`stat-icon ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Performance Trend */}
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Performance Trend</h3>
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
                <Legend />
                <Line type="monotone" dataKey="emailsSent" stroke="#4f46e5" strokeWidth={2} name="Sent" />
                <Line type="monotone" dataKey="emailsOpened" stroke="#16a34a" strokeWidth={2} name="Opened" />
                <Line type="monotone" dataKey="repliesReceived" stroke="#ea580c" strokeWidth={2} name="Replies" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Email Funnel */}
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Email Funnel</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emailFunnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={12} width={60} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {emailFunnelData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Revenue & Meetings Trend</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboardData?.trend?.slice().reverse() || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="#9ca3af"
                fontSize={12}
              />
              <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#16a34a" name="Revenue ($)" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="meetingsBooked" fill="#4f46e5" name="Meetings" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
                <th>Emails Sent</th>
                <th>Open Rate</th>
                <th>Reply Rate</th>
                <th>Meetings</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData?.topCampaigns?.map((campaign: any) => (
                <tr key={campaign.id} onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                  <td style={{ fontWeight: '500' }}>{campaign.name}</td>
                  <td>{campaign.emailsSent?.toLocaleString()}</td>
                  <td>
                    <span style={{ color: parseFloat(campaign.openRate) > 30 ? '#16a34a' : '#6b7280' }}>
                      {campaign.openRate}%
                    </span>
                  </td>
                  <td>
                    <span style={{ color: parseFloat(campaign.replyRate) > 10 ? '#16a34a' : '#6b7280' }}>
                      {campaign.replyRate}%
                    </span>
                  </td>
                  <td>{campaign.meetingsBooked}</td>
                  <td style={{ fontWeight: '600', color: '#16a34a' }}>
                    ${parseFloat(campaign.revenueGenerated).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
