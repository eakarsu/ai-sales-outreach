import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const CadencePlaybookPdf: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [lastDownload, setLastDownload] = useState<{ size: number; steps: string | null; preview: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const resp = await axios.get(`${API_BASE_URL}/custom-views/cadence-playbook.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cadence-playbook.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      const steps = resp.headers['x-playbook-steps'] || null;
      const previewRaw = resp.headers['x-playbook-preview'] || '';
      const preview = previewRaw ? decodeURIComponent(previewRaw) : '';
      setLastDownload({ size: blob.size, steps, preview });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to download playbook');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section data-testid="cadence-playbook-pdf" style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e5e7eb' }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Cadence Playbook PDF</h2>
        <p style={{ color: '#64748b', margin: '4px 0 0' }}>
          Generate a downloadable cadence playbook with subject lines, copy, and reply rates from your top templates.
        </p>
      </header>

      <button
        data-testid="cadence-download-btn"
        onClick={handleDownload}
        disabled={downloading}
        style={{
          background: downloading ? '#94a3b8' : '#4338ca',
          color: '#fff',
          border: 'none',
          padding: '10px 18px',
          borderRadius: 8,
          fontWeight: 600,
          cursor: downloading ? 'wait' : 'pointer',
        }}
      >
        {downloading ? 'Building PDF...' : 'Download Cadence Playbook PDF'}
      </button>

      {error && (
        <div data-testid="cadence-error" style={{ marginTop: 12, color: '#ef4444' }}>Error: {error}</div>
      )}

      {lastDownload && (
        <div data-testid="cadence-success" style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #4338ca' }}>
          <div><strong>Downloaded.</strong> {lastDownload.size.toLocaleString()} bytes — {lastDownload.steps ?? '?'} cadence steps.</div>
          {lastDownload.preview && (
            <pre data-testid="cadence-preview" style={{ marginTop: 8, fontSize: 12, whiteSpace: 'pre-wrap', color: '#334155', maxHeight: 160, overflow: 'auto' }}>
              {lastDownload.preview}
            </pre>
          )}
        </div>
      )}
    </section>
  );
};

export default CadencePlaybookPdf;
