import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { sequencesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { SortHeader } from '../components/SortHeader';
import { ExportButtons } from '../components/ExportButtons';
import { SkeletonTable } from '../components/Skeleton';
import { GitBranch, Play, Plus, Search, Filter, Users, TrendingUp } from 'lucide-react';

interface Sequence {
  id: string;
  name: string;
  description: string;
  status: string;
  triggerType: string;
  totalContacts: number;
  activeContacts: number;
  completedContacts: number;
  conversionRate: number;
  stepCount: number;
  createdBy: string;
  createdAt: string;
}

const Sequences: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState('');

  const fetchSequences = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const params: any = { teamId: team.id, page, limit, sortBy, sortOrder };
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await sequencesAPI.getAll(params);
      const data = response.data;
      if (Array.isArray(data)) {
        setSequences(data);
        setTotal(data.length);
        setTotalPages(Math.ceil(data.length / limit));
      } else {
        setSequences(data.sequences || data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / limit));
      }
    } catch (error) {
      showToast('Failed to load sequences', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, filter, search, page, limit, sortBy, sortOrder]);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

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
    if (selectedIds.size === sequences.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sequences.map(s => s.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    try {
      await sequencesAPI.bulkDelete(Array.from(selectedIds));
      showToast(`${selectedIds.size} sequence(s) deleted`, 'success');
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      fetchSequences();
    } catch { showToast('Failed to delete sequences', 'error'); }
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateStatus) return;
    try {
      await sequencesAPI.bulkUpdate(Array.from(selectedIds), { status: bulkUpdateStatus });
      showToast(`${selectedIds.size} sequence(s) updated`, 'success');
      setSelectedIds(new Set());
      setShowBulkUpdateDialog(false);
      setBulkUpdateStatus('');
      fetchSequences();
    } catch { showToast('Failed to update sequences', 'error'); }
  };

  const handleExportCSV = async () => {
    try {
      const response = await sequencesAPI.exportCSV(team?.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sequences.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('CSV exported successfully', 'success');
    } catch { showToast('Failed to export CSV', 'error'); }
  };

  const handleSequenceClick = (sequenceId: string) => {
    navigate(`/sequences/${sequenceId}`);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      active: { bg: '#dcfce7', color: '#16a34a' },
      paused: { bg: '#fef3c7', color: '#d97706' },
      completed: { bg: '#dbeafe', color: '#2563eb' },
      draft: { bg: '#f3f4f6', color: '#6b7280' },
    };
    const style = styles[status] || styles.draft;
    return (
      <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', background: style.bg, color: style.color }}>
        {status}
      </span>
    );
  };

  const stats = {
    total: total,
    active: sequences.filter(s => s.status === 'active').length,
    totalContacts: sequences.reduce((sum, s) => sum + (s.totalContacts || 0), 0),
    avgConversion: sequences.length > 0
      ? (sequences.reduce((sum, s) => sum + (s.conversionRate || 0), 0) / sequences.length).toFixed(1)
      : '0',
  };

  const tabs = [
    { key: 'all', label: 'All Sequences' },
    { key: 'active', label: 'Active' },
    { key: 'paused', label: 'Paused' },
    { key: 'draft', label: 'Draft' },
  ];

  const exportColumns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'triggerType', label: 'Trigger' },
    { key: 'totalContacts', label: 'Total Contacts' },
    { key: 'conversionRate', label: 'Conversion Rate' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sequences</h1>
          <p className="page-subtitle">{total} automated email sequences</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <ExportButtons data={sequences} filename="sequences" columns={exportColumns} onExportCSV={handleExportCSV} />
          <button className="btn btn-primary" onClick={() => navigate('/sequences/new')}>
            <Plus size={18} /> New Sequence
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => { setFilter('all'); setPage(1); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#ede9fe' }}><GitBranch size={24} color="#7c3aed" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Sequences</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => { setFilter('active'); setPage(1); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dcfce7' }}><Play size={24} color="#16a34a" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dbeafe' }}><Users size={24} color="#2563eb" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalContacts.toLocaleString()}</div>
            <div className="stat-label">Total Contacts</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fef3c7' }}><TrendingUp size={24} color="#d97706" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.avgConversion}%</div>
            <div className="stat-label">Avg Conversion</div>
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
          <input type="text" placeholder="Search sequences..." value={search}
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
                  <input type="checkbox" checked={selectedIds.size === sequences.length && sequences.length > 0}
                    onChange={handleSelectAll} />
                </th>
                <th><SortHeader label="Name" field="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th>Trigger</th>
                <th>Steps</th>
                <th><SortHeader label="Contacts" field="totalContacts" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th>Active / Completed</th>
                <th><SortHeader label="Conversion" field="conversionRate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              </tr>
            </thead>
            <tbody>
              {sequences.map(sequence => (
                <tr key={sequence.id} onClick={() => handleSequenceClick(sequence.id)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(sequence.id)}
                      onChange={() => handleSelectOne(sequence.id)} />
                  </td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{sequence.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{sequence.description}</div>
                  </td>
                  <td>{getStatusBadge(sequence.status)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{sequence.triggerType?.replace('_', ' ') || '-'}</td>
                  <td>{sequence.stepCount || 0} steps</td>
                  <td>{sequence.totalContacts || 0}</td>
                  <td>
                    <span style={{ color: '#16a34a', fontWeight: '500' }}>{sequence.activeContacts || 0}</span>
                    {' / '}
                    <span style={{ color: '#2563eb', fontWeight: '500' }}>{sequence.completedContacts || 0}</span>
                  </td>
                  <td style={{ fontWeight: '500', color: (sequence.conversionRate || 0) > 20 ? '#16a34a' : '#6b7280' }}>
                    {sequence.conversionRate || 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sequences.length === 0 && !loading && (
        <div className="empty-state">
          <GitBranch size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No sequences found</h3>
          <p>Create a sequence to automate your outreach.</p>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} totalItems={total}
        itemsPerPage={limit} onPageChange={setPage}
        onItemsPerPageChange={(val) => { setLimit(val); setPage(1); }} />

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Sequences"
        message={`Are you sure you want to delete ${selectedIds.size} sequence(s)? This action cannot be undone.`}
        confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleBulkDelete} onCancel={() => setShowDeleteDialog(false)} />

      <ConfirmDialog isOpen={showBulkUpdateDialog} title="Update Sequence Status"
        message={
          <div>
            <p>Select new status for {selectedIds.size} sequence(s):</p>
            <select className="form-input" style={{ marginTop: '12px' }} value={bulkUpdateStatus}
              onChange={(e) => setBulkUpdateStatus(e.target.value)}>
              <option value="">Select status...</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        }
        confirmLabel="Update" cancelLabel="Cancel" variant="info"
        onConfirm={handleBulkUpdate} onCancel={() => setShowBulkUpdateDialog(false)} />
    </div>
  );
};

export default Sequences;
