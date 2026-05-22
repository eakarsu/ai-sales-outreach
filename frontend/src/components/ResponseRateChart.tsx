import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ResponseRateChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_BASE_URL}/custom-views/response-rate`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        const rows = (r.data?.data || []).slice(0, 12).map((d: any) => ({
          name: d.template?.length > 18 ? d.template.slice(0, 16) + '…' : d.template,
          fullName: d.template,
          replyRate: Math.round((d.replyRate || 0) * 100) / 100,
          openRate: Math.round((d.openRate || 0) * 100) / 100,
        }));
        setData(rows);
      })
      .catch(e => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div data-testid="chart-loading">Loading chart...</div>;
  if (error) return <div data-testid="chart-error" style={{ color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div data-testid="response-rate-chart" style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
      <h2 style={{ marginTop: 0 }}>Response Rate by Template</h2>
      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} unit="%" />
            <Tooltip formatter={(v: any) => `${v}%`} />
            <Legend />
            <Bar dataKey="replyRate" name="Reply Rate" fill="#8b5cf6" />
            <Bar dataKey="openRate" name="Open Rate" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {data.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>No templates with reply data yet.</div>}
    </div>
  );
};

export default ResponseRateChart;
