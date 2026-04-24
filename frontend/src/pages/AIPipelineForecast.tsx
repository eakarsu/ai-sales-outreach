import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { aiAPI } from '../services/api';
import {
  TrendingUp, DollarSign, Target, Calendar, Plus, Eye, Trash2, Sparkles,
  AlertTriangle, CheckCircle, BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Forecast {
  id: string;
  forecastPeriod: string;
  forecastDate: string;
  predictedRevenue: number;
  predictedDeals: number;
  confidence: number;
  pipelineHealth: string;
  riskAssessment: string;
  opportunities: Array<{ name: string; value: number; probability: number; expectedClose: string }>;
  recommendations: string[];
  aiAnalysis: string;
  scenarioBest: number;
  scenarioLikely: number;
  scenarioWorst: number;
  createdAt: string;
}

const AIPipelineForecast: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [forecastPeriod, setForecastPeriod] = useState('Next Quarter');

  useEffect(() => {
    if (team?.id) {
      fetchData();
    }
  }, [team?.id]);

  const fetchData = async () => {
    try {
      const response = await aiAPI.getForecasts(team!.id);
      setForecasts(response.data);
    } catch (error) {
      console.error('Error fetching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await aiAPI.generateForecast({ teamId: team!.id, forecastPeriod });
      await fetchData();
      setShowModal(false);
    } catch (error) {
      console.error('Error generating:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this forecast?')) {
      try {
        await aiAPI.deleteForecast(id);
        setForecasts(forecasts.filter(f => f.id !== id));
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const getHealthColor = (health: string) => {
    const colors: Record<string, string> = {
      'Healthy': '#16a34a', 'Strong': '#16a34a', 'Growing': '#22c55e',
      'At Risk': '#dc2626', 'Stable': '#2563eb', 'On Track': '#7c3aed'
    };
    return colors[health] || '#6b7280';
  };

  const latestForecast = forecasts[0];

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const scenarioData = latestForecast ? [
    { name: 'Worst Case', value: latestForecast.scenarioWorst, color: '#dc2626' },
    { name: 'Most Likely', value: latestForecast.scenarioLikely, color: '#7c3aed' },
    { name: 'Best Case', value: latestForecast.scenarioBest, color: '#16a34a' }
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Pipeline Forecaster</h1>
          <p className="page-subtitle">AI-powered revenue forecasting and pipeline analysis</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Generate Forecast
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon green"><DollarSign size={20} /></div>
          <div className="stat-value">${(latestForecast?.predictedRevenue || 0).toLocaleString()}</div>
          <div className="stat-label">Predicted Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Target size={20} /></div>
          <div className="stat-value">{latestForecast?.predictedDeals || 0}</div>
          <div className="stat-label">Predicted Deals</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><TrendingUp size={20} /></div>
          <div className="stat-value">{latestForecast?.confidence || 0}%</div>
          <div className="stat-label">Confidence</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><BarChart3 size={20} /></div>
          <div className="stat-value" style={{ color: getHealthColor(latestForecast?.pipelineHealth || '') }}>
            {latestForecast?.pipelineHealth || 'N/A'}
          </div>
          <div className="stat-label">Pipeline Health</div>
        </div>
      </div>

      {latestForecast && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Scenario Analysis */}
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Scenario Analysis</h3>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenarioData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {scenarioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="card">
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} style={{ color: '#f97316' }} />
              Risk Assessment
            </h3>
            <div style={{ background: '#fff7ed', padding: '20px', borderRadius: '12px', color: '#9a3412', lineHeight: '1.7', marginBottom: '20px' }}>
              {latestForecast.riskAssessment}
            </div>
            <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} style={{ color: '#16a34a' }} />
              Recommendations
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {latestForecast.recommendations?.map((rec, i) => (
                <li key={i} style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '8px', color: '#166534', fontSize: '14px' }}>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Forecasts Table */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>All Forecasts</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Predicted Revenue</th>
                <th>Deals</th>
                <th>Confidence</th>
                <th>Health</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map(f => (
                <tr key={f.id} onClick={() => navigate(`/ai/forecasts/${f.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: '500' }}>{f.forecastPeriod}</td>
                  <td style={{ fontWeight: '600', color: '#16a34a' }}>${f.predictedRevenue.toLocaleString()}</td>
                  <td>{f.predictedDeals}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${f.confidence}%`, height: '100%', background: '#7c3aed', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{f.confidence}%</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ background: `${getHealthColor(f.pipelineHealth)}15`, color: getHealthColor(f.pipelineHealth), padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                      {f.pipelineHealth}
                    </span>
                  </td>
                  <td style={{ color: '#6b7280' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => navigate(`/ai/forecasts/${f.id}`)}>
                        <Eye size={16} />
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px', color: '#dc2626' }} onClick={() => handleDelete(f.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '20px' }}>Generate AI Forecast</h2>
            <div className="form-group">
              <label className="form-label">Forecast Period</label>
              <select
                className="form-input"
                value={forecastPeriod}
                onChange={(e) => setForecastPeriod(e.target.value)}
              >
                <option value="Next 30 Days">Next 30 Days</option>
                <option value="Next 60 Days">Next 60 Days</option>
                <option value="Next 90 Days">Next 90 Days</option>
                <option value="Next Quarter">Next Quarter</option>
                <option value="Next Half">Next Half</option>
                <option value="Full Year">Full Year</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                <Sparkles size={18} />
                {generating ? 'Generating...' : 'Generate Forecast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPipelineForecast;
