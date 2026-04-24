import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { aiAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';
import {
  MessageCircle, Shield, TrendingUp, Plus, Eye, Trash2, Sparkles,
  Copy, CheckCircle, ThumbsUp, AlertCircle, Search
} from 'lucide-react';

interface Objection {
  id: string;
  objectionType: string;
  objectionText: string;
  responseStrategy: string;
  responseTemplates: Array<{ approach: string; response: string; tone: string; effectiveness: number }>;
  confidence: number;
  successRate: number;
  useCount: number;
  industry: string;
  buyerPersona: string;
  relatedObjections: string[];
  followUpQuestions: string[];
  aiInsights: string;
  createdAt: string;
}

const AIObjections: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);
  const [handling, setHandling] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    objectionText: '',
    industry: 'General',
    buyerPersona: 'Decision Maker',
    salesStage: 'Discovery'
  });

  useEffect(() => {
    if (team?.id) {
      fetchData();
    }
  }, [team?.id]);

  const fetchData = async () => {
    try {
      const response = await aiAPI.getObjections(team!.id);
      setObjections(response.data);
    } catch (error) {
      showToast('Error fetching objections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.objectionText) return;
    setHandling(true);
    try {
      await aiAPI.handleObjection({ teamId: team!.id, ...formData });
      await fetchData();
      setShowModal(false);
      setFormData({ objectionText: '', industry: 'General', buyerPersona: 'Decision Maker', salesStage: 'Discovery' });
      showToast('Objection response generated successfully', 'success');
    } catch (error) {
      showToast('Error generating objection response', 'error');
    } finally {
      setHandling(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this objection handler?')) {
      try {
        await aiAPI.deleteObjection(id);
        setObjections(objections.filter(o => o.id !== id));
        showToast('Objection handler deleted successfully', 'success');
      } catch (error) {
        showToast('Error deleting objection handler', 'error');
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Response copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUse = async (id: string) => {
    try {
      await aiAPI.useObjection(id);
      setObjections(objections.map(o => o.id === id ? { ...o, useCount: o.useCount + 1 } : o));
    } catch (error) {
      showToast('Error recording usage', 'error');
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      price: { bg: '#fef2f2', color: '#dc2626' },
      timing: { bg: '#fefce8', color: '#ca8a04' },
      competitor: { bg: '#faf5ff', color: '#7c3aed' },
      authority: { bg: '#eff6ff', color: '#2563eb' },
      need: { bg: '#f0fdf4', color: '#16a34a' },
      trust: { bg: '#fff7ed', color: '#ea580c' },
      default: { bg: '#f3f4f6', color: '#6b7280' }
    };
    const style = colors[type] || colors.default;
    return <span style={{ background: style.bg, color: style.color, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>{type}</span>;
  };

  const filteredObjections = objections.filter(obj => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      obj.objectionType?.toLowerCase().includes(query) ||
      obj.objectionText?.toLowerCase().includes(query) ||
      obj.responseStrategy?.toLowerCase().includes(query) ||
      obj.industry?.toLowerCase().includes(query) ||
      obj.buyerPersona?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Objection Handler</h1>
            <p className="page-subtitle">AI-powered responses to common sales objections</p>
          </div>
        </div>
        <SkeletonTable rows={8} columns={5} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Objection Handler</h1>
          <p className="page-subtitle">AI-powered responses to common sales objections</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add Objection
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon red"><MessageCircle size={20} /></div>
          <div className="stat-value">{objections.length}</div>
          <div className="stat-label">Objection Handlers</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={20} /></div>
          <div className="stat-value">{Math.round(objections.reduce((sum, o) => sum + o.successRate, 0) / objections.length || 0)}%</div>
          <div className="stat-label">Avg Success Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><ThumbsUp size={20} /></div>
          <div className="stat-value">{objections.reduce((sum, o) => sum + o.useCount, 0)}</div>
          <div className="stat-label">Total Uses</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Shield size={20} /></div>
          <div className="stat-value">{new Set(objections.map(o => o.objectionType)).size}</div>
          <div className="stat-label">Objection Types</div>
        </div>
      </div>

      {/* Search Box */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          className="form-input"
          placeholder="Search by type, objection text, strategy, or industry..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Objections Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '20px' }}>
        {filteredObjections.map(obj => (
          <div key={obj.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/ai/objections/${obj.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              {getTypeBadge(obj.objectionType)}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Used {obj.useCount}x</span>
                <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                  {obj.successRate}% success
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} /> OBJECTION
              </div>
              <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', fontStyle: 'italic', color: '#991b1b' }}>
                "{obj.objectionText}"
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#16a34a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> AI STRATEGY
              </div>
              <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', color: '#166534', fontWeight: '500' }}>
                {obj.responseStrategy}
              </div>
            </div>

            {obj.responseTemplates && obj.responseTemplates.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Best Response ({obj.responseTemplates[0].approach})</div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#374151', maxHeight: '80px', overflow: 'hidden' }}>
                  {obj.responseTemplates[0].response}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', padding: '4px 8px', borderRadius: '8px' }}>{obj.industry}</span>
                <span style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', padding: '4px 8px', borderRadius: '8px' }}>{obj.buyerPersona}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px' }}
                  onClick={() => {
                    handleCopy(obj.id, obj.responseTemplates[0]?.response || obj.responseStrategy);
                    handleUse(obj.id);
                  }}
                >
                  {copiedId === obj.id ? <CheckCircle size={16} style={{ color: '#16a34a' }} /> : <Copy size={16} />}
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => navigate(`/ai/objections/${obj.id}`)}>
                  <Eye size={16} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px', color: '#dc2626' }} onClick={() => handleDelete(obj.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredObjections.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            {searchQuery ? 'No objections match your search.' : 'No objection handlers yet. Add your first one!'}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '20px' }}>Handle New Objection with AI</h2>

            <div className="form-group">
              <label className="form-label">Objection</label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.objectionText}
                onChange={(e) => setFormData({ ...formData, objectionText: e.target.value })}
                placeholder='e.g., "Your solution is too expensive for our budget."'
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Industry</label>
                <select className="form-input" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })}>
                  <option value="General">General</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Enterprise">Enterprise</option>
                  <option value="SMB">SMB</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Buyer Persona</label>
                <select className="form-input" value={formData.buyerPersona} onChange={(e) => setFormData({ ...formData, buyerPersona: e.target.value })}>
                  <option value="Decision Maker">Decision Maker</option>
                  <option value="Executive">Executive</option>
                  <option value="Manager">Manager</option>
                  <option value="IT">IT</option>
                  <option value="Procurement">Procurement</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sales Stage</label>
                <select className="form-input" value={formData.salesStage} onChange={(e) => setFormData({ ...formData, salesStage: e.target.value })}>
                  <option value="Discovery">Discovery</option>
                  <option value="Demo">Demo</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Closing">Closing</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!formData.objectionText || handling}>
                <Sparkles size={18} />
                {handling ? 'Generating...' : 'Generate Response with AI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIObjections;
