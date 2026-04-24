import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard } from '../components/Skeleton';
import {
  ArrowLeft, Target, TrendingUp, AlertTriangle, CheckCircle,
  Calendar, DollarSign, Edit, Trash2, Save, X, Sparkles
} from 'lucide-react';

const AILeadScoreDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [leadScore, setLeadScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchLeadScore();
  }, [id]);

  const fetchLeadScore = async () => {
    try {
      const response = await aiAPI.getLeadScore(id!);
      setLeadScore(response.data);
      setEditData(response.data);
    } catch (error) {
      showToast('Failed to load lead score details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await aiAPI.updateLeadScore(id!, editData);
      setLeadScore({ ...leadScore, ...editData });
      setEditing(false);
      showToast('Lead score updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update lead score', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await aiAPI.deleteLeadScore(id!);
      showToast('Lead score deleted successfully', 'success');
      navigate('/ai/lead-scores');
    } catch (error) {
      showToast('Failed to delete lead score', 'error');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#dc2626';
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/ai/lead-scores')}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="page-title">Loading...</h1>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!leadScore) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/ai/lead-scores')}>
              <ArrowLeft size={18} /> Back
            </button>
            <div>
              <h1 className="page-title">Lead score not found</h1>
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
          <button className="btn btn-secondary" onClick={() => navigate('/ai/lead-scores')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{leadScore.contactName}</h1>
            <p className="page-subtitle">{leadScore.company} - {leadScore.jobTitle}</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Score Card */}
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{
            width: '160px', height: '160px', borderRadius: '50%', margin: '0 auto 24px',
            background: `conic-gradient(${getScoreColor(leadScore.score)} ${leadScore.score * 3.6}deg, #e5e7eb 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              width: '140px', height: '140px', borderRadius: '50%', background: 'white',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ fontSize: '48px', fontWeight: '700', color: getScoreColor(leadScore.score) }}>
                {editing ? (
                  <input
                    type="number"
                    value={editData.score}
                    onChange={(e) => setEditData({ ...editData, score: parseInt(e.target.value) })}
                    style={{ width: '80px', fontSize: '32px', textAlign: 'center', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    min="0"
                    max="100"
                  />
                ) : leadScore.score}
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Lead Score</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{leadScore.confidence}%</div>
              <div style={{ color: '#6b7280', fontSize: '12px' }}>Confidence</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#16a34a' }}>${leadScore.predictedDealValue?.toLocaleString()}</div>
              <div style={{ color: '#6b7280', fontSize: '12px' }}>Predicted Value</div>
            </div>
          </div>

          <span style={{
            background: leadScore.engagementLevel === 'hot' ? '#fef2f2' : leadScore.engagementLevel === 'warm' ? '#fefce8' : '#f3f4f6',
            color: leadScore.engagementLevel === 'hot' ? '#dc2626' : leadScore.engagementLevel === 'warm' ? '#ca8a04' : '#6b7280',
            padding: '8px 20px', borderRadius: '20px', fontWeight: '600', textTransform: 'uppercase'
          }}>
            {leadScore.engagementLevel} Lead
          </span>
        </div>

        {/* Details Card */}
        <div className="card">
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: '#7c3aed' }} />
            AI Analysis
          </h3>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px', lineHeight: '1.6' }}>
            {leadScore.aiAnalysis}
          </div>

          <h4 style={{ marginBottom: '12px', color: '#374151' }}>Recommendation</h4>
          <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', marginBottom: '24px', color: '#16a34a', fontWeight: '500' }}>
            {leadScore.recommendation}
          </div>

          <h4 style={{ marginBottom: '12px', color: '#374151' }}>Next Best Action</h4>
          <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', marginBottom: '24px', color: '#2563eb', fontWeight: '500' }}>
            {leadScore.nextBestAction}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: '#16a34a' }} />
                Buying Signals
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {leadScore.buyingSignals?.map((signal: string, i: number) => (
                  <li key={i} style={{ padding: '8px 12px', background: '#ecfdf5', borderRadius: '8px', marginBottom: '8px', color: '#059669', fontSize: '14px' }}>
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                Risk Factors
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {leadScore.riskFactors?.map((risk: string, i: number) => (
                  <li key={i} style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', marginBottom: '8px', color: '#dc2626', fontSize: '14px' }}>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {leadScore.predictedCloseDate && (
            <div style={{ marginTop: '24px', padding: '16px', background: '#faf5ff', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={20} style={{ color: '#7c3aed' }} />
              <div>
                <div style={{ fontWeight: '500', color: '#7c3aed' }}>Predicted Close Date</div>
                <div style={{ color: '#6b7280' }}>{new Date(leadScore.predictedCloseDate).toLocaleDateString()}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Lead Score"
        message="Are you sure you want to delete this lead score? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
};

export default AILeadScoreDetail;
