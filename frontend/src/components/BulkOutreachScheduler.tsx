import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Prospect { id: string; name: string; email: string; company: string; status: string; }
interface Template { id: string; name: string; subject: string; sequenceStep: string; }

const BulkOutreachScheduler: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState<string>('');
  const [start, setStart] = useState<string>(new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16));
  const [end, setEnd] = useState<string>(new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16));
  const [throttle, setThrottle] = useState<number>(30);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const fetchData = useCallback(async () => {
    try {
      const [kRes, tRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/custom-views/pipeline-kanban`, { headers: authHeaders() }),
        axios.get(`${API_BASE_URL}/custom-views/templates`, { headers: authHeaders() }),
      ]);
      const all: Prospect[] = [];
      const cols = kRes.data?.columns || {};
      for (const stage of Object.keys(cols)) {
        for (const c of cols[stage]) {
          all.push({ id: c.id, name: c.name, email: c.email, company: c.company, status: stage });
        }
      }
      setProspects(all);
      setTemplates(tRes.data?.templates || []);
      if (tRes.data?.templates?.[0]) setTemplateId(tRes.data.templates[0].id);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === prospects.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(prospects.map(p => p.id)));
  };

  const submit = async () => {
    setError(null);
    setResult(null);
    if (selectedIds.size === 0) { setError('Select at least one prospect'); return; }
    if (!templateId) { setError('Select a template'); return; }
    setSubmitting(true);
    try {
      const r = await axios.post(`${API_BASE_URL}/custom-views/schedule-bulk`, {
        prospectIds: Array.from(selectedIds),
        templateId,
        sendWindow: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
        throttlePerHour: throttle,
      }, { headers: authHeaders() });
      setResult(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="bulk-outreach-scheduler" style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
      <h2 style={{ marginTop: 0 }}>Bulk Outreach Scheduler</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Prospects ({selectedIds.size}/{prospects.length} selected)</strong>
            <button data-testid="bos-toggle-all" onClick={toggleAll} style={{ padding: '4px 10px', fontSize: 12, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}>
              {selectedIds.size === prospects.length ? 'Clear All' : 'Select All'}
            </button>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            {prospects.map(p => (
              <label key={p.id} data-testid={`bos-prospect-${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggle(p.id)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{p.email} • {p.company || '—'}</div>
                </div>
                <span style={{ fontSize: 10, padding: '2px 6px', background: '#e0e7ff', color: '#3730a3', borderRadius: 8 }}>{p.status}</span>
              </label>
            ))}
            {prospects.length === 0 && <div style={{ padding: 12, color: '#94a3b8' }}>No prospects.</div>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, color: '#475569' }}>Template
            <select data-testid="bos-template" value={templateId} onChange={e => setTemplateId(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 4 }}>
              <option value="">— Select template —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.sequenceStep})</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: '#475569' }}>Window start
            <input data-testid="bos-start" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, color: '#475569' }}>Window end
            <input data-testid="bos-end" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, color: '#475569' }}>Throttle (sends/hour)
            <input data-testid="bos-throttle" type="number" min={1} max={500} value={throttle} onChange={e => setThrottle(parseInt(e.target.value) || 30)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 4 }} />
          </label>
          <button data-testid="bos-submit" onClick={submit} disabled={submitting} style={{ padding: '10px 14px', background: submitting ? '#94a3b8' : '#10b981', color: '#fff', border: 0, borderRadius: 6, cursor: submitting ? 'wait' : 'pointer', marginTop: 6 }}>
            {submitting ? 'Scheduling…' : 'Schedule Bulk Sends'}
          </button>
          {error && <div data-testid="bos-error" style={{ color: '#ef4444', fontSize: 12 }}>{error}</div>}
          {result && (
            <div data-testid="bos-result" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: 10, fontSize: 12 }}>
              <div><strong>Scheduled:</strong> {result.scheduled}</div>
              <div><strong>Conflicts:</strong> {result.conflicts?.length || 0}</div>
              {result.conflicts?.length > 0 && (
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {result.conflicts.slice(0, 5).map((c: any, i: number) => (
                    <li key={i} style={{ color: '#92400e' }}>{c.prospectId?.slice(0, 8)}…: {c.reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkOutreachScheduler;
