import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const sample = JSON.stringify([
  { account: 'Acme Health', text: 'Can you send pricing before our vendor meeting tomorrow?' },
  { account: 'Northstar', text: 'Not interested right now.' },
  { account: 'Vertex Labs', text: 'Security asked if you support SSO and SOC2.' }
], null, 2);

const AIReplyTriage: React.FC = () => {
  const [replies, setReplies] = useState(sample);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch(`${API_BASE}/ai/reply-triage/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replies: JSON.parse(replies) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Triage failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Triage failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reply Triage</h1>
        <p>Prioritize inbound replies by intent, urgency, and next-best sales action.</p>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <label>Replies JSON</label>
          <textarea className="form-control" rows={14} value={replies} onChange={(event) => setReplies(event.target.value)} />
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? 'Triaging...' : 'Triage replies'}</button>
        </div>
        <div className="card">
          {result ? (
            <div>
              <div className="stats-grid">
                <div className="stat-card"><span>Hot</span><strong>{result.hotCount}</strong></div>
                <div className="stat-card"><span>Suppress</span><strong>{result.suppressCount}</strong></div>
              </div>
              {result.triaged.map((item: any) => (
                <div key={item.id} className="list-item">
                  <div><strong>{item.account}</strong> <span className="badge">{item.intent}</span></div>
                  <div>Urgency {item.urgency}/100</div>
                  <p>{item.ownerAction}</p>
                  <small>{item.suggestedAsset}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>Run triage to rank replies for the team queue.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIReplyTriage;
