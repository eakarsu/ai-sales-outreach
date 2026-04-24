import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { templatesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { SortHeader } from '../components/SortHeader';
import { ExportButtons } from '../components/ExportButtons';
import { SkeletonTable } from '../components/Skeleton';
import { FileText, Plus, Search, Filter, Sparkles, Copy } from 'lucide-react';

const Templates: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
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

  const fetchTemplates = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const params: any = { teamId: team.id, page, limit, sortBy, sortOrder };
      if (filter === 'ai') params.aiGenerated = 'true';
      else if (filter !== 'all') params.category = filter;
      if (search) params.search = search;
      const response = await templatesAPI.getAll(params);
      const data = response.data;
      if (Array.isArray(data)) {
        setTemplates(data);
        setTotal(data.length);
        setTotalPages(Math.ceil(data.length / limit));
      } else {
        setTemplates(data.templates || data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / limit));
      }
    } catch (error) {
      showToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, filter, search, page, limit, sortBy, sortOrder]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

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
    if (selectedIds.size === templates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(templates.map(t => t.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    try {
      await templatesAPI.bulkDelete(Array.from(selectedIds));
      showToast(`${selectedIds.size} templates deleted`, 'success');
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      fetchTemplates();
    } catch { showToast('Failed to delete templates', 'error'); }
  };

  const handleExportCSV = async () => {
    try {
      const response = await templatesAPI.exportCSV(team?.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'templates.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('CSV exported successfully', 'success');
    } catch { showToast('Failed to export CSV', 'error'); }
  };

  const handleTemplateClick = (templateId: string) => {
    navigate(`/templates/${templateId}`);
  };

  const handleCopyTemplate = (e: React.MouseEvent, body: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(body);
    showToast('Template copied to clipboard', 'success');
  };

  const tabs = [
    { key: 'all', label: 'All Templates' },
    { key: 'cold_outreach', label: 'Cold Outreach' },
    { key: 'follow_up', label: 'Follow-up' },
    { key: 'meeting_request', label: 'Meeting Request' },
    { key: 'ai', label: 'AI Generated' },
  ];

  const exportColumns = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'subject', label: 'Subject' },
    { key: 'openRate', label: 'Open Rate' },
    { key: 'replyRate', label: 'Reply Rate' },
    { key: 'usageCount', label: 'Usage Count' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Templates</h1>
          <p className="page-subtitle">{total} templates in your workspace</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <ExportButtons data={templates} filename="templates" columns={exportColumns} onExportCSV={handleExportCSV} />
          <button className="btn btn-secondary" onClick={() => navigate('/ai-assistant')}>
            <Sparkles size={18} /> AI Generate
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/templates/new')}>
            <Plus size={18} /> New Template
          </button>
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
          <input type="text" placeholder="Search templates..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button className="btn btn-secondary"><Filter size={18} /> Filters</button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '500', color: '#4f46e5' }}>{selectedIds.size} selected</span>
          <div style={{ display: 'flex', gap: '8px' }}>
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
                  <input type="checkbox" checked={selectedIds.size === templates.length && templates.length > 0}
                    onChange={handleSelectAll} />
                </th>
                <th><SortHeader label="Name" field="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Category" field="category" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th>Subject</th>
                <th><SortHeader label="Open Rate" field="openRate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Reply Rate" field="replyRate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Uses" field="usageCount" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th style={{ width: '60px' }}>Copy</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr key={template.id} onClick={() => handleTemplateClick(template.id)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(template.id)}
                      onChange={() => handleSelectOne(template.id)} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontWeight: '500' }}>{template.name}</div>
                      {template.isAiGenerated && (
                        <Sparkles size={14} color="#7c3aed" />
                      )}
                    </div>
                  </td>
                  <td><span className={`badge ${template.category}`}>{template.category?.replace('_', ' ')}</span></td>
                  <td>
                    <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6b7280', fontSize: '13px' }}>
                      {template.subject}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '50px', height: '6px', borderRadius: '3px', background: '#e5e7eb' }}>
                        <div style={{ width: `${Math.min(template.openRate || 0, 100)}%`, height: '100%', borderRadius: '3px', background: '#16a34a' }}></div>
                      </div>
                      <span style={{ fontWeight: '500' }}>{template.openRate?.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '50px', height: '6px', borderRadius: '3px', background: '#e5e7eb' }}>
                        <div style={{ width: `${Math.min(template.replyRate || 0, 100)}%`, height: '100%', borderRadius: '3px', background: '#7c3aed' }}></div>
                      </div>
                      <span style={{ fontWeight: '500' }}>{template.replyRate?.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: '500' }}>{template.usageCount}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-secondary" style={{ padding: '4px 8px' }}
                      onClick={(e) => handleCopyTemplate(e, template.body)}>
                      <Copy size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {templates.length === 0 && !loading && (
        <div className="empty-state">
          <FileText size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No templates found</h3>
          <p>Create your first template or let AI generate one for you.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/ai-assistant')}>
              <Sparkles size={18} /> AI Generate
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/templates/new')}>
              <Plus size={18} /> Create Template
            </button>
          </div>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} totalItems={total}
        itemsPerPage={limit} onPageChange={setPage}
        onItemsPerPageChange={(val) => { setLimit(val); setPage(1); }} />

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Templates"
        message={`Are you sure you want to delete ${selectedIds.size} template(s)? This action cannot be undone.`}
        confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleBulkDelete} onCancel={() => setShowDeleteDialog(false)} />
    </div>
  );
};

export default Templates;
