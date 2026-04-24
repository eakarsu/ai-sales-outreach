import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard } from '../components/Skeleton';
import {
  ArrowLeft, MessageCircle, Edit, Trash2, Save, X, Copy, CheckCircle,
  Sparkles, TrendingUp, HelpCircle, Link
} from 'lucide-react';

const AIObjectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [objection, setObjection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchObjection();
  }, [id]);

  const fetchObjection = async () => {
    try {
      const response = await aiAPI.getObjection(id!);
      setObjection(response.data);
      setEditData(response.data);
    } catch (error) {
      showToast('Failed to load objection details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await aiAPI.updateObjection(id!, editData);
      setObjection({ ...objection, ...editData });
      setEditing(false);
      showToast('Objection handler updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update objection handler', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await aiAPI.deleteObjection(id!);
      showToast('Objection handler deleted successfully', 'success');
      navigate('/ai/objections');
    } catch (error) {
      showToast('Failed to delete objection handler', 'error');
    }
  };

  const handleCopy = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast('Response copied to clipboard', 'info');
    aiAPI.useObjection(id!);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/ai/objections')}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="page-title">Loading...</h1>
            </div>
          </div>
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!objection) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/ai/objections')}>
              <ArrowLeft size={18} /> Back
            </button>
            <div>
              <h1 className="page-title">Objection not found</h1>
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
          <button className="btn btn-secondary" onClick={() => navigate('/ai/objections')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title" style={{ textTransform: 'capitalize' }}>{objection.objectionType} Objection</h1>
            <p className="page-subtitle">{objection.industry} - {objection.buyerPersona}</p>
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

      {/* Stats Row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={20} /></div>
          <div className="stat-value">{objection.successRate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><MessageCircle size={20} /></div>
          <div className="stat-value">{objection.useCount}</div>
          <div className="stat-label">Times Used</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Sparkles size={20} /></div>
          <div className="stat-value">{objection.confidence}%</div>
          <div className="stat-label">AI Confidence</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div>
          {/* Objection */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
              <MessageCircle size={20} />
              The Objection
            </h3>
            <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '12px', fontSize: '18px', fontStyle: 'italic', color: '#991b1b', lineHeight: '1.6' }}>
              "{objection.objectionText}"
            </div>
          </div>

          {/* Strategy */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a' }}>
              <Sparkles size={20} />
              Response Strategy
            </h3>
            <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', fontSize: '16px', color: '#166534', fontWeight: '500', lineHeight: '1.6' }}>
              {objection.responseStrategy}
            </div>
          </div>

          {/* Response Templates */}
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Response Templates</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {objection.responseTemplates?.map((template: any, index: number) => (
                <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: '600' }}>{template.approach}</span>
                      <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                        {template.tone}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#16a34a', fontWeight: '600' }}>{template.effectiveness}% effective</span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleCopy(index, template.response)}
                      >
                        {copiedIndex === index ? <><CheckCircle size={14} style={{ color: '#16a34a' }} /> Copied</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '16px', lineHeight: '1.7', color: '#374151' }}>
                    {template.response}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          {/* AI Insights */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>AI Insights</h3>
            <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '12px', color: '#581c87', lineHeight: '1.6' }}>
              {objection.aiInsights}
            </div>
          </div>

          {/* Follow-up Questions */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={18} />
              Follow-up Questions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {objection.followUpQuestions?.map((question: string, i: number) => (
                <div key={i} style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', color: '#1e40af', fontSize: '14px' }}>
                  {question}
                </div>
              ))}
            </div>
          </div>

          {/* Related Objections */}
          <div className="card">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link size={18} />
              Related Objections
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {objection.relatedObjections?.map((related: string, i: number) => (
                <span key={i} style={{ background: '#f3f4f6', color: '#6b7280', padding: '8px 14px', borderRadius: '20px', fontSize: '13px' }}>
                  {related}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Objection Handler"
        message="Are you sure you want to delete this objection handler? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
};

export default AIObjectionDetail;
