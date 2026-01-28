import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { aiAPI } from '../services/api';
import {
  Sparkles, Send, Wand2, FileText, Mail, Lightbulb,
  CheckCircle, Copy, RefreshCw, BarChart3, Download, Zap
} from 'lucide-react';

const AIAssistant: React.FC = () => {
  const navigate = useNavigate();
  const { team, user } = useAuth();
  const [activeTab, setActiveTab] = useState('generate');
  const [loading, setLoading] = useState(false);

  // Generate Email State
  const [emailType, setEmailType] = useState('cold_outreach');
  const [context, setContext] = useState({
    firstName: '',
    company: '',
    industry: '',
    topic: ''
  });
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);

  // Analyze Email State
  const [emailToAnalyze, setEmailToAnalyze] = useState({ subject: '', body: '' });
  const [analysis, setAnalysis] = useState<any>(null);

  // Subject Lines State
  const [subjectContext, setSubjectContext] = useState({ company: '', trigger: '' });
  const [subjectLines, setSubjectLines] = useState<string[]>([]);

  // Improve Email State
  const [emailToImprove, setEmailToImprove] = useState({ subject: '', body: '' });
  const [improvements, setImprovements] = useState<string[]>([]);
  const [improvedEmail, setImprovedEmail] = useState<{ subject: string; body: string } | null>(null);

  const handleGenerateEmail = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.generateEmail({
        teamId: team?.id,
        userId: user?.id,
        type: emailType,
        context
      });
      setGeneratedEmail({
        subject: response.data.subject,
        body: response.data.body
      });
    } catch (error) {
      console.error('Error generating email:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeEmail = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.analyzeEmail(emailToAnalyze);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error analyzing email:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSubjects = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.generateSubjectLines({
        teamId: team?.id,
        userId: user?.id,
        context: subjectContext,
        count: 5
      });
      setSubjectLines(response.data.subjectLines);
    } catch (error) {
      console.error('Error generating subject lines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImproveEmail = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.improveEmail({
        teamId: team?.id,
        userId: user?.id,
        subject: emailToImprove.subject,
        body: emailToImprove.body,
        improvements
      });
      setImprovedEmail({
        subject: response.data.subject,
        body: response.data.body
      });
    } catch (error) {
      console.error('Error improving email:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleImprovement = (improvement: string) => {
    if (improvements.includes(improvement)) {
      setImprovements(improvements.filter(i => i !== improvement));
    } else {
      setImprovements([...improvements, improvement]);
    }
  };

  const handleSaveAsTemplate = () => {
    if (generatedEmail) {
      navigate('/templates/new', { state: generatedEmail });
    }
  };

  // Example data loaders
  const loadGenerateExample = () => {
    setEmailType('cold_outreach');
    setContext({
      firstName: 'Sarah',
      company: 'TechVentures Inc',
      industry: 'SaaS Technology',
      topic: 'Series B funding announcement'
    });
  };

  const loadSubjectExample = () => {
    setSubjectContext({
      company: 'CloudScale Solutions',
      trigger: 'recent product launch'
    });
  };

  const loadAnalyzeExample = () => {
    setEmailToAnalyze({
      subject: 'Quick question about your sales process',
      body: `Hi John,

I noticed that TechCorp recently expanded into the European market - congratulations on the growth!

I'm reaching out because we help fast-growing companies like yours streamline their sales outreach. Our AI-powered platform has helped similar companies:

- Increase reply rates by 3x
- Save 15+ hours per week on email personalization
- Book 40% more qualified meetings

Would you be open to a quick 15-minute call this week to see if we might be a good fit?

Best regards,
Alex Thompson
Sales Director`
    });
  };

  const loadImproveExample = () => {
    setEmailToImprove({
      subject: 'Following up on our conversation',
      body: `Hi there,

I wanted to follow up on our previous conversation about your sales challenges.

We have a platform that can help you with sales automation. It has many features and can integrate with your CRM.

Let me know if you want to talk more.

Thanks,
John`
    });
    setImprovements(['make_shorter', 'more_personal']);
  };

  const tabs = [
    { key: 'generate', label: 'Generate Email', icon: Wand2 },
    { key: 'improve', label: 'Improve Email', icon: Zap },
    { key: 'subjects', label: 'Subject Lines', icon: Lightbulb },
    { key: 'analyze', label: 'Analyze Email', icon: BarChart3 },
  ];

  const improvementOptions = [
    { key: 'make_shorter', label: 'Make Shorter', description: 'Reduce length while keeping key points' },
    { key: 'more_personal', label: 'More Personal', description: 'Add personalization and warmth' },
    { key: 'add_social_proof', label: 'Add Social Proof', description: 'Include credibility indicators' },
    { key: 'stronger_cta', label: 'Stronger CTA', description: 'Improve call-to-action' },
    { key: 'better_subject', label: 'Better Subject', description: 'Optimize subject line' },
    { key: 'fix_grammar', label: 'Fix Grammar', description: 'Correct grammar and spelling' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-subtitle">Generate and optimize your sales emails with AI</p>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} style={{ marginRight: '6px' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'generate' && (
        <div className="detail-grid">
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: '600' }}>Generate AI Email</h3>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                  onClick={loadGenerateExample}
                >
                  <Download size={16} />
                  Load Example
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Email Type</label>
                <select
                  className="form-input"
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value)}
                >
                  <option value="cold_outreach">Cold Outreach</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="meeting_request">Meeting Request</option>
                  <option value="personalized">Personalized</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Recipient's First Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., John"
                  value={context.firstName}
                  onChange={(e) => setContext({ ...context, firstName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Acme Corp"
                  value={context.company}
                  onChange={(e) => setContext({ ...context, company: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Industry</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Technology"
                  value={context.industry}
                  onChange={(e) => setContext({ ...context, industry: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Topic/Trigger (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Recent funding round"
                  value={context.topic}
                  onChange={(e) => setContext({ ...context, topic: e.target.value })}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleGenerateEmail}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw size={18} className="spinning" />
                ) : (
                  <Sparkles size={18} />
                )}
                {loading ? 'Generating...' : 'Generate Email'}
              </button>
            </div>
          </div>

          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: '600' }}>Generated Email</h3>
                {generatedEmail && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px' }}
                      onClick={() => navigator.clipboard.writeText(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`)}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 12px' }}
                      onClick={handleSaveAsTemplate}
                    >
                      <FileText size={16} />
                      Save as Template
                    </button>
                  </div>
                )}
              </div>

              {generatedEmail ? (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '8px',
                  padding: '20px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Subject</div>
                    <div style={{ fontWeight: '600' }}>{generatedEmail.subject}</div>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {generatedEmail.body}
                  </div>
                </div>
              ) : (
                <div style={{
                  height: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  color: '#6b7280'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Sparkles size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p>Fill in the details and click Generate</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'improve' && (
        <div className="detail-grid">
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: '600' }}>Improve Your Email</h3>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                  onClick={loadImproveExample}
                >
                  <Download size={16} />
                  Load Example
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Subject Line</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your subject line"
                  value={emailToImprove.subject}
                  onChange={(e) => setEmailToImprove({ ...emailToImprove, subject: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Body</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Paste your email content here..."
                  value={emailToImprove.body}
                  onChange={(e) => setEmailToImprove({ ...emailToImprove, body: e.target.value })}
                  style={{ minHeight: '150px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Improvements to Apply</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {improvementOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => toggleImprovement(opt.key)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: improvements.includes(opt.key) ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                        background: improvements.includes(opt.key) ? '#eef2ff' : '#fff',
                        color: improvements.includes(opt.key) ? '#4f46e5' : '#374151',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={opt.description}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleImproveEmail}
                disabled={loading || !emailToImprove.subject || !emailToImprove.body || improvements.length === 0}
              >
                {loading ? <RefreshCw size={18} className="spinning" /> : <Zap size={18} />}
                {loading ? 'Improving...' : 'Improve Email'}
              </button>
            </div>
          </div>

          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: '600' }}>Improved Email</h3>
                {improvedEmail && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px' }}
                      onClick={() => navigator.clipboard.writeText(`Subject: ${improvedEmail.subject}\n\n${improvedEmail.body}`)}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 12px' }}
                      onClick={() => navigate('/templates/new', { state: improvedEmail })}
                    >
                      <FileText size={16} />
                      Save as Template
                    </button>
                  </div>
                )}
              </div>

              {improvedEmail ? (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '8px',
                  padding: '20px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Subject</div>
                    <div style={{ fontWeight: '600' }}>{improvedEmail.subject}</div>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {improvedEmail.body}
                  </div>
                </div>
              ) : (
                <div style={{
                  height: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  color: '#6b7280'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Zap size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p>Paste your email and select improvements</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="detail-grid">
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: '600' }}>Generate Subject Lines</h3>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                  onClick={loadSubjectExample}
                >
                  <Download size={16} />
                  Load Example
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Acme Corp"
                  value={subjectContext.company}
                  onChange={(e) => setSubjectContext({ ...subjectContext, company: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Trigger/Event (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., LinkedIn post, funding announcement"
                  value={subjectContext.trigger}
                  onChange={(e) => setSubjectContext({ ...subjectContext, trigger: e.target.value })}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleGenerateSubjects}
                disabled={loading}
              >
                {loading ? <RefreshCw size={18} className="spinning" /> : <Lightbulb size={18} />}
                {loading ? 'Generating...' : 'Generate Subject Lines'}
              </button>
            </div>
          </div>

          <div>
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Subject Line Ideas</h3>

              {subjectLines.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {subjectLines.map((subject, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <span>{subject}</span>
                      <button
                        style={{ background: 'none', color: '#6b7280', padding: '4px' }}
                        onClick={() => navigator.clipboard.writeText(subject)}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  height: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  color: '#6b7280'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Lightbulb size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p>Generate subject line ideas</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analyze' && (
        <div className="detail-grid">
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: '600' }}>Analyze Your Email</h3>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                  onClick={loadAnalyzeExample}
                >
                  <Download size={16} />
                  Load Example
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Subject Line</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your subject line"
                  value={emailToAnalyze.subject}
                  onChange={(e) => setEmailToAnalyze({ ...emailToAnalyze, subject: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Body</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Paste your email content here..."
                  value={emailToAnalyze.body}
                  onChange={(e) => setEmailToAnalyze({ ...emailToAnalyze, body: e.target.value })}
                  style={{ minHeight: '200px' }}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleAnalyzeEmail}
                disabled={loading || !emailToAnalyze.subject || !emailToAnalyze.body}
              >
                {loading ? <RefreshCw size={18} className="spinning" /> : <BarChart3 size={18} />}
                {loading ? 'Analyzing...' : 'Analyze Email'}
              </button>
            </div>
          </div>

          <div>
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Analysis Results</h3>

              {analysis ? (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      border: `8px solid ${analysis.overallScore >= 80 ? '#16a34a' : analysis.overallScore >= 60 ? '#ea580c' : '#dc2626'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}>
                      <span style={{ fontSize: '36px', fontWeight: '700' }}>{analysis.overallScore}</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Score</span>
                    </div>
                  </div>

                  <div className="metric-row" style={{ marginBottom: '20px' }}>
                    <div className="metric-item">
                      <div className="metric-value">{analysis.estimatedOpenRate}%</div>
                      <div className="metric-label">Est. Open Rate</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-value">{analysis.estimatedReplyRate}%</div>
                      <div className="metric-label">Est. Reply Rate</div>
                    </div>
                  </div>

                  <h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Suggestions</h4>
                  <ul style={{ paddingLeft: '20px', color: '#6b7280', marginBottom: '16px' }}>
                    {analysis.suggestions?.map((s: string, i: number) => (
                      <li key={i} style={{ marginBottom: '8px' }}>{s}</li>
                    ))}
                  </ul>

                  <h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Positives</h4>
                  <ul style={{ paddingLeft: '20px', color: '#16a34a' }}>
                    {analysis.positives?.map((p: string, i: number) => (
                      <li key={i} style={{ marginBottom: '8px' }}>{p}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{
                  height: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  color: '#6b7280'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <BarChart3 size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p>Paste your email to get AI analysis</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
