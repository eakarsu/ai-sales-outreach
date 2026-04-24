import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard } from '../components/Skeleton';
import { ArrowLeft, Download, Trash2, Calendar, User, FileBarChart } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  reportType: string;
  dateRange: string;
  filters: any;
  data: any;
  status: string;
  fileUrl: string;
  createdBy: string;
  createdAt: string;
}

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchReport();
    }
  }, [id]);

  const fetchReport = async () => {
    try {
      const response = await reportsAPI.getById(id!);
      setReport(response.data);
    } catch (error) {
      showToast('Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await reportsAPI.delete(id!);
      showToast('Report deleted successfully', 'success');
      navigate('/reports');
    } catch (error) {
      showToast('Failed to delete report', 'error');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleDownload = async () => {
    if (!report) return;
    try {
      const blob = new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Report downloaded', 'success');
    } catch (error) {
      showToast('Failed to download report', 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => navigate('/reports')} style={{ marginBottom: '20px' }}>
          <ArrowLeft size={18} /> Back to Reports
        </button>
        <SkeletonCard />
        <div style={{ marginTop: '24px' }}>
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!report) {
    return <div>Report not found</div>;
  }

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/reports')} style={{ marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Back to Reports
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{report.name}</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{report.reportType.replace(/_/g, ' ')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handleDownload}>
            <Download size={18} /> Export PDF
          </button>
          <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={18} /> Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Report Data</h3>

            {report.data && (
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', overflow: 'auto' }}>
                <pre style={{ fontSize: '13px', margin: 0 }}>
                  {JSON.stringify(report.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Report Details</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileBarChart size={20} color="#6b7280" />
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Report Type</div>
                  <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{report.reportType.replace(/_/g, ' ')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={20} color="#6b7280" />
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Date Range</div>
                  <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{report.dateRange.replace(/_/g, ' ')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User size={20} color="#6b7280" />
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Created By</div>
                  <div style={{ fontWeight: '500' }}>{report.createdBy}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={20} color="#6b7280" />
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Created</div>
                  <div style={{ fontWeight: '500' }}>{formatDate(report.createdAt)}</div>
                </div>
              </div>

              <div style={{
                marginTop: '8px',
                padding: '12px',
                background: report.status === 'completed' ? '#dcfce7' : '#fef3c7',
                borderRadius: '8px'
              }}>
                <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                  Status: {report.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Report"
        message={`Are you sure you want to delete "${report.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default ReportDetail;
