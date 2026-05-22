import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const STAGE_LABELS: Record<string, string> = {
  cold: 'Cold',
  contacted: 'Contacted',
  replied: 'Replied',
  meeting: 'Meeting',
  closed: 'Closed',
};

const STAGE_COLORS: Record<string, string> = {
  cold: '#94a3b8',
  contacted: '#3b82f6',
  replied: '#8b5cf6',
  meeting: '#f59e0b',
  closed: '#10b981',
};

const PipelineKanban: React.FC = () => {
  const [data, setData] = useState<{ stages: string[]; columns: Record<string, any[]>; totals: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_BASE_URL}/custom-views/pipeline-kanban`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div data-testid="kanban-loading">Loading pipeline...</div>;
  if (error) return <div data-testid="kanban-error" style={{ color: '#ef4444' }}>Error: {error}</div>;
  if (!data) return null;

  return (
    <div data-testid="pipeline-kanban" style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Pipeline Kanban</h2>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.stages.length}, 1fr)`, gap: 12 }}>
        {data.stages.map(stage => (
          <div key={stage} data-testid={`kanban-col-${stage}`} style={{ background: '#f8fafc', borderRadius: 8, padding: 10, minHeight: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `3px solid ${STAGE_COLORS[stage]}` }}>
              <strong style={{ color: STAGE_COLORS[stage] }}>{STAGE_LABELS[stage]}</strong>
              <span style={{ background: STAGE_COLORS[stage], color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 12 }}>
                {data.totals[stage]}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
              {data.columns[stage].slice(0, 50).map((card: any) => (
                <div key={card.id} className="kanban-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{card.name}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{card.company || '—'}</div>
                  {card.title && <div style={{ color: '#94a3b8', fontSize: 11 }}>{card.title}</div>}
                  {typeof card.leadScore === 'number' && (
                    <div style={{ marginTop: 4, fontSize: 11, color: STAGE_COLORS[stage] }}>Score: {card.leadScore}</div>
                  )}
                </div>
              ))}
              {data.columns[stage].length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>No prospects</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineKanban;
