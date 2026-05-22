import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList, Cell } from 'recharts';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface FunnelStage { stage: string; value: number; pct: number; }
interface FunnelResponse {
  stages: FunnelStage[];
  conversions: { openRate: number; replyRate: number; meetingRate: number };
  generatedAt: string;
}

const STAGE_COLORS: Record<string, string> = {
  Sent: '#3b82f6',
  Opened: '#06b6d4',
  Replied: '#8b5cf6',
  Meeting: '#f59e0b',
};

const OutreachFunnelChart: React.FC = () => {
  const [data, setData] = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_BASE_URL}/custom-views/funnel`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div data-testid="funnel-loading" style={{ padding: 16 }}>Loading outreach funnel...</div>;
  if (error) return <div data-testid="funnel-error" style={{ color: '#ef4444', padding: 16 }}>Error: {error}</div>;
  if (!data) return null;

  const chartData = data.stages.map(s => ({ ...s, label: `${s.value.toLocaleString()} (${s.pct}%)` }));

  return (
    <section data-testid="outreach-funnel-chart" style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e5e7eb' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Outreach Funnel</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Sent → Opened → Replied → Meeting</p>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <div data-testid="funnel-open-rate"><strong>Open</strong>: {data.conversions.openRate}%</div>
          <div data-testid="funnel-reply-rate"><strong>Reply</strong>: {data.conversions.replyRate}%</div>
          <div data-testid="funnel-meeting-rate"><strong>Meeting</strong>: {data.conversions.meetingRate}%</div>
        </div>
      </header>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 32, left: 24, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="stage" tick={{ fontSize: 13, fontWeight: 600 }} width={90} />
            <Tooltip
              formatter={(value: any, _name: any, p: any) => [`${value.toLocaleString()} (${p?.payload?.pct}%)`, p?.payload?.stage]}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || '#3b82f6'} />
              ))}
              <LabelList dataKey="label" position="right" style={{ fill: '#0f172a', fontSize: 12, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div data-testid="funnel-stage-table" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: `repeat(${data.stages.length}, 1fr)`, gap: 8 }}>
        {data.stages.map(s => (
          <div key={s.stage} data-testid={`funnel-stage-${s.stage.toLowerCase()}`} style={{ background: '#f8fafc', borderRadius: 8, padding: 12, borderLeft: `4px solid ${STAGE_COLORS[s.stage] || '#3b82f6'}` }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.stage}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: '#0f172a' }}>{s.pct}% of sent</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OutreachFunnelChart;
