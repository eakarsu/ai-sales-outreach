import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard } from '../components/Skeleton';
import { ArrowLeft, Clock, Calendar, Globe, Edit, Trash2, Save, X, AlertTriangle, TrendingUp } from 'lucide-react';

const AIBestTimeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [bestTime, setBestTime] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchBestTime();
  }, [id]);

  const fetchBestTime = async () => {
    try {
      const response = await aiAPI.getBestTime(id!);
      setBestTime(response.data);
      setEditData(response.data);
    } catch (error) {
      showToast('Failed to load best time prediction', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await aiAPI.updateBestTime(id!, editData);
      setBestTime({ ...bestTime, ...editData });
      setEditing(false);
      showToast('Best time prediction updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update best time prediction', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await aiAPI.deleteBestTime(id!);
      showToast('Best time prediction deleted successfully', 'success');
      navigate('/ai/best-times');
    } catch (error) {
      showToast('Failed to delete best time prediction', 'error');
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/ai/best-times')}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="page-title">Loading...</h1>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
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

  if (!bestTime) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/ai/best-times')}>
              <ArrowLeft size={18} /> Back
            </button>
            <div>
              <h1 className="page-title">Best time prediction not found</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const engagementPatterns = bestTime.engagementPatterns || {};

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/ai/best-times')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{bestTime.contactName}</h1>
            <p className="page-subtitle">{bestTime.company} - Best Contact Time Analysis</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <Calendar size={48} style={{ color: '#16a34a', marginBottom: '16px' }} />
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#16a34a', marginBottom: '8px' }}>
            {editing ? (
              <select
                className="form-input"
                value={editData.bestDay}
                onChange={(e) => setEditData({ ...editData, bestDay: e.target.value })}
                style={{ fontSize: '20px', textAlign: 'center' }}
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            ) : bestTime.bestDay}
          </div>
          <div style={{ color: '#6b7280' }}>Best Day</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <Clock size={48} style={{ color: '#7c3aed', marginBottom: '16px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed', marginBottom: '8px' }}>
            {formatTime(bestTime.bestTimeStart)} - {formatTime(bestTime.bestTimeEnd)}
          </div>
          <div style={{ color: '#6b7280' }}>Optimal Window</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <TrendingUp size={48} style={{ color: '#2563eb', marginBottom: '16px' }} />
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb', marginBottom: '8px' }}>{bestTime.confidence}%</div>
          <div style={{ color: '#6b7280' }}>Confidence</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>AI Reasoning</h3>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', lineHeight: '1.7' }}>
              {bestTime.aiReasoning}
            </div>
          </div>

          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Industry Insights</h3>
            <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '12px', lineHeight: '1.7', color: '#1e40af' }}>
              {bestTime.industryInsights}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Engagement Patterns</h3>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '20px', background: '#fefce8', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#ca8a04' }}>{engagementPatterns.morning || 60}%</div>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>Morning</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '20px', background: '#fef2f2', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>{engagementPatterns.afternoon || 40}%</div>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>Afternoon</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '20px', background: '#f3f4f6', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#6b7280' }}>{engagementPatterns.evening || 10}%</div>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>Evening</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <Globe size={18} style={{ color: '#6b7280' }} />
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Timezone</div>
                  <div style={{ fontWeight: '500' }}>{bestTime.timezone}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <Calendar size={18} style={{ color: '#6b7280' }} />
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Optimal Frequency</div>
                  <div style={{ fontWeight: '500' }}>{bestTime.optimalFrequency}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} style={{ color: '#dc2626' }} />
              Times to Avoid
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bestTime.avoidTimes?.map((time: string, i: number) => (
                <div key={i} style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>
                  {time}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Best Time Prediction"
        message="Are you sure you want to delete this best time prediction? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
};

export default AIBestTimeDetail;
