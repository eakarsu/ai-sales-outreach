import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templatesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Edit, Trash2, Copy, Sparkles, Eye, MessageSquare, BarChart3, Save } from 'lucide-react';

const TemplateDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, team } = useAuth();
  const isNew = id === 'new';
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'outreach',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!id || isNew) return;
      try {
        const response = await templatesAPI.getById(id);
        setTemplate(response.data);
      } catch (error) {
        console.error('Error fetching template:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
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
      const response = await templatesAPI.create({
        teamId: team.id,
        createdBy: user?.id,
        ...formData,
      });
      navigate(`/templates/${response.data.id}`);
    } catch (error) {
      console.error('Error creating template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(`Subject: ${template.subject}\n\n${template.body}`);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (isNew) {
    return (
      <div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/templates')}
          style={{ marginBottom: '24px' }}
        >
          <ArrowLeft size={18} />
          Back to Templates
        </button>

        <div className="card">
          <h2 style={{ fontWeight: '600', marginBottom: '24px' }}>Create New Template</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Template Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Cold Outreach - Tech Startups"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                name="category"
                className="form-input"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="outreach">Outreach</option>
                <option value="follow_up">Follow Up</option>
                <option value="nurture">Nurture</option>
                <option value="re_engagement">Re-engagement</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subject Line *</label>
              <input
                type="text"
                name="subject"
                className="form-input"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="e.g., Quick question about {{company}}"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Body *</label>
              <textarea
                name="body"
                className="form-input"
                value={formData.body}
                onChange={handleInputChange}
                placeholder="Hi {{firstName}},&#10;&#10;I noticed that {{company}} is..."
                rows={10}
                required
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                Use variables like {'{{firstName}}'}, {'{{company}}'}, {'{{jobTitle}}'} for personalization
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving || !formData.name || !formData.subject}>
                <Save size={18} />
                {saving ? 'Creating...' : 'Create Template'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/templates')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!template) {
    return <div className="empty-state">Template not found</div>;
  }

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => navigate('/templates')}
        style={{ marginBottom: '24px' }}
      >
        <ArrowLeft size={18} />
        Back to Templates
      </button>

      <div className="detail-header">
        <div className="detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 className="page-title">{template.name}</h1>
            {template.isAiGenerated && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: '#f3e8ff',
                color: '#7c3aed',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                <Sparkles size={14} />
                AI Generated
              </span>
            )}
            <span className={`badge ${template.category}`}>{template.category?.replace('_', ' ')}</span>
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            Created by {template.creatorName} on {new Date(template.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary" onClick={handleCopyTemplate}>
            <Copy size={18} />
            Copy
          </button>
          <button className="btn btn-primary">
            <Edit size={18} />
            Edit
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card" onClick={() => navigate('/analytics')}>
          <div className="stat-icon green"><Eye size={18} /></div>
          <div className="stat-value">{template.openRate?.toFixed(1)}%</div>
          <div className="stat-label">Open Rate</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/analytics')}>
          <div className="stat-icon purple"><MessageSquare size={18} /></div>
          <div className="stat-value">{template.replyRate?.toFixed(1)}%</div>
          <div className="stat-label">Reply Rate</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/campaigns')}>
          <div className="stat-icon blue"><BarChart3 size={18} /></div>
          <div className="stat-value">{template.usageCount}</div>
          <div className="stat-label">Times Used</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/campaigns')}>
          <div className="stat-icon orange"><BarChart3 size={18} /></div>
          <div className="stat-value">{template.variables?.length || 0}</div>
          <div className="stat-label">Variables</div>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Email Preview</h3>
            <div style={{
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Subject</div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>{template.subject}</div>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {template.body}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Template Variables</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
              Use these variables to personalize your emails
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {template.variables?.map((variable: string, index: number) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: '#f3f4f6',
                    borderRadius: '8px'
                  }}
                >
                  <code style={{ color: '#4f46e5', fontWeight: '500' }}>{`{{${variable}}}`}</code>
                  <button
                    style={{ color: '#6b7280', background: 'none', padding: '4px' }}
                    onClick={() => navigator.clipboard.writeText(`{{${variable}}}`)}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Performance Tips</h3>
            <ul style={{ color: '#6b7280', fontSize: '14px', paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Personalize subject lines with {`{{firstName}}`}</li>
              <li>Keep emails under 150 words for better engagement</li>
              <li>Include a clear call-to-action</li>
              <li>A/B test different subject lines</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetail;
