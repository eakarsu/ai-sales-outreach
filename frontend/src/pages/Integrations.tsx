import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { integrationsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonCard } from '../components/Skeleton';
import {
  Plug, Plus, Search, Check, X, RefreshCw,
  Mail, Database, MessageSquare, Calendar, BarChart3, Zap
} from 'lucide-react';

const Integrations: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchIntegrations = async () => {
      if (!team?.id) return;
      try {
        const response = await integrationsAPI.getAll({ teamId: team.id });
        setIntegrations(response.data);
      } catch (error) {
        showToast('Failed to load integrations', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, [team?.id]);

  const handleIntegrationClick = (integrationId: string) => {
    navigate(`/integrations/${integrationId}`);
  };

  const handleConnect = async (e: React.MouseEvent, integrationId: string) => {
    e.stopPropagation();
    try {
      await integrationsAPI.connect(integrationId);
      setIntegrations(integrations.map(i =>
        i.id === integrationId ? { ...i, status: 'connected' } : i
      ));
      showToast('Integration connected successfully', 'success');
    } catch (error) {
      showToast('Failed to connect integration', 'error');
    }
  };

  const handleDisconnect = async (e: React.MouseEvent, integrationId: string) => {
    e.stopPropagation();
    try {
      await integrationsAPI.disconnect(integrationId);
      setIntegrations(integrations.map(i =>
        i.id === integrationId ? { ...i, status: 'disconnected' } : i
      ));
      showToast('Integration disconnected', 'info');
    } catch (error) {
      showToast('Failed to disconnect integration', 'error');
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'crm': return Database;
      case 'email': return Mail;
      case 'communication': return MessageSquare;
      case 'calendar': case 'meeting': return Calendar;
      case 'analytics': return BarChart3;
      case 'automation': return Zap;
      default: return Plug;
    }
  };

  const filteredIntegrations = filter === 'all'
    ? integrations
    : filter === 'connected'
      ? integrations.filter(i => i.status === 'connected')
      : integrations.filter(i => i.status === 'disconnected');

  const tabs = [
    { key: 'all', label: 'All Integrations' },
    { key: 'connected', label: 'Connected' },
    { key: 'disconnected', label: 'Available' },
  ];

  if (loading) {
    const connectedCount = 0;
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Integrations</h1>
            <p className="page-subtitle">Loading integrations...</p>
          </div>
        </div>
        <div className="card-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">{connectedCount} of {integrations.length} integrations connected</p>
        </div>
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

      <div className="card-grid">
        {filteredIntegrations.map(integration => {
          const Icon = getIntegrationIcon(integration.type);
          return (
            <div
              key={integration.id}
              className="card clickable"
              onClick={() => handleIntegrationClick(integration.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: integration.status === 'connected' ? '#dcfce7' : '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={24} color={integration.status === 'connected' ? '#16a34a' : '#6b7280'} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>{integration.name}</h3>
                    <span className={`badge ${integration.status}`}>
                      {integration.status === 'connected' && <Check size={12} style={{ marginRight: '4px' }} />}
                      {integration.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                Type: {integration.type}
              </div>

              {integration.status === 'connected' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Last synced: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : 'Never'}
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={(e) => handleDisconnect(e, integration.id)}
                  >
                    <X size={14} />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={(e) => handleConnect(e, integration.id)}
                >
                  <Plug size={16} />
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="empty-state">
          <Plug size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No integrations found</h3>
          <p>Connect your favorite tools to enhance your sales outreach.</p>
        </div>
      )}
    </div>
  );
};

export default Integrations;
