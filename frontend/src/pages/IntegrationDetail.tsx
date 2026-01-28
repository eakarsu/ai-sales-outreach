import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { integrationsAPI } from '../services/api';
import { ArrowLeft, Plug, Check, X, RefreshCw, Settings, ExternalLink } from 'lucide-react';

const IntegrationDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [integration, setIntegration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const fetchIntegration = async () => {
      if (!id) return;
      try {
        const response = await integrationsAPI.getById(id);
        setIntegration(response.data);
      } catch (error) {
        console.error('Error fetching integration:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegration();
  }, [id]);

  const handleConnect = async () => {
    try {
      await integrationsAPI.connect(id!);
      setIntegration({ ...integration, status: 'connected', lastSyncAt: new Date().toISOString() });
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await integrationsAPI.disconnect(id!);
      setIntegration({ ...integration, status: 'disconnected' });
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await integrationsAPI.sync(id!);
      setIntegration({ ...integration, lastSyncAt: new Date().toISOString() });
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!integration) {
    return <div className="empty-state">Integration not found</div>;
  }

  const features = getIntegrationFeatures(integration.name);

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => navigate('/integrations')}
        style={{ marginBottom: '24px' }}
      >
        <ArrowLeft size={18} />
        Back to Integrations
      </button>

      <div className="detail-header">
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: integration.status === 'connected' ? '#dcfce7' : '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Plug size={32} color={integration.status === 'connected' ? '#16a34a' : '#6b7280'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 className="page-title">{integration.name}</h1>
              <span className={`badge ${integration.status}`}>
                {integration.status === 'connected' && <Check size={12} style={{ marginRight: '4px' }} />}
                {integration.status}
              </span>
            </div>
            <p className="page-subtitle">Type: {integration.type}</p>
          </div>
        </div>
        <div className="detail-actions">
          {integration.status === 'connected' ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw size={18} className={syncing ? 'spinning' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button className="btn btn-danger" onClick={handleDisconnect}>
                <X size={18} />
                Disconnect
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleConnect}>
              <Plug size={18} />
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>About {integration.name}</h3>
            <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '20px' }}>
              {getIntegrationDescription(integration.name)}
            </p>

            <h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Features</h4>
            <ul style={{ paddingLeft: '20px', color: '#6b7280', lineHeight: '1.8' }}>
              {features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>

          {integration.status === 'connected' && (
            <div className="card" style={{ marginTop: '24px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Sync Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>Auto-sync contacts</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Automatically sync new contacts</div>
                  </div>
                  <ToggleSwitch enabled={true} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>Sync email activity</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Track email opens and clicks</div>
                  </div>
                  <ToggleSwitch enabled={true} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>Two-way sync</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Sync changes in both directions</div>
                  </div>
                  <ToggleSwitch enabled={false} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Connection Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <StatusItem
                label="Status"
                value={integration.status === 'connected' ? 'Connected' : 'Not connected'}
                color={integration.status === 'connected' ? '#16a34a' : '#6b7280'}
              />
              <StatusItem
                label="Last Synced"
                value={integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : 'Never'}
              />
              <StatusItem
                label="Connected Since"
                value={integration.status === 'connected' ? new Date(integration.createdAt).toLocaleDateString() : '-'}
              />
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Documentation</h3>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginBottom: '12px' }}
              onClick={() => window.open('#', '_blank')}
            >
              <ExternalLink size={16} />
              Setup Guide
            </button>
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => window.open('#', '_blank')}
            >
              <Settings size={16} />
              API Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span style={{ color: '#6b7280' }}>{label}</span>
    <span style={{ fontWeight: '500', color: color || '#111827' }}>{value}</span>
  </div>
);

const ToggleSwitch: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <div style={{
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    background: enabled ? '#4f46e5' : '#e5e7eb',
    position: 'relative',
    cursor: 'pointer'
  }}>
    <div style={{
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background: 'white',
      position: 'absolute',
      top: '2px',
      left: enabled ? '22px' : '2px',
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    }}></div>
  </div>
);

const getIntegrationDescription = (name: string) => {
  const descriptions: Record<string, string> = {
    'Salesforce': 'Sync your Salesforce contacts and opportunities with SalesAI for seamless CRM integration.',
    'HubSpot': 'Connect HubSpot to import contacts, sync email activity, and track deals automatically.',
    'Gmail': 'Send emails directly from Gmail and track opens, clicks, and replies in real-time.',
    'Outlook': 'Integrate with Microsoft Outlook for email sending and calendar scheduling.',
    'LinkedIn Sales Navigator': 'Import leads from LinkedIn and enrich contact data automatically.',
    'Slack': 'Get real-time notifications in Slack when prospects engage with your emails.',
    'Calendly': 'Enable one-click meeting scheduling with your Calendly calendar.',
    'Zoom': 'Automatically create Zoom meeting links for scheduled calls.',
    'Zapier': 'Connect SalesAI to 5,000+ apps through Zapier automation.',
    'Pipedrive': 'Sync deals and contacts with Pipedrive for complete pipeline visibility.',
    default: 'Enhance your sales workflow by connecting this integration with SalesAI.'
  };
  return descriptions[name] || descriptions.default;
};

const getIntegrationFeatures = (name: string) => {
  const features: Record<string, string[]> = {
    'Salesforce': ['Two-way contact sync', 'Opportunity tracking', 'Activity logging', 'Custom field mapping'],
    'HubSpot': ['Contact import', 'Email tracking', 'Deal sync', 'Workflow automation'],
    'Gmail': ['Email sending', 'Open tracking', 'Click tracking', 'Reply detection'],
    'LinkedIn Sales Navigator': ['Lead import', 'Contact enrichment', 'InMail tracking', 'Company insights'],
    'Slack': ['Real-time notifications', 'Channel integration', 'Reply handling', 'Activity summaries'],
    default: ['Data synchronization', 'Activity tracking', 'Automated workflows', 'Real-time updates']
  };
  return features[name] || features.default;
};

export default IntegrationDetail;
