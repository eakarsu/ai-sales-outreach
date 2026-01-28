import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { campaignsAPI } from '../services/api';
import { Mail, Plus, Search, Filter, Play, Pause, MoreVertical } from 'lucide-react';

const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!team?.id) return;
      try {
        const params: any = { teamId: team.id };
        if (filter !== 'all') params.status = filter;
        const response = await campaignsAPI.getAll(params);
        setCampaigns(response.data);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [team?.id, filter]);

  const handleCampaignClick = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  const handleStatusChange = async (e: React.MouseEvent, campaignId: string, newStatus: string) => {
    e.stopPropagation();
    try {
      if (newStatus === 'active') {
        await campaignsAPI.start(campaignId);
      } else {
        await campaignsAPI.pause(campaignId);
      }
      setCampaigns(campaigns.map(c =>
        c.id === campaignId ? { ...c, status: newStatus } : c
      ));
    } catch (error) {
      console.error('Error updating campaign status:', error);
    }
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: 'all', label: 'All Campaigns' },
    { key: 'active', label: 'Active' },
    { key: 'paused', label: 'Paused' },
    { key: 'draft', label: 'Draft' },
    { key: 'completed', label: 'Completed' },
  ];

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Manage your email outreach campaigns</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/campaigns/new')}>
          <Plus size={18} />
          New Campaign
        </button>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${filter === tab.key ? 'active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card-grid">
        {filteredCampaigns.map(campaign => (
          <div
            key={campaign.id}
            className="card clickable"
            onClick={() => handleCampaignClick(campaign.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>{campaign.name}</h3>
                <span className={`badge ${campaign.status}`}>{campaign.status}</span>
              </div>
              {campaign.status === 'active' ? (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px' }}
                  onClick={(e) => handleStatusChange(e, campaign.id, 'paused')}
                >
                  <Pause size={14} />
                </button>
              ) : campaign.status === 'paused' || campaign.status === 'draft' ? (
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 12px' }}
                  onClick={(e) => handleStatusChange(e, campaign.id, 'active')}
                >
                  <Play size={14} />
                </button>
              ) : null}
            </div>

            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
              {campaign.description || 'No description'}
            </p>

            <div className="metric-row" style={{ marginBottom: '0' }}>
              <div className="metric-item" style={{ padding: '12px' }}>
                <div className="metric-value" style={{ fontSize: '18px' }}>{campaign.emailsSent?.toLocaleString() || 0}</div>
                <div className="metric-label">Sent</div>
              </div>
              <div className="metric-item" style={{ padding: '12px' }}>
                <div className="metric-value" style={{ fontSize: '18px' }}>{campaign.openRate}%</div>
                <div className="metric-label">Opens</div>
              </div>
              <div className="metric-item" style={{ padding: '12px' }}>
                <div className="metric-value" style={{ fontSize: '18px' }}>{campaign.replyRate}%</div>
                <div className="metric-label">Replies</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {campaign.meetingsBooked} meetings booked
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>
                ${parseFloat(campaign.revenueGenerated || 0).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="empty-state">
          <Mail size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No campaigns found</h3>
          <p>Create your first campaign to start reaching out to prospects.</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/campaigns/new')}>
            <Plus size={18} />
            Create Campaign
          </button>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
