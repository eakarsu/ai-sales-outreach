import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiAPI } from '../services/api';
import {
  ArrowLeft, TrendingUp, DollarSign, Target, Edit, Trash2, Save, X,
  AlertTriangle, CheckCircle, Calendar, Sparkles
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const AIPipelineForecastDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    fetchForecast();
  }, [id]);

  const fetchForecast = async () => {
    try {
      const response = await aiAPI.getForecast(id!);
      setForecast(response.data);
      setEditData(response.data);
    } catch (error) {
      console.error('Error fetching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await aiAPI.updateForecast(id!, editData);
      setForecast({ ...forecast, ...editData });
      setEditing(false);
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this forecast?')) {
      try {
        await aiAPI.deleteForecast(id!);
        navigate('/ai/forecasts');
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

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!forecast) {
    return <div>Forecast not found</div>;
  }

  const COLORS = ['#16a34a', '#7c3aed', '#2563eb', '#f97316', '#dc2626'];
  const opportunityData = forecast.opportunities?.map((opp: any, index: number) => ({
    name: opp.name,
    value: opp.value,
    color: COLORS[index % COLORS.length]
  })) || [];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/ai/forecasts')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{forecast.forecastPeriod} Forecast</h1>
            <p className="page-subtitle">Generated on {new Date(forecast.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {editing ? (
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}><X size={18} /> Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={18} /> Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(true)}><Edit size={18} /> Edit</button>
              <button className="btn btn-secondary" style={{ color: '#dc2626' }} onClick={handleDelete}><Trash2 size={18} /> Delete</button>
            </>
          )}
        </div>
      </div>

      {/* Main Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <DollarSign size={32} style={{ color: '#16a34a', marginBottom: '12px' }} />
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#16a34a' }}>${forecast.predictedRevenue.toLocaleString()}</div>
          <div style={{ color: '#6b7280' }}>Predicted Revenue</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <Target size={32} style={{ color: '#2563eb', marginBottom: '12px' }} />
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb' }}>{forecast.predictedDeals}</div>
          <div style={{ color: '#6b7280' }}>Predicted Deals</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <TrendingUp size={32} style={{ color: '#7c3aed', marginBottom: '12px' }} />
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#7c3aed' }}>{forecast.confidence}%</div>
          <div style={{ color: '#6b7280' }}>Confidence</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <Sparkles size={32} style={{ color: getHealthColor(forecast.pipelineHealth), marginBottom: '12px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: getHealthColor(forecast.pipelineHealth) }}>{forecast.pipelineHealth}</div>
          <div style={{ color: '#6b7280' }}>Pipeline Health</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Scenarios */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Revenue Scenarios</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f0fdf4', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#16a34a', marginBottom: '4px' }}>Best Case</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>${forecast.scenarioBest.toLocaleString()}</div>
              </div>
              <CheckCircle size={32} style={{ color: '#16a34a' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#faf5ff', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#7c3aed', marginBottom: '4px' }}>Most Likely</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>${forecast.scenarioLikely.toLocaleString()}</div>
              </div>
              <Target size={32} style={{ color: '#7c3aed' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fef2f2', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#dc2626', marginBottom: '4px' }}>Worst Case</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>${forecast.scenarioWorst.toLocaleString()}</div>
              </div>
              <AlertTriangle size={32} style={{ color: '#dc2626' }} />
            </div>
          </div>
        </div>

        {/* Opportunities Chart */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Top Opportunities</h3>
          {opportunityData.length > 0 ? (
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={opportunityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {opportunityData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No opportunity data</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* AI Analysis */}
        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: '#7c3aed' }} />
            AI Analysis
          </h3>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', lineHeight: '1.7', marginBottom: '24px' }}>
            {forecast.aiAnalysis}
          </div>

          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} style={{ color: '#f97316' }} />
            Risk Assessment
          </h3>
          <div style={{ background: '#fff7ed', padding: '20px', borderRadius: '12px', lineHeight: '1.7', color: '#9a3412' }}>
            {forecast.riskAssessment}
          </div>
        </div>

        <div>
          {/* Recommendations */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={20} style={{ color: '#16a34a' }} />
              Recommendations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {forecast.recommendations?.map((rec: string, i: number) => (
                <div key={i} style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', color: '#166534', fontSize: '14px' }}>
                  {rec}
                </div>
              ))}
            </div>
          </div>

          {/* Top Opportunities */}
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Opportunity Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {forecast.opportunities?.map((opp: any, i: number) => (
                <div key={i} style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '500' }}>{opp.name}</span>
                    <span style={{ fontWeight: '600', color: '#16a34a' }}>${opp.value.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Target size={12} /> {opp.probability}% probability
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {opp.expectedClose}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPipelineForecastDetail;
