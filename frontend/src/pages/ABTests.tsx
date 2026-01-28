import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { abTestsAPI } from '../services/api';
import { FlaskConical, Plus, Search, Trophy, Clock, CheckCircle } from 'lucide-react';

const ABTests: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchTests = async () => {
      if (!team?.id) return;
      try {
        const params: any = { teamId: team.id };
        if (filter !== 'all') params.status = filter;
        const response = await abTestsAPI.getAll(params);
        setTests(response.data);
      } catch (error) {
        console.error('Error fetching A/B tests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [team?.id, filter]);

  const handleTestClick = (testId: string) => {
    navigate(`/ab-tests/${testId}`);
  };

  const tabs = [
    { key: 'all', label: 'All Tests' },
    { key: 'running', label: 'Running' },
    { key: 'completed', label: 'Completed' },
  ];

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">A/B Tests</h1>
          <p className="page-subtitle">Optimize your emails with data-driven testing</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/ab-tests/new')}>
          <Plus size={18} />
          New A/B Test
        </button>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${filter === tab.key ? 'active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card-grid">
        {tests.map(test => (
          <div
            key={test.id}
            className="card clickable"
            onClick={() => handleTestClick(test.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>{test.name}</h3>
                <span className={`badge ${test.status}`}>
                  {test.status === 'running' && <Clock size={12} style={{ marginRight: '4px' }} />}
                  {test.status === 'completed' && <CheckCircle size={12} style={{ marginRight: '4px' }} />}
                  {test.status}
                </span>
              </div>
              {test.winner && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: '#fef3c7',
                  color: '#d97706',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  <Trophy size={14} />
                  Winner: {test.winner}
                </div>
              )}
            </div>

            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
              Campaign: {test.campaignName}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <VariantCard
                label="Variant A"
                name={test.variantAName}
                sent={test.variantASent}
                openRate={test.variantAOpenRate}
                replyRate={test.variantAReplyRate}
                isWinner={test.winner === 'A'}
              />
              <VariantCard
                label="Variant B"
                name={test.variantBName}
                sent={test.variantBSent}
                openRate={test.variantBOpenRate}
                replyRate={test.variantBReplyRate}
                isWinner={test.winner === 'B'}
              />
            </div>
          </div>
        ))}
      </div>

      {tests.length === 0 && (
        <div className="empty-state">
          <FlaskConical size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No A/B tests found</h3>
          <p>Create your first A/B test to optimize your email performance.</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/ab-tests/new')}>
            <Plus size={18} />
            Create A/B Test
          </button>
        </div>
      )}
    </div>
  );
};

const VariantCard: React.FC<{
  label: string;
  name: string;
  sent: number;
  openRate: string;
  replyRate: string;
  isWinner: boolean;
}> = ({ label, name, sent, openRate, replyRate, isWinner }) => (
  <div style={{
    padding: '12px',
    background: isWinner ? '#dcfce7' : '#f9fafb',
    borderRadius: '8px',
    border: isWinner ? '2px solid #16a34a' : '1px solid #e5e7eb'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
      <span style={{ fontWeight: '600', fontSize: '13px' }}>{label}</span>
      {isWinner && <Trophy size={14} color="#16a34a" />}
    </div>
    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{name}</div>
    <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
      <div>
        <span style={{ color: '#6b7280' }}>Sent: </span>
        <span style={{ fontWeight: '500' }}>{sent}</span>
      </div>
      <div>
        <span style={{ color: '#6b7280' }}>Opens: </span>
        <span style={{ fontWeight: '500' }}>{openRate}%</span>
      </div>
      <div>
        <span style={{ color: '#6b7280' }}>Replies: </span>
        <span style={{ fontWeight: '500' }}>{replyRate}%</span>
      </div>
    </div>
  </div>
);

export default ABTests;
