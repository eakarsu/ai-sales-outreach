import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { aiAPI, contactsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';
import {
  Wand2, MessageSquare, User, Building, Sparkles, Plus,
  Eye, Trash2, Copy, CheckCircle, Search
} from 'lucide-react';

interface Personalization {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  company: string;
  jobTitle: string;
  personalizationType: string;
  originalContent: string;
  personalizedContent: string;
  tone: string;
  aiConfidence: number;
  engagementPrediction: number;
  createdAt: string;
}

const AIPersonalization: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    contactId: '',
    originalContent: '',
    tone: 'professional',
    focusArea: 'value_proposition',
    personalizationType: 'email'
  });

  useEffect(() => {
    if (team?.id) {
      fetchData();
    }
  }, [team?.id]);

  const fetchData = async () => {
    try {
      const [persRes, contactsRes] = await Promise.all([
        aiAPI.getPersonalizations(team!.id),
        contactsAPI.getAll({ teamId: team!.id })
      ]);
      setPersonalizations(persRes.data);
      setContacts(contactsRes.data.contacts || []);
    } catch (error) {
      showToast('Error fetching personalizations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.contactId || !formData.originalContent) return;
    setGenerating(true);
    try {
      await aiAPI.generatePersonalization({ teamId: team!.id, ...formData });
      await fetchData();
      setShowModal(false);
      setFormData({ contactId: '', originalContent: '', tone: 'professional', focusArea: 'value_proposition', personalizationType: 'email' });
      showToast('Personalization generated successfully', 'success');
    } catch (error) {
      showToast('Error generating personalization', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this personalization?')) {
      try {
        await aiAPI.deletePersonalization(id);
        setPersonalizations(personalizations.filter(p => p.id !== id));
        showToast('Personalization deleted successfully', 'success');
      } catch (error) {
        showToast('Error deleting personalization', 'error');
      }
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    showToast('Content copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getToneBadge = (tone: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      professional: { bg: '#eff6ff', color: '#2563eb' },
      casual: { bg: '#f0fdf4', color: '#16a34a' },
      consultative: { bg: '#faf5ff', color: '#7c3aed' },
      urgent: { bg: '#fef2f2', color: '#dc2626' },
      friendly: { bg: '#fefce8', color: '#ca8a04' }
    };
    const style = colors[tone] || colors.professional;
    return <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>{tone}</span>;
  };

  const filteredPersonalizations = personalizations.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.contactName?.toLowerCase().includes(query) ||
      p.contactEmail?.toLowerCase().includes(query) ||
      p.company?.toLowerCase().includes(query) ||
      p.jobTitle?.toLowerCase().includes(query) ||
      p.tone?.toLowerCase().includes(query) ||
      p.personalizationType?.toLowerCase().includes(query) ||
      p.originalContent?.toLowerCase().includes(query) ||
      p.personalizedContent?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Personalization Engine</h1>
            <p className="page-subtitle">Create highly personalized content for each prospect</p>
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
          <h1 className="page-title">AI Personalization Engine</h1>
          <p className="page-subtitle">Create highly personalized content for each prospect</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Create Personalization
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon purple"><Wand2 size={20} /></div>
          <div className="stat-value">{personalizations.length}</div>
          <div className="stat-label">Total Personalizations</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={20} /></div>
          <div className="stat-value">{Math.round(personalizations.reduce((sum, p) => sum + p.aiConfidence, 0) / personalizations.length || 0)}%</div>
          <div className="stat-label">Avg Confidence</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><MessageSquare size={20} /></div>
          <div className="stat-value">{personalizations.filter(p => p.personalizationType === 'email').length}</div>
          <div className="stat-label">Email Personalizations</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><User size={20} /></div>
          <div className="stat-value">{new Set(personalizations.map(p => p.contactId)).size}</div>
          <div className="stat-label">Unique Contacts</div>
        </div>
      </div>

      {/* Search Box */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, company, tone, or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Personalizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
        {filteredPersonalizations.map(p => (
          <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/ai/personalizations/${p.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{p.contactName}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{p.company} - {p.jobTitle}</div>
              </div>
              {getToneBadge(p.tone)}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>ORIGINAL</div>
              <div style={{ background: '#f3f4f6', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#6b7280', maxHeight: '60px', overflow: 'hidden' }}>
                {p.originalContent}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#7c3aed', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> AI PERSONALIZED
              </div>
              <div style={{ background: '#faf5ff', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#581c87', maxHeight: '80px', overflow: 'hidden' }}>
                {p.personalizedContent}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ fontSize: '12px' }}>
                  <span style={{ color: '#6b7280' }}>Confidence: </span>
                  <span style={{ fontWeight: '600', color: '#16a34a' }}>{p.aiConfidence}%</span>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <span style={{ color: '#6b7280' }}>Engagement: </span>
                  <span style={{ fontWeight: '600', color: '#2563eb' }}>{p.engagementPrediction}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px' }}
                  onClick={() => handleCopy(p.id, p.personalizedContent)}
                >
                  {copiedId === p.id ? <CheckCircle size={16} style={{ color: '#16a34a' }} /> : <Copy size={16} />}
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => navigate(`/ai/personalizations/${p.id}`)}>
                  <Eye size={16} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px', color: '#dc2626' }} onClick={() => handleDelete(p.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredPersonalizations.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            {searchQuery ? 'No personalizations match your search.' : 'No personalizations yet. Create your first one!'}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '20px' }}>Generate AI Personalization</h2>

            <div className="form-group">
              <label className="form-label">Select Contact</label>
              <select
                className="form-input"
                value={formData.contactId}
                onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
              >
                <option value="">Choose a contact...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} - {c.company}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Original Content</label>
              <textarea
                className="form-input"
                rows={4}
                value={formData.originalContent}
                onChange={(e) => setFormData({ ...formData, originalContent: e.target.value })}
                placeholder="Enter the content you want to personalize..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tone</label>
                <select
                  className="form-input"
                  value={formData.tone}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="consultative">Consultative</option>
                  <option value="urgent">Urgent</option>
                  <option value="friendly">Friendly</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Content Type</label>
                <select
                  className="form-input"
                  value={formData.personalizationType}
                  onChange={(e) => setFormData({ ...formData, personalizationType: e.target.value })}
                >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn Message</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="cold_outreach">Cold Outreach</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={!formData.contactId || !formData.originalContent || generating}>
                <Sparkles size={18} />
                {generating ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPersonalization;
