import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { templatesAPI } from '../services/api';
import { FileText, Plus, Search, Sparkles, Copy, Eye, MessageSquare } from 'lucide-react';

const Templates: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!team?.id) return;
      try {
        const params: any = { teamId: team.id };
        if (filter === 'ai') params.aiGenerated = 'true';
        else if (filter !== 'all') params.category = filter;
        const response = await templatesAPI.getAll(params);
        setTemplates(response.data);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [team?.id, filter]);

  const handleTemplateClick = (templateId: string) => {
    navigate(`/templates/${templateId}`);
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: 'all', label: 'All Templates' },
    { key: 'cold_outreach', label: 'Cold Outreach' },
    { key: 'follow_up', label: 'Follow-up' },
    { key: 'meeting_request', label: 'Meeting Request' },
    { key: 'ai', label: 'AI Generated' },
  ];

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Templates</h1>
          <p className="page-subtitle">Manage and create email templates for your campaigns</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/ai-assistant')}>
            <Sparkles size={18} />
            AI Generate
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/templates/new')}>
            <Plus size={18} />
            New Template
          </button>
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

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card-grid">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className="card clickable"
            onClick={() => handleTemplateClick(template.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontWeight: '600' }}>{template.name}</h3>
                  {template.isAiGenerated && (
                    <Sparkles size={16} color="#7c3aed" />
                  )}
                </div>
                <span className={`badge ${template.category}`}>{template.category?.replace('_', ' ')}</span>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(template.body);
                }}
              >
                <Copy size={16} />
              </button>
            </div>

            <div style={{
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>
                Subject: {template.subject}
              </div>
              <div style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.5' }}>
                {template.body.substring(0, 120)}...
              </div>
            </div>

            <div className="metric-row" style={{ marginBottom: '0' }}>
              <div className="metric-item" style={{ padding: '10px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Eye size={14} color="#6b7280" />
                  <span style={{ fontWeight: '600' }}>{template.openRate?.toFixed(1)}%</span>
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Open Rate</div>
              </div>
              <div className="metric-item" style={{ padding: '10px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <MessageSquare size={14} color="#6b7280" />
                  <span style={{ fontWeight: '600' }}>{template.replyRate?.toFixed(1)}%</span>
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Reply Rate</div>
              </div>
              <div className="metric-item" style={{ padding: '10px', textAlign: 'center' }}>
                <span style={{ fontWeight: '600' }}>{template.usageCount}</span>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Uses</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="empty-state">
          <FileText size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No templates found</h3>
          <p>Create your first template or let AI generate one for you.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/ai-assistant')}>
              <Sparkles size={18} />
              AI Generate
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/templates/new')}>
              <Plus size={18} />
              Create Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
