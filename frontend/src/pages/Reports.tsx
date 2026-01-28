import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { reportsAPI } from '../services/api';
import { FileText, Plus, Download, BarChart3, PieChart, TrendingUp, Users, Calendar } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  reportType: string;
  dateRange: string;
  status: string;
  fileUrl: string;
  createdBy: string;
  createdAt: string;
}

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { team, user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newReport, setNewReport] = useState({
    name: '',
    reportType: 'campaign_performance',
    dateRange: 'last_30_days'
  });

  useEffect(() => {
    if (team?.id) {
      fetchReports();
    }
  }, [team?.id]);

  const fetchReports = async () => {
    try {
      const response = await reportsAPI.getAll({ teamId: team?.id });
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      await reportsAPI.generate({
        teamId: team?.id,
        createdBy: user?.id,
        name: newReport.name,
        reportType: newReport.reportType,
        dateRange: newReport.dateRange
      });
      setShowModal(false);
      setNewReport({ name: '', reportType: 'campaign_performance', dateRange: 'last_30_days' });
      fetchReports();
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'campaign_performance': return <BarChart3 size={20} color="#2563eb" />;
      case 'email_analytics': return <TrendingUp size={20} color="#16a34a" />;
      case 'team_performance': return <Users size={20} color="#7c3aed" />;
      case 'contact_engagement': return <PieChart size={20} color="#d97706" />;
      case 'revenue_summary': return <TrendingUp size={20} color="#16a34a" />;
      default: return <FileText size={20} color="#6b7280" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDownload = async (reportId: string, reportName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await reportsAPI.getById(reportId);
      const reportData = response.data;
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const reportTypes = [
    { value: 'campaign_performance', label: 'Campaign Performance' },
    { value: 'email_analytics', label: 'Email Analytics' },
    { value: 'team_performance', label: 'Team Performance' },
    { value: 'contact_engagement', label: 'Contact Engagement' },
    { value: 'revenue_summary', label: 'Revenue Summary' },
  ];

  const dateRanges = [
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_14_days', label: 'Last 14 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' },
    { value: 'year_to_date', label: 'Year to Date' },
  ];

  if (loading) {
    return <div className="loading">Loading reports...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and view analytics reports</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Generate Report
        </button>
      </div>

      <div className="stats-grid">
        {reportTypes.slice(0, 4).map(type => {
          const count = reports.filter(r => r.reportType === type.value).length;
          return (
            <div key={type.value} className="stat-card" onClick={() => {}} style={{ cursor: 'pointer' }}>
              <div className="stat-icon" style={{ background: '#f3f4f6' }}>
                {getReportIcon(type.value)}
              </div>
              <div className="stat-content">
                <div className="stat-value">{count}</div>
                <div className="stat-label">{type.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Generated Reports</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Type</th>
              <th>Date Range</th>
              <th>Created By</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <tr key={report.id} onClick={() => navigate(`/reports/${report.id}`)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {getReportIcon(report.reportType)}
                    <span style={{ fontWeight: '500' }}>{report.name}</span>
                  </div>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{report.reportType.replace(/_/g, ' ')}</td>
                <td style={{ textTransform: 'capitalize' }}>{report.dateRange.replace(/_/g, ' ')}</td>
                <td>{report.createdBy}</td>
                <td>{formatDate(report.createdAt)}</td>
                <td>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px' }}
                    onClick={(e) => handleDownload(report.id, report.name, e)}
                  >
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {reports.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No reports generated yet. Click "Generate Report" to create your first report.
          </div>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '20px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Generate New Report</h3>

            <div className="form-group">
              <label className="form-label">Report Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Weekly Campaign Report"
                value={newReport.name}
                onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Report Type</label>
              <select
                className="form-input"
                value={newReport.reportType}
                onChange={(e) => setNewReport({ ...newReport, reportType: e.target.value })}
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date Range</label>
              <select
                className="form-input"
                value={newReport.dateRange}
                onChange={(e) => setNewReport({ ...newReport, dateRange: e.target.value })}
              >
                {dateRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleGenerateReport}
                disabled={generating || !newReport.name}
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
