import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templatesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard } from '../components/Skeleton';
import { FormField, validateRequired } from '../components/FormValidation';
import { ArrowLeft, Edit, Trash2, Copy, Sparkles, Eye, MessageSquare, BarChart3, Save, X } from 'lucide-react';

const TemplateDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, team } = useAuth();
  const { showToast } = useToast();
  const isNew = id === 'new';
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [editing, setEditing] = useState(isNew);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'outreach',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!id || isNew) return;
      try {
        const response = await templatesAPI.getById(id);
        setTemplate(response.data);
        setFormData({
          name: response.data.name || '',
          subject: response.data.subject || '',
          body: response.data.body || '',
          category: response.data.category || 'outreach',
        });
      } catch (error) {
        showToast('Failed to load template', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id, isNew]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const nameErr = validateRequired(formData.name, 'Template name');
    const subjectErr = validateRequired(formData.subject, 'Subject line');
    const bodyErr = validateRequired(formData.body, 'Email body');
    if (nameErr) newErrors.name = nameErr;
    if (subjectErr) newErrors.subject = subjectErr;
    if (bodyErr) newErrors.body = bodyErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!team?.id) return;

    setSaving(true);
    try {
      if (isNew) {
        const response = await templatesAPI.create({
          teamId: team.id,
          createdBy: user?.id,
          ...formData,
        });
        showToast('Template created successfully', 'success');
        navigate(`/templates/${response.data.id}`);
      } else {
        await templatesAPI.update(id!, formData);
        const response = await templatesAPI.getById(id!);
        setTemplate(response.data);
        setEditing(false);
        showToast('Template updated successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await templatesAPI.delete(id!);
      showToast('Template deleted successfully', 'success');
      navigate('/templates');
    } catch { showToast('Failed to delete template', 'error'); }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(`Subject: ${template.subject}\n\n${template.body}`);
    showToast('Template copied to clipboard', 'success');
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <SkeletonCard />
        <div style={{ marginTop: '24px' }}><SkeletonCard /></div>
        <div style={{ marginTop: '24px' }}><SkeletonCard /></div>
      </div>
    );
  }

  if (isNew || editing) {
    return (
      <div>
        <button className="btn btn-secondary"
          onClick={() => editing && !isNew ? setEditing(false) : navigate('/templates')}
          style={{ marginBottom: '24px' }}>
          <ArrowLeft size={18} /> {isNew ? 'Back to Templates' : 'Cancel Editing'}
        </button>

        <div className="card">
          <h2 style={{ fontWeight: '600', marginBottom: '24px' }}>{isNew ? 'Create New Template' : 'Edit Template'}</h2>
          <form onSubmit={handleSave}>
            <FormField label="Template Name" error={errors.name} required>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Cold Outreach - Tech Startups"
                style={errors.name ? { borderColor: '#dc2626' } : {}}
              />
            </FormField>

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

            <FormField label="Subject Line" error={errors.subject} required>
              <input
                type="text"
                name="subject"
                className="form-input"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="e.g., Quick question about {{company}}"
                style={errors.subject ? { borderColor: '#dc2626' } : {}}
              />
            </FormField>

            <FormField label="Email Body" error={errors.body} required>
              <textarea
                name="body"
                className="form-input"
                value={formData.body}
                onChange={handleInputChange}
                placeholder="Hi {{firstName}},&#10;&#10;I noticed that {{company}} is..."
                rows={10}
                style={errors.body ? { borderColor: '#dc2626' } : {}}
              />
            </FormField>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '-12px', marginBottom: '16px' }}>
              Use variables like {'{{firstName}}'}, {'{{company}}'}, {'{{jobTitle}}'} for personalization
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={18} />
                {saving ? 'Saving...' : isNew ? 'Create Template' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary"
                onClick={() => isNew ? navigate('/templates') : setEditing(false)}>
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
            <Copy size={18} /> Copy
          </button>
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            <Edit size={18} /> Edit
          </button>
          <button className="btn btn-danger" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 size={18} /> Delete
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
                    style={{ color: '#6b7280', background: 'none', padding: '4px', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${variable}}}`);
                      showToast('Variable copied to clipboard', 'success');
                    }}
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

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Template"
        message={`Are you sure you want to delete "${template.name}"? This action cannot be undone.`}
        confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleDelete} onCancel={() => setShowDeleteDialog(false)} />
    </div>
  );
};

export default TemplateDetail;
