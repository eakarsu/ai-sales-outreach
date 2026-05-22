import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Cell { industry: string; hour: string; sent: number; replied: number; rate: number; }
interface HeatmapResponse {
  industries: string[];
  hours: string[];
  cells: Cell[];
  generatedAt: string;
}

const colorFor = (rate: number, maxRate: number): string => {
  if (maxRate <= 0) return '#f1f5f9';
  const t = Math.min(1, rate / maxRate);
  // Interpolate from #f1f5f9 (cool) to #4338ca (deep indigo)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = lerp(241, 67);
  const g = lerp(245, 56);
  const b = lerp(249, 202);
  return `rgb(${r}, ${g}, ${b})`;
};

const ReplyRateHeatmap: React.FC = () => {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Cell | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_BASE_URL}/custom-views/reply-heatmap`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  const maxRate = useMemo(() => {
    if (!data) return 0;
    return data.cells.reduce((m, c) => Math.max(m, c.rate), 0);
  }, [data]);

  const lookup = useMemo(() => {
    const map: Record<string, Cell> = {};
    if (!data) return map;
    for (const c of data.cells) map[`${c.industry}|${c.hour}`] = c;
    return map;
  }, [data]);

  if (loading) return <div data-testid="heatmap-loading" style={{ padding: 16 }}>Loading reply-rate heatmap...</div>;
  if (error) return <div data-testid="heatmap-error" style={{ color: '#ef4444', padding: 16 }}>Error: {error}</div>;
  if (!data) return null;

  return (
    <section data-testid="reply-rate-heatmap" style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e5e7eb' }}>
      <header style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ margin: 0 }}>Reply-Rate Heatmap</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Industry × send-hour bucket — darker = higher reply rate.</p>
        </div>
        <div data-testid="heatmap-max-rate" style={{ fontSize: 12, color: '#475569' }}>Peak rate: <strong>{maxRate}%</strong></div>
      </header>

      <div style={{ overflowX: 'auto' }}>
        <table data-testid="heatmap-grid" style={{ borderCollapse: 'separate', borderSpacing: 4, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#475569', fontSize: 12 }}>Industry</th>
              {data.hours.map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'center', color: '#475569', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.industries.map(ind => (
              <tr key={ind}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{ind}</td>
                {data.hours.map(h => {
                  const cell = lookup[`${ind}|${h}`];
                  const bg = colorFor(cell?.rate || 0, maxRate);
                  const dark = cell && cell.rate > maxRate * 0.55;
                  return (
                    <td
                      key={h}
                      data-testid={`heatmap-cell-${ind}-${h}`}
                      onClick={() => setSelected(cell)}
                      style={{
                        padding: '14px 8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: bg,
                        color: dark ? '#fff' : '#0f172a',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        minWidth: 64,
                      }}
                      title={cell ? `${ind} ${h}: ${cell.replied}/${cell.sent} (${cell.rate}%)` : ''}
                    >
                      {cell ? `${cell.rate}%` : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div data-testid="heatmap-selected" style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #4338ca' }}>
          <strong>{selected.industry}</strong> at <strong>{selected.hour}</strong>: {selected.replied} replies / {selected.sent} sent ({selected.rate}%)
        </div>
      )}
    </section>
  );
};

export default ReplyRateHeatmap;
