import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Rule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  channel: 'email' | 'linkedin' | 'call' | 'sms';
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const blankRule = (): Omit<Rule, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  description: '',
  trigger: '',
  action: '',
  channel: 'email',
  priority: 10,
  enabled: true,
});

const OutreachRulesEditor: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(blankRule());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const token = () => localStorage.getItem('token');
  const auth = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/custom-views/rules`, auth());
      setRules(r.data?.rules || []);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (r: Rule) => {
    setEditingId(r.id);
    setDraft({
      name: r.name,
      description: r.description,
      trigger: r.trigger,
      action: r.action,
      channel: r.channel,
      priority: r.priority,
      enabled: r.enabled,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(blankRule());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name || !draft.trigger || !draft.action) {
      setError('Name, trigger and action are required');
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/custom-views/rules/${editingId}`, draft, auth());
      } else {
        await axios.post(`${API_BASE_URL}/custom-views/rules`, draft, auth());
      }
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this rule?')) return;
    setBusy(true);
    try {
      await axios.delete(`${API_BASE_URL}/custom-views/rules/${id}`, auth());
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (r: Rule) => {
    setBusy(true);
    try {
      await axios.put(`${API_BASE_URL}/custom-views/rules/${r.id}`, { enabled: !r.enabled }, auth());
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="outreach-rules-editor" style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e5e7eb' }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Outreach Rules</h2>
        <p style={{ color: '#64748b', margin: '4px 0 0' }}>
          CRUD automation rules — define triggers and downstream actions across email, LinkedIn, calls, and SMS.
        </p>
      </header>

      <form data-testid="rules-form" onSubmit={submit} style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        <input
          data-testid="rule-input-name"
          placeholder="Rule name"
          value={draft.name}
          onChange={e => setDraft({ ...draft, name: e.target.value })}
          style={{ gridColumn: 'span 2', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
        />
        <input
          data-testid="rule-input-trigger"
          placeholder="Trigger (e.g. no_reply_3_days)"
          value={draft.trigger}
          onChange={e => setDraft({ ...draft, trigger: e.target.value })}
          style={{ gridColumn: 'span 2', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
        />
        <input
          data-testid="rule-input-action"
          placeholder="Action (e.g. send_followup_2)"
          value={draft.action}
          onChange={e => setDraft({ ...draft, action: e.target.value })}
          style={{ gridColumn: 'span 2', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
        />
        <input
          data-testid="rule-input-description"
          placeholder="Description"
          value={draft.description}
          onChange={e => setDraft({ ...draft, description: e.target.value })}
          style={{ gridColumn: 'span 3', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
        />
        <select
          data-testid="rule-input-channel"
          value={draft.channel}
          onChange={e => setDraft({ ...draft, channel: e.target.value as Rule['channel'] })}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
        >
          <option value="email">email</option>
          <option value="linkedin">linkedin</option>
          <option value="call">call</option>
          <option value="sms">sms</option>
        </select>
        <input
          data-testid="rule-input-priority"
          type="number"
          min={1}
          max={99}
          value={draft.priority}
          onChange={e => setDraft({ ...draft, priority: Number(e.target.value) })}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input
            data-testid="rule-input-enabled"
            type="checkbox"
            checked={draft.enabled}
            onChange={e => setDraft({ ...draft, enabled: e.target.checked })}
          />
          Enabled
        </label>

        <div style={{ gridColumn: 'span 6', display: 'flex', gap: 8 }}>
          <button
            data-testid="rule-save-btn"
            type="submit"
            disabled={busy}
            style={{ background: '#4338ca', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}
          >
            {editingId ? 'Update rule' : 'Add rule'}
          </button>
          {editingId && (
            <button
              data-testid="rule-cancel-btn"
              type="button"
              onClick={cancelEdit}
              style={{ background: '#e2e8f0', color: '#0f172a', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <div data-testid="rules-error" style={{ color: '#ef4444', marginBottom: 12 }}>Error: {error}</div>}
      {loading ? (
        <div data-testid="rules-loading">Loading rules...</div>
      ) : (
        <div data-testid="rules-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map(r => (
            <div
              key={r.id}
              data-testid={`rule-row-${r.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 2fr 1fr 1fr auto',
                gap: 10,
                alignItems: 'center',
                padding: '10px 12px',
                background: r.enabled ? '#fff' : '#f1f5f9',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
              }}
            >
              <div>
                <strong>{r.name}</strong>
                <div style={{ fontSize: 12, color: '#64748b' }}>{r.description}</div>
              </div>
              <code style={{ fontSize: 12, background: '#eef2ff', padding: '2px 6px', borderRadius: 4 }}>{r.trigger}</code>
              <code style={{ fontSize: 12, background: '#ecfeff', padding: '2px 6px', borderRadius: 4 }}>{r.action}</code>
              <span style={{ fontSize: 12 }}>ch: {r.channel}</span>
              <span style={{ fontSize: 12 }}>p: {r.priority}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  data-testid={`rule-toggle-${r.id}`}
                  onClick={() => toggleEnabled(r)}
                  style={{ background: r.enabled ? '#10b981' : '#94a3b8', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                >
                  {r.enabled ? 'On' : 'Off'}
                </button>
                <button
                  data-testid={`rule-edit-${r.id}`}
                  onClick={() => startEdit(r)}
                  style={{ background: '#e2e8f0', color: '#0f172a', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                >
                  Edit
                </button>
                <button
                  data-testid={`rule-delete-${r.id}`}
                  onClick={() => remove(r.id)}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {rules.length === 0 && <div style={{ color: '#64748b' }}>No rules yet. Use the form above to add one.</div>}
        </div>
      )}
    </section>
  );
};

export default OutreachRulesEditor;
