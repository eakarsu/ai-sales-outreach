import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  sequenceStep: string;
  variables: string[];
}

const emptyTemplate: Template = { id: '', name: '', subject: '', body: '', sequenceStep: 'step_1', variables: [] };

const EmailTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [draft, setDraft] = useState<Template>(emptyTemplate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/custom-views/templates`, { headers: authHeaders() });
      setTemplates(r.data.templates || []);
    } catch (e: any) {
      setStatus(`Load failed: ${e?.response?.data?.error || e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const detectVars = (body: string): string[] => {
    const matches = body.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
    return Array.from(new Set(matches.map(v => v.replace(/[{}\s]/g, ''))));
  };

  const save = async () => {
    setStatus('');
    if (!draft.name || !draft.subject || !draft.body) {
      setStatus('name, subject, body are required');
      return;
    }
    const payload = { ...draft, variables: detectVars(draft.body) };
    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/custom-views/templates/${editingId}`, payload, { headers: authHeaders() });
        setStatus('Template updated');
      } else {
        await axios.post(`${API_BASE_URL}/custom-views/templates`, payload, { headers: authHeaders() });
        setStatus('Template created');
      }
      setDraft(emptyTemplate);
      setEditingId(null);
      fetchTemplates();
    } catch (e: any) {
      setStatus(`Save failed: ${e?.response?.data?.error || e.message}`);
    }
  };

  const edit = (t: Template) => {
    setDraft({ ...t, variables: t.variables || [] });
    setEditingId(t.id);
    setStatus('');
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/custom-views/templates/${id}`, { headers: authHeaders() });
      if (editingId === id) { setEditingId(null); setDraft(emptyTemplate); }
      fetchTemplates();
    } catch (e: any) {
      setStatus(`Delete failed: ${e?.response?.data?.error || e.message}`);
    }
  };

  const reset = () => { setDraft(emptyTemplate); setEditingId(null); setStatus(''); };

  return (
    <div data-testid="email-template-editor" style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
      <h2 style={{ marginTop: 0 }}>Email Template Editor</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, marginTop: 0 }}>{editingId ? 'Edit Template' : 'New Template'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              data-testid="tpl-name"
              placeholder="Template name"
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
            />
            <input
              data-testid="tpl-subject"
              placeholder="Subject ({{firstName}} supported)"
              value={draft.subject}
              onChange={e => setDraft({ ...draft, subject: e.target.value })}
              style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
            />
            <select
              data-testid="tpl-step"
              value={draft.sequenceStep}
              onChange={e => setDraft({ ...draft, sequenceStep: e.target.value })}
              style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
            >
              <option value="step_1">Step 1 (Cold)</option>
              <option value="step_2">Step 2 (Follow-up)</option>
              <option value="step_3">Step 3 (Break-up)</option>
              <option value="reply">Reply</option>
            </select>
            <textarea
              data-testid="tpl-body"
              placeholder="Body — use {{firstName}}, {{company}}, etc."
              value={draft.body}
              rows={8}
              onChange={e => setDraft({ ...draft, body: e.target.value })}
              style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
            />
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Detected vars: {detectVars(draft.body).join(', ') || '—'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button data-testid="tpl-save" onClick={save} style={{ padding: '8px 14px', background: '#3b82f6', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
                {editingId ? 'Update' : 'Create'}
              </button>
              <button data-testid="tpl-reset" onClick={reset} style={{ padding: '8px 14px', background: '#e2e8f0', border: 0, borderRadius: 6, cursor: 'pointer' }}>
                Reset
              </button>
            </div>
            {status && <div data-testid="tpl-status" style={{ fontSize: 12, color: status.includes('failed') ? '#ef4444' : '#10b981' }}>{status}</div>}
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 14, marginTop: 0 }}>Existing Templates ({templates.length})</h3>
          {loading ? <div>Loading…</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
              {templates.map(t => (
                <div key={t.id} data-testid={`tpl-row-${t.id}`} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{t.subject}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Step: {t.sequenceStep} • Vars: {(t.variables || []).join(', ') || '—'}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={() => edit(t)} style={{ padding: '4px 10px', fontSize: 12, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => remove(t.id)} style={{ padding: '4px 10px', fontSize: 12, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
              {templates.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>No templates yet.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
