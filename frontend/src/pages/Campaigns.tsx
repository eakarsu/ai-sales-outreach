import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { campaignsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { SortHeader } from '../components/SortHeader';
import { ExportButtons } from '../components/ExportButtons';
import { SkeletonTable } from '../components/Skeleton';
import { Mail, Plus, Search, Filter, Play, Pause } from 'lucide-react';

const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
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

  const fetchCampaigns = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const params: any = { teamId: team.id, page, limit, sortBy, sortOrder };
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await campaignsAPI.getAll(params);
      const data = response.data;
      if (Array.isArray(data)) {
        setCampaigns(data);
        setTotal(data.length);
        setTotalPages(Math.ceil(data.length / limit));
      } else {
        setCampaigns(data.campaigns || data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / limit));
      }
    } catch (error) {
      showToast('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, filter, search, page, limit, sortBy, sortOrder]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

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
    if (selectedIds.size === campaigns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(campaigns.map(c => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    try {
      await campaignsAPI.bulkDelete(Array.from(selectedIds));
      showToast(`${selectedIds.size} campaigns deleted`, 'success');
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      fetchCampaigns();
    } catch { showToast('Failed to delete campaigns', 'error'); }
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateStatus) return;
    try {
      await campaignsAPI.bulkUpdate(Array.from(selectedIds), { status: bulkUpdateStatus });
      showToast(`${selectedIds.size} campaigns updated`, 'success');
      setSelectedIds(new Set());
      setShowBulkUpdateDialog(false);
      fetchCampaigns();
    } catch { showToast('Failed to update campaigns', 'error'); }
  };

  const handleExportCSV = async () => {
    try {
      const response = await campaignsAPI.exportCSV(team?.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'campaigns.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('CSV exported successfully', 'success');
    } catch { showToast('Failed to export CSV', 'error'); }
  };

  const handleCampaignClick = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  const handleStatusChange = async (e: React.MouseEvent, campaignId: string, newStatus: string) => {
    e.stopPropagation();
    try {
      if (newStatus === 'active') {
        await campaignsAPI.start(campaignId);
      } else {
        await campaignsAPI.pause(campaignId);
      }
      setCampaigns(campaigns.map(c =>
        c.id === campaignId ? { ...c, status: newStatus } : c
      ));
      showToast(`Campaign ${newStatus === 'active' ? 'started' : 'paused'}`, 'success');
    } catch {
      showToast('Failed to update campaign status', 'error');
    }
  };

  const tabs = [
    { key: 'all', label: 'All Campaigns' },
    { key: 'active', label: 'Active' },
    { key: 'paused', label: 'Paused' },
    { key: 'draft', label: 'Draft' },
    { key: 'completed', label: 'Completed' },
  ];

  const exportColumns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'type', label: 'Type' },
    { key: 'emailsSent', label: 'Emails Sent' },
    { key: 'openRate', label: 'Open Rate' },
    { key: 'replyRate', label: 'Reply Rate' },
    { key: 'meetingsBooked', label: 'Meetings Booked' },
    { key: 'revenueGenerated', label: 'Revenue' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">{total} campaigns in your workspace</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <ExportButtons data={campaigns} filename="campaigns" columns={exportColumns} onExportCSV={handleExportCSV} />
          <button className="btn btn-primary" onClick={() => navigate('/campaigns/new')}>
            <Plus size={18} /> New Campaign
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
          <input type="text" placeholder="Search campaigns..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button className="btn btn-secondary"><Filter size={18} /> Filters</button>
      </div>

      {/* Bulk Actions Bar */}
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
                  <input type="checkbox" checked={selectedIds.size === campaigns.length && campaigns.length > 0}
                    onChange={handleSelectAll} />
                </th>
                <th><SortHeader label="Name" field="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Emails Sent" field="emailsSent" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Open Rate" field="openRate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th>Reply Rate</th>
                <th>Meetings</th>
                <th><SortHeader label="Revenue" field="revenueGenerated" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th style={{ width: '60px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => (
                <tr key={campaign.id} onClick={() => handleCampaignClick(campaign.id)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(campaign.id)}
                      onChange={() => handleSelectOne(campaign.id)} />
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: '500' }}>{campaign.name}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>{campaign.description || 'No description'}</div>
                    </div>
                  </td>
                  <td><span className={`badge ${campaign.status}`}>{campaign.status}</span></td>
                  <td>{campaign.emailsSent?.toLocaleString() || 0}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '50px', height: '6px', borderRadius: '3px', background: '#e5e7eb' }}>
                        <div style={{ width: `${Math.min(campaign.openRate || 0, 100)}%`, height: '100%', borderRadius: '3px', background: '#16a34a' }}></div>
                      </div>
                      <span style={{ fontWeight: '500' }}>{campaign.openRate}%</span>
                    </div>
                  </td>
                  <td>{campaign.replyRate}%</td>
                  <td>{campaign.meetingsBooked || 0}</td>
                  <td style={{ fontWeight: '600', color: '#16a34a' }}>${parseFloat(campaign.revenueGenerated || 0).toLocaleString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {campaign.status === 'active' ? (
                      <button className="btn btn-secondary" style={{ padding: '4px 8px' }}
                        onClick={(e) => handleStatusChange(e, campaign.id, 'paused')}>
                        <Pause size={14} />
                      </button>
                    ) : campaign.status === 'paused' || campaign.status === 'draft' ? (
                      <button className="btn btn-primary" style={{ padding: '4px 8px' }}
                        onClick={(e) => handleStatusChange(e, campaign.id, 'active')}>
                        <Play size={14} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {campaigns.length === 0 && !loading && (
        <div className="empty-state">
          <Mail size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No campaigns found</h3>
          <p>Create your first campaign to start reaching out to prospects.</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/campaigns/new')}>
            <Plus size={18} /> Create Campaign
          </button>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} totalItems={total}
        itemsPerPage={limit} onPageChange={setPage}
        onItemsPerPageChange={(val) => { setLimit(val); setPage(1); }} />

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Campaigns"
        message={`Are you sure you want to delete ${selectedIds.size} campaign(s)? This action cannot be undone.`}
        confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleBulkDelete} onCancel={() => setShowDeleteDialog(false)} />

      <ConfirmDialog isOpen={showBulkUpdateDialog} title="Update Campaign Status"
        message={
          <div>
            <p>Select new status for {selectedIds.size} campaign(s):</p>
            <select className="form-input" style={{ marginTop: '12px' }} value={bulkUpdateStatus}
              onChange={(e) => setBulkUpdateStatus(e.target.value)}>
              <option value="">Select status...</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        }
        confirmLabel="Update" cancelLabel="Cancel" variant="info"
        onConfirm={handleBulkUpdate} onCancel={() => setShowBulkUpdateDialog(false)} />
    </div>
  );
};

export default Campaigns;
