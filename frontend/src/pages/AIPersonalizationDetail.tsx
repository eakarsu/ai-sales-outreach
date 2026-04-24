import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard } from '../components/Skeleton';
import {
  ArrowLeft, Wand2, Sparkles, Copy, CheckCircle, Edit, Trash2, Save, X,
  MessageSquare, Target, TrendingUp, User
} from 'lucide-react';

const AIPersonalizationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [personalization, setPersonalization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [copied, setCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchPersonalization();
  }, [id]);

  const fetchPersonalization = async () => {
    try {
      const response = await aiAPI.getPersonalization(id!);
      setPersonalization(response.data);
      setEditData(response.data);
    } catch (error) {
      showToast('Failed to load personalization details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await aiAPI.updatePersonalization(id!, editData);
      setPersonalization({ ...personalization, ...editData });
      setEditing(false);
      showToast('Personalization updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update personalization', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await aiAPI.deletePersonalization(id!);
      showToast('Personalization deleted successfully', 'success');
      navigate('/ai/personalizations');
    } catch (error) {
      showToast('Failed to delete personalization', 'error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(personalization.personalizedContent);
    setCopied(true);
    showToast('Content copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/ai/personalizations')}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="page-title">Loading...</h1>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <div>
            <SkeletonCard />
            <div style={{ marginTop: '24px' }}><SkeletonCard /></div>
          </div>
          <div>
            <SkeletonCard />
            <div style={{ marginTop: '24px' }}><SkeletonCard /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!personalization) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/ai/personalizations')}>
              <ArrowLeft size={18} /> Back
            </button>
            <div>
              <h1 className="page-title">Personalization not found</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/ai/personalizations')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{personalization.contactName}</h1>
            <p className="page-subtitle">{personalization.company} - {personalization.personalizationType}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {editing ? (
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}><X size={18} /> Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={18} /> Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(true)}><Edit size={18} /> Edit</button>
              <button className="btn btn-secondary" style={{ color: '#dc2626' }} onClick={() => setShowDeleteDialog(true)}><Trash2 size={18} /> Delete</button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Content Comparison */}
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Original Content</h3>
            <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '12px', lineHeight: '1.7', color: '#4b5563' }}>
              {personalization.originalContent}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} style={{ color: '#7c3aed' }} />
                AI Personalized Content
              </h3>
              <button className="btn btn-secondary" onClick={handleCopy}>
                {copied ? <><CheckCircle size={16} style={{ color: '#16a34a' }} /> Copied!</> : <><Copy size={16} /> Copy</>}
              </button>
            </div>
            {editing ? (
              <textarea
                className="form-input"
                rows={8}
                value={editData.personalizedContent}
                onChange={(e) => setEditData({ ...editData, personalizedContent: e.target.value })}
                style={{ marginBottom: '0' }}
              />
            ) : (
              <div style={{ background: '#faf5ff', padding: '20px', borderRadius: '12px', lineHeight: '1.7', color: '#581c87', border: '2px solid #e9d5ff' }}>
                {personalization.personalizedContent}
              </div>
            )}
          </div>
        </div>

        {/* Insights Panel */}
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>Metrics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '20px', background: '#f0fdf4', borderRadius: '12px' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#16a34a' }}>{personalization.aiConfidence}%</div>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>AI Confidence</div>
              </div>
              <div style={{ textAlign: 'center', padding: '20px', background: '#eff6ff', borderRadius: '12px' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb' }}>{personalization.engagementPrediction}%</div>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>Engagement Prediction</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <span style={{ color: '#6b7280' }}>Tone</span>
                <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{personalization.tone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <span style={{ color: '#6b7280' }}>Type</span>
                <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{personalization.personalizationType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <span style={{ color: '#6b7280' }}>Created</span>
                <span style={{ fontWeight: '500' }}>{new Date(personalization.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Industry Context</h3>
            <p style={{ color: '#6b7280', lineHeight: '1.6' }}>{personalization.industryContext}</p>
          </div>

          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Pain Points Addressed</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {personalization.painPoints?.map((point: string, i: number) => (
                <span key={i} style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
                  {point}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Value Propositions</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {personalization.valuePropositions?.map((prop: string, i: number) => (
                <span key={i} style={{ background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
                  {prop}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Personalization"
        message="Are you sure you want to delete this personalization? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
};

export default AIPersonalizationDetail;
