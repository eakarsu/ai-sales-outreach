import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { tasksAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { SortHeader } from '../components/SortHeader';
import { ExportButtons } from '../components/ExportButtons';
import { SkeletonTable } from '../components/Skeleton';
import { CheckSquare, Plus, Search, Filter, Clock, AlertTriangle, Circle, User } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  taskType: string;
  priority: string;
  status: string;
  dueDate: string;
  completedAt: string;
  contact: { id: string; name: string; company: string } | null;
  createdBy: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  campaign: { id: string; name: string } | null;
  createdAt: string;
}

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState<'status' | 'priority'>('status');
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');

  const fetchTasks = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const params: any = { teamId: team.id, page, limit, sortBy, sortOrder };
      if (filter !== 'all' && filter !== 'overdue') params.status = filter;
      if (search) params.search = search;
      const response = await tasksAPI.getAll(params);
      const data = response.data;
      if (Array.isArray(data)) {
        let filtered = data;
        if (filter === 'overdue') {
          filtered = data.filter((t: Task) => t.status !== 'completed' && new Date(t.dueDate) < new Date());
        }
        setTasks(filtered);
        setTotal(filtered.length);
        setTotalPages(Math.ceil(filtered.length / limit));
      } else {
        setTasks(data.tasks || data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / limit));
      }
    } catch (error) {
      showToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, filter, search, page, limit, sortBy, sortOrder]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

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
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    try {
      await tasksAPI.bulkDelete(Array.from(selectedIds));
      showToast(`${selectedIds.size} task(s) deleted`, 'success');
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      fetchTasks();
    } catch { showToast('Failed to delete tasks', 'error'); }
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateValue) return;
    try {
      await tasksAPI.bulkUpdate(Array.from(selectedIds), { [bulkUpdateField]: bulkUpdateValue });
      showToast(`${selectedIds.size} task(s) updated`, 'success');
      setSelectedIds(new Set());
      setShowBulkUpdateDialog(false);
      setBulkUpdateValue('');
      fetchTasks();
    } catch { showToast('Failed to update tasks', 'error'); }
  };

  const handleExportCSV = async () => {
    try {
      const response = await tasksAPI.exportCSV(team?.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tasks.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('CSV exported successfully', 'success');
    } catch { showToast('Failed to export CSV', 'error'); }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      high: { bg: '#fee2e2', color: '#dc2626' },
      medium: { bg: '#fef3c7', color: '#d97706' },
      low: { bg: '#f3f4f6', color: '#6b7280' },
    };
    const style = styles[priority] || styles.medium;
    return (
      <span style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '500', background: style.bg, color: style.color }}>
        {priority}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      pending: { bg: '#f3f4f6', color: '#6b7280' },
      in_progress: { bg: '#dbeafe', color: '#2563eb' },
      completed: { bg: '#dcfce7', color: '#16a34a' },
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', background: style.bg, color: style.color }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return <span style={{ color: '#dc2626', fontWeight: '500' }}>Overdue</span>;
    if (diffDays === 0) return <span style={{ color: '#d97706', fontWeight: '500' }}>Today</span>;
    if (diffDays === 1) return <span style={{ fontWeight: '500' }}>Tomorrow</span>;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const stats = {
    total: total,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()).length,
  };

  const tabs = [
    { key: 'all', label: 'All Tasks' },
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'overdue', label: 'Overdue' },
  ];

  const exportColumns = [
    { key: 'title', label: 'Title' },
    { key: 'taskType', label: 'Type' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'dueDate', label: 'Due Date' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{total} tasks to manage</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <ExportButtons data={tasks} filename="tasks" columns={exportColumns} onExportCSV={handleExportCSV} />
          <button className="btn btn-primary" onClick={() => navigate('/tasks/new')}>
            <Plus size={18} /> New Task
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => { setFilter('all'); setPage(1); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#ede9fe' }}><CheckSquare size={24} color="#7c3aed" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => { setFilter('pending'); setPage(1); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#f3f4f6' }}><Circle size={24} color="#6b7280" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => { setFilter('in_progress'); setPage(1); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dbeafe' }}><Clock size={24} color="#2563eb" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => { setFilter('overdue'); setPage(1); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fee2e2' }}><AlertTriangle size={24} color="#dc2626" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Overdue</div>
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
          <input type="text" placeholder="Search tasks..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button className="btn btn-secondary"><Filter size={18} /> Filters</button>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '500', color: '#4f46e5' }}>{selectedIds.size} selected</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => { setBulkUpdateField('status'); setShowBulkUpdateDialog(true); }}>Update Status</button>
            <button className="btn btn-secondary" onClick={() => { setBulkUpdateField('priority'); setShowBulkUpdateDialog(true); }}>Update Priority</button>
            <button className="btn btn-danger" onClick={() => setShowDeleteDialog(true)}>Delete Selected</button>
            <button className="btn btn-secondary" onClick={() => setSelectedIds(new Set())}>Deselect All</button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={10} columns={7} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" checked={selectedIds.size === tasks.length && tasks.length > 0}
                    onChange={handleSelectAll} />
                </th>
                <th><SortHeader label="Task" field="title" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Type" field="taskType" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Priority" field="priority" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Due Date" field="dueDate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} onClick={() => handleTaskClick(task.id)}
                  style={{ cursor: 'pointer', opacity: task.status === 'completed' ? 0.7 : 1 }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(task.id)}
                      onChange={() => handleSelectOne(task.id)} />
                  </td>
                  <td>
                    <div style={{
                      fontWeight: '500',
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      color: task.status === 'completed' ? '#9ca3af' : '#111827'
                    }}>
                      {task.title}
                    </div>
                    {task.contact && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {task.contact.name} - {task.contact.company}
                      </div>
                    )}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{task.taskType?.replace('_', ' ') || '-'}</td>
                  <td>{getPriorityBadge(task.priority)}</td>
                  <td>{getStatusBadge(task.status)}</td>
                  <td>{formatDueDate(task.dueDate)}</td>
                  <td>
                    {task.assignedTo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} color="#6b7280" />
                        <span style={{ fontSize: '13px' }}>{task.assignedTo.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tasks.length === 0 && !loading && (
        <div className="empty-state">
          <CheckSquare size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No tasks found</h3>
          <p>Create a task to get started.</p>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} totalItems={total}
        itemsPerPage={limit} onPageChange={setPage}
        onItemsPerPageChange={(val) => { setLimit(val); setPage(1); }} />

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Tasks"
        message={`Are you sure you want to delete ${selectedIds.size} task(s)? This action cannot be undone.`}
        confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleBulkDelete} onCancel={() => setShowDeleteDialog(false)} />

      <ConfirmDialog isOpen={showBulkUpdateDialog} title={`Update Task ${bulkUpdateField === 'status' ? 'Status' : 'Priority'}`}
        message={
          <div>
            <p>Select new {bulkUpdateField} for {selectedIds.size} task(s):</p>
            {bulkUpdateField === 'status' ? (
              <select className="form-input" style={{ marginTop: '12px' }} value={bulkUpdateValue}
                onChange={(e) => setBulkUpdateValue(e.target.value)}>
                <option value="">Select status...</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            ) : (
              <select className="form-input" style={{ marginTop: '12px' }} value={bulkUpdateValue}
                onChange={(e) => setBulkUpdateValue(e.target.value)}>
                <option value="">Select priority...</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            )}
          </div>
        }
        confirmLabel="Update" cancelLabel="Cancel" variant="info"
        onConfirm={handleBulkUpdate} onCancel={() => { setShowBulkUpdateDialog(false); setBulkUpdateValue(''); }} />
    </div>
  );
};

export default Tasks;
