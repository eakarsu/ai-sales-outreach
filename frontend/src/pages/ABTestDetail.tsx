import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { abTestsAPI, campaignsAPI, templatesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Trophy, Clock, CheckCircle, StopCircle, Save } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ABTestDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { team } = useAuth();
  const isNew = id === 'new';
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    campaignId: '',
    variantATemplateId: '',
    variantBTemplateId: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew && team?.id) {
      fetchCampaignsAndTemplates();
    } else if (id && !isNew) {
      fetchTest();
    }
  }, [id, isNew, team?.id]);

  const fetchCampaignsAndTemplates = async () => {
    try {
      const [campaignsRes, templatesRes] = await Promise.all([
        campaignsAPI.getAll({ teamId: team?.id }),
        templatesAPI.getAll({ teamId: team?.id }),
      ]);
      setCampaigns(campaignsRes.data);
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchTest = async () => {
    try {
      const response = await abTestsAPI.getById(id!);
      setTest(response.data);
    } catch (error) {
      console.error('Error fetching A/B test:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await abTestsAPI.create(formData);
      navigate(`/ab-tests/${response.data.id}`);
    } catch (error) {
      console.error('Error creating A/B test:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteTest = async () => {
    try {
      await abTestsAPI.complete(id!);
      const response = await abTestsAPI.getById(id!);
      setTest(response.data);
    } catch (error) {
      console.error('Error completing test:', error);
    }
  };

  const handleCampaignClick = () => {
    if (test?.campaignId) {
      navigate(`/campaigns/${test.campaignId}`);
    }
  };

  const handleTemplateClick = (templateId: string) => {
    navigate(`/templates/${templateId}`);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (isNew) {
    return (
      <div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/ab-tests')}
          style={{ marginBottom: '24px' }}
        >
          <ArrowLeft size={18} />
          Back to A/B Tests
        </button>

        <div className="card">
          <h2 style={{ fontWeight: '600', marginBottom: '24px' }}>Create New A/B Test</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Test Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Subject Line Test - Q1 Campaign"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Campaign *</label>
              <select
                name="campaignId"
                className="form-input"
                value={formData.campaignId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a campaign</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Variant A Template *</label>
                <select
                  name="variantATemplateId"
                  className="form-input"
                  value={formData.variantATemplateId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select template for Variant A</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Variant B Template *</label>
                <select
                  name="variantBTemplateId"
                  className="form-input"
                  value={formData.variantBTemplateId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select template for Variant B</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !formData.name || !formData.campaignId || !formData.variantATemplateId || !formData.variantBTemplateId}
              >
                <Save size={18} />
                {saving ? 'Creating...' : 'Create A/B Test'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/ab-tests')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!test) {
    return <div className="empty-state">A/B Test not found</div>;
  }

  const comparisonData = [
    { metric: 'Open Rate', variantA: parseFloat(test.variantA?.openRate || 0), variantB: parseFloat(test.variantB?.openRate || 0) },
    { metric: 'Reply Rate', variantA: parseFloat(test.variantA?.replyRate || 0), variantB: parseFloat(test.variantB?.replyRate || 0) },
  ];

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => navigate('/ab-tests')}
        style={{ marginBottom: '24px' }}
      >
        <ArrowLeft size={18} />
        Back to A/B Tests
      </button>

      <div className="detail-header">
        <div className="detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <h1 className="page-title">{test.name}</h1>
            <span className={`badge ${test.status}`}>
              {test.status === 'running' && <Clock size={12} style={{ marginRight: '4px' }} />}
              {test.status === 'completed' && <CheckCircle size={12} style={{ marginRight: '4px' }} />}
              {test.status}
            </span>
            {test.winner && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                background: '#fef3c7',
                color: '#d97706',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                <Trophy size={16} />
                Winner: Variant {test.winner}
              </span>
            )}
          </div>
          <p className="page-subtitle" style={{ cursor: 'pointer' }} onClick={handleCampaignClick}>
            Campaign: {test.campaignName}
          </p>
          <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '14px' }}>
            Started: {new Date(test.startedAt).toLocaleDateString()}
            {test.endedAt && ` | Ended: ${new Date(test.endedAt).toLocaleDateString()}`}
          </div>
        </div>
        {test.status === 'running' && (
          <button className="btn btn-primary" onClick={handleCompleteTest}>
            <StopCircle size={18} />
            End Test & Pick Winner
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <VariantDetailCard
          label="Variant A"
          data={test.variantA}
          isWinner={test.winner === 'A'}
          onTemplateClick={() => handleTemplateClick(test.variantA?.templateId)}
        />
        <VariantDetailCard
          label="Variant B"
          data={test.variantB}
          isWinner={test.winner === 'B'}
          onTemplateClick={() => handleTemplateClick(test.variantB?.templateId)}
        />
      </div>

      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Performance Comparison</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" domain={[0, 'auto']} stroke="#9ca3af" fontSize={12} />
              <YAxis type="category" dataKey="metric" stroke="#9ca3af" fontSize={12} width={80} />
              <Tooltip />
              <Legend />
              <Bar dataKey="variantA" fill="#4f46e5" name="Variant A" radius={[0, 4, 4, 0]} />
              <Bar dataKey="variantB" fill="#16a34a" name="Variant B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Statistical Significance</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          <div className="metric-item">
            <div className="metric-label">Total Sample Size</div>
            <div className="metric-value">{(test.variantA?.sent || 0) + (test.variantB?.sent || 0)}</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Open Rate Difference</div>
            <div className="metric-value" style={{
              color: parseFloat(test.variantA?.openRate || 0) > parseFloat(test.variantB?.openRate || 0) ? '#4f46e5' : '#16a34a'
            }}>
              {Math.abs(parseFloat(test.variantA?.openRate || 0) - parseFloat(test.variantB?.openRate || 0)).toFixed(1)}%
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Reply Rate Difference</div>
            <div className="metric-value" style={{
              color: parseFloat(test.variantA?.replyRate || 0) > parseFloat(test.variantB?.replyRate || 0) ? '#4f46e5' : '#16a34a'
            }}>
              {Math.abs(parseFloat(test.variantA?.replyRate || 0) - parseFloat(test.variantB?.replyRate || 0)).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VariantDetailCard: React.FC<{
  label: string;
  data: any;
  isWinner: boolean;
  onTemplateClick: () => void;
}> = ({ label, data, isWinner, onTemplateClick }) => (
  <div className="card" style={{
    border: isWinner ? '2px solid #16a34a' : '1px solid #e5e7eb',
    background: isWinner ? '#f0fdf4' : 'white'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h3 style={{ fontWeight: '600' }}>{label}</h3>
        {isWinner && <Trophy size={20} color="#16a34a" />}
      </div>
      {isWinner && (
        <span style={{
          padding: '4px 10px',
          background: '#16a34a',
          color: 'white',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          Winner
        </span>
      )}
    </div>

    <div
      style={{
        padding: '12px',
        background: isWinner ? 'white' : '#f9fafb',
        borderRadius: '8px',
        marginBottom: '16px',
        cursor: 'pointer'
      }}
      onClick={onTemplateClick}
    >
      <div style={{ fontWeight: '500', marginBottom: '4px' }}>{data?.name}</div>
      <div style={{ fontSize: '13px', color: '#6b7280' }}>{data?.subject}</div>
    </div>

    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      <div className="metric-item" style={{ padding: '12px' }}>
        <div className="metric-value" style={{ fontSize: '24px' }}>{data?.sent || 0}</div>
        <div className="metric-label">Emails Sent</div>
      </div>
      <div className="metric-item" style={{ padding: '12px' }}>
        <div className="metric-value" style={{ fontSize: '24px' }}>{data?.opens || 0}</div>
        <div className="metric-label">Opens</div>
      </div>
      <div className="metric-item" style={{ padding: '12px' }}>
        <div className="metric-value" style={{ fontSize: '24px' }}>{data?.openRate || 0}%</div>
        <div className="metric-label">Open Rate</div>
      </div>
      <div className="metric-item" style={{ padding: '12px' }}>
        <div className="metric-value" style={{ fontSize: '24px' }}>{data?.replyRate || 0}%</div>
        <div className="metric-label">Reply Rate</div>
      </div>
    </div>
  </div>
);

export default ABTestDetail;
