import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { meetingsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { SortHeader } from '../components/SortHeader';
import { ExportButtons } from '../components/ExportButtons';
import { SkeletonTable } from '../components/Skeleton';
import { Calendar, Plus, Search, Filter, Clock, DollarSign, CheckCircle } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  description: string;
  meetingType: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string;
  meetingLink: string;
  outcome: string;
  revenuePotential: number;
  contact: { id: string; name: string; company: string } | null;
  user: { id: string; name: string } | null;
  createdAt: string;
}

const Meetings: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('scheduledAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState('');

  const fetchMeetings = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const params: any = { teamId: team.id, page, limit, sortBy, sortOrder };
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await meetingsAPI.getAll(params);
      const data = response.data;
      if (Array.isArray(data)) {
        setMeetings(data);
        setTotal(data.length);
        setTotalPages(Math.ceil(data.length / limit));
      } else {
        setMeetings(data.meetings || data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / limit));
      }
    } catch (error) {
      showToast('Failed to load meetings', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, filter, search, page, limit, sortBy, sortOrder]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === meetings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(meetings.map(m => m.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    try {
      await meetingsAPI.bulkDelete(Array.from(selectedIds));
      showToast(`${selectedIds.size} meeting(s) deleted`, 'success');
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      fetchMeetings();
    } catch { showToast('Failed to delete meetings', 'error'); }
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateStatus) return;
    try {
      await meetingsAPI.bulkUpdate(Array.from(selectedIds), { status: bulkUpdateStatus });
      showToast(`${selectedIds.size} meeting(s) updated`, 'success');
      setSelectedIds(new Set());
      setShowBulkUpdateDialog(false);
      setBulkUpdateStatus('');
      fetchMeetings();
    } catch { showToast('Failed to update meetings', 'error'); }
  };

  const handleExportCSV = async () => {
    try {
      const response = await meetingsAPI.exportCSV(team?.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meetings.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('CSV exported successfully', 'success');
    } catch { showToast('Failed to export CSV', 'error'); }
  };

  const handleMeetingClick = (meetingId: string) => {
    navigate(`/meetings/${meetingId}`);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      scheduled: { bg: '#dbeafe', color: '#2563eb' },
      completed: { bg: '#dcfce7', color: '#16a34a' },
      cancelled: { bg: '#fee2e2', color: '#dc2626' },
      no_show: { bg: '#fef3c7', color: '#d97706' },
    };
    const style = styles[status] || styles.scheduled;
    return (
      <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', background: style.bg, color: style.color }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getOutcomeBadge = (outcome: string) => {
    if (!outcome) return null;
    const styles: Record<string, { bg: string; color: string }> = {
      positive: { bg: '#dcfce7', color: '#16a34a' },
      neutral: { bg: '#f3f4f6', color: '#6b7280' },
      negative: { bg: '#fee2e2', color: '#dc2626' },
    };
    const style = styles[outcome] || styles.neutral;
    return (
      <span style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '500', background: style.bg, color: style.color }}>
        {outcome}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const stats = {
    total: total,
    scheduled: meetings.filter(m => m.status === 'scheduled').length,
    completed: meetings.filter(m => m.status === 'completed').length,
    totalPipeline: meetings.reduce((sum, m) => sum + (m.revenuePotential || 0), 0),
  };

  const tabs = [
    { key: 'all', label: 'All Meetings' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const exportColumns = [
    { key: 'title', label: 'Title' },
    { key: 'meetingType', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'scheduledAt', label: 'Scheduled At' },
    { key: 'durationMinutes', label: 'Duration (min)' },
    { key: 'outcome', label: 'Outcome' },
    { key: 'revenuePotential', label: 'Revenue Potential' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="page-subtitle">{total} meetings in your pipeline</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <ExportButtons data={meetings} filename="meetings" columns={exportColumns} onExportCSV={handleExportCSV} />
          <button className="btn btn-primary" onClick={() => navigate('/meetings/new')}>
            <Plus size={18} /> Schedule Meeting
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => { setFilter('all'); setPage(1); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#ede9fe' }}><Calendar size={24} color="#7c3aed" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Meetings</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => { setFilter('scheduled'); setPage(1); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dbeafe' }}><Clock size={24} color="#2563eb" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.scheduled}</div>
            <div className="stat-label">Scheduled</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => { setFilter('completed'); setPage(1); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dcfce7' }}><CheckCircle size={24} color="#16a34a" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fef3c7' }}><DollarSign size={24} color="#d97706" /></div>
          <div className="stat-content">
            <div className="stat-value">${(stats.totalPipeline / 1000).toFixed(0)}K</div>
            <div className="stat-label">Pipeline Value</div>
          </div>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button key={tab.key} className={`tab ${filter === tab.key ? 'active' : ''}`}
            onClick={() => { setFilter(tab.key); setPage(1); }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <Search size={18} color="#9ca3af" />
          <input type="text" placeholder="Search meetings..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button className="btn btn-secondary"><Filter size={18} /> Filters</button>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '500', color: '#4f46e5' }}>{selectedIds.size} selected</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setShowBulkUpdateDialog(true)}>Update Status</button>
            <button className="btn btn-danger" onClick={() => setShowDeleteDialog(true)}>Delete Selected</button>
            <button className="btn btn-secondary" onClick={() => setSelectedIds(new Set())}>Deselect All</button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={10} columns={8} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" checked={selectedIds.size === meetings.length && meetings.length > 0}
                    onChange={handleSelectAll} />
                </th>
                <th><SortHeader label="Meeting" field="title" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th>Contact</th>
                <th><SortHeader label="Date & Time" field="scheduledAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Type" field="meetingType" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th>Outcome</th>
                <th><SortHeader label="Pipeline" field="revenuePotential" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              </tr>
            </thead>
            <tbody>
              {meetings.map(meeting => (
                <tr key={meeting.id} onClick={() => handleMeetingClick(meeting.id)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(meeting.id)}
                      onChange={() => handleSelectOne(meeting.id)} />
                  </td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{meeting.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {meeting.durationMinutes} min
                    </div>
                  </td>
                  <td>
                    {meeting.contact ? (
                      <div>
                        <div style={{ fontWeight: '500' }}>{meeting.contact.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{meeting.contact.company}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>No contact</span>
                    )}
                  </td>
                  <td>
                    <div>{formatDate(meeting.scheduledAt)}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatTime(meeting.scheduledAt)}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{meeting.meetingType.replace('_', ' ')}</td>
                  <td>{getStatusBadge(meeting.status)}</td>
                  <td>{getOutcomeBadge(meeting.outcome)}</td>
                  <td style={{ fontWeight: '500' }}>
                    {meeting.revenuePotential > 0 ? `$${meeting.revenuePotential.toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meetings.length === 0 && !loading && (
        <div className="empty-state">
          <Calendar size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No meetings found</h3>
          <p>Schedule a meeting to get started.</p>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} totalItems={total}
        itemsPerPage={limit} onPageChange={setPage}
        onItemsPerPageChange={(val) => { setLimit(val); setPage(1); }} />

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Meetings"
        message={`Are you sure you want to delete ${selectedIds.size} meeting(s)? This action cannot be undone.`}
        confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleBulkDelete} onCancel={() => setShowDeleteDialog(false)} />

      <ConfirmDialog isOpen={showBulkUpdateDialog} title="Update Meeting Status"
        message={
          <div>
            <p>Select new status for {selectedIds.size} meeting(s):</p>
            <select className="form-input" style={{ marginTop: '12px' }} value={bulkUpdateStatus}
              onChange={(e) => setBulkUpdateStatus(e.target.value)}>
              <option value="">Select status...</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
        }
        confirmLabel="Update" cancelLabel="Cancel" variant="info"
        onConfirm={handleBulkUpdate} onCancel={() => setShowBulkUpdateDialog(false)} />
    </div>
  );
};

export default Meetings;
