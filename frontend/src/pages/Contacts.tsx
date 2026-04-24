import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { contactsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { SortHeader } from '../components/SortHeader';
import { ExportButtons } from '../components/ExportButtons';
import { SkeletonTable } from '../components/Skeleton';
import { Users, Plus, Search, Filter, Upload, Download } from 'lucide-react';

const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<any[]>([]);
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

  const fetchContacts = useCallback(async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const params: any = { teamId: team.id, page, limit, sortBy, sortOrder };
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await contactsAPI.getAll(params);
      setContacts(response.data.contacts);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages || Math.ceil(response.data.total / limit));
    } catch (error) {
      showToast('Failed to load contacts', 'error');
    } finally {
      setLoading(false);
    }
  }, [team?.id, filter, search, page, limit, sortBy, sortOrder]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

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
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    try {
      await contactsAPI.bulkDelete(Array.from(selectedIds));
      showToast(`${selectedIds.size} contacts deleted`, 'success');
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      fetchContacts();
    } catch { showToast('Failed to delete contacts', 'error'); }
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateStatus) return;
    try {
      await contactsAPI.bulkUpdate(Array.from(selectedIds), { status: bulkUpdateStatus });
      showToast(`${selectedIds.size} contacts updated`, 'success');
      setSelectedIds(new Set());
      setShowBulkUpdateDialog(false);
      fetchContacts();
    } catch { showToast('Failed to update contacts', 'error'); }
  };

  const handleExportCSV = async () => {
    try {
      const response = await contactsAPI.exportCSV(team?.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('CSV exported successfully', 'success');
    } catch { showToast('Failed to export CSV', 'error'); }
  };

  const handleContactClick = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#ea580c';
    if (score >= 40) return '#d97706';
    return '#6b7280';
  };

  const tabs = [
    { key: 'all', label: 'All Contacts' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'meeting_scheduled', label: 'Meeting Scheduled' },
    { key: 'won', label: 'Won' },
  ];

  const exportColumns = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'company', label: 'Company' },
    { key: 'jobTitle', label: 'Job Title' },
    { key: 'status', label: 'Status' },
    { key: 'leadScore', label: 'Lead Score' },
    { key: 'source', label: 'Source' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="page-subtitle">{total} contacts in your database</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <ExportButtons data={contacts} filename="contacts" columns={exportColumns} onExportCSV={handleExportCSV} />
          <button className="btn btn-secondary">
            <Upload size={18} /> Import
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/contacts/new')}>
            <Plus size={18} /> Add Contact
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
          <input type="text" placeholder="Search contacts..." value={search}
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
        <SkeletonTable rows={10} columns={7} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" checked={selectedIds.size === contacts.length && contacts.length > 0}
                    onChange={handleSelectAll} />
                </th>
                <th><SortHeader label="Contact" field="firstName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Company" field="company" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th><SortHeader label="Lead Score" field="leadScore" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
                <th>Source</th>
                <th><SortHeader label="Last Contacted" field="lastContactedAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(contact => (
                <tr key={contact.id} onClick={() => handleContactClick(contact.id)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(contact.id)}
                      onChange={() => handleSelectOne(contact.id)} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar">{contact.firstName?.[0]}{contact.lastName?.[0]}</div>
                      <div>
                        <div style={{ fontWeight: '500' }}>{contact.firstName} {contact.lastName}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{contact.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{contact.company}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{contact.jobTitle}</div>
                  </td>
                  <td><span className={`badge ${contact.status}`}>{contact.status?.replace('_', ' ')}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: '#e5e7eb' }}>
                        <div style={{ width: `${contact.leadScore}%`, height: '100%', borderRadius: '3px', background: getLeadScoreColor(contact.leadScore) }}></div>
                      </div>
                      <span style={{ fontWeight: '500', color: getLeadScoreColor(contact.leadScore) }}>{contact.leadScore}</span>
                    </div>
                  </td>
                  <td>{contact.source || '-'}</td>
                  <td>{contact.lastContactedAt ? new Date(contact.lastContactedAt).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {contacts.length === 0 && !loading && (
        <div className="empty-state">
          <Users size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No contacts found</h3>
          <p>Import contacts or add them manually to get started.</p>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} totalItems={total}
        itemsPerPage={limit} onPageChange={setPage}
        onItemsPerPageChange={(val) => { setLimit(val); setPage(1); }} />

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Contacts"
        message={`Are you sure you want to delete ${selectedIds.size} contact(s)? This action cannot be undone.`}
        confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleBulkDelete} onCancel={() => setShowDeleteDialog(false)} />

      <ConfirmDialog isOpen={showBulkUpdateDialog} title="Update Contact Status"
        message={
          <div>
            <p>Select new status for {selectedIds.size} contact(s):</p>
            <select className="form-input" style={{ marginTop: '12px' }} value={bulkUpdateStatus}
              onChange={(e) => setBulkUpdateStatus(e.target.value)}>
              <option value="">Select status...</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="meeting_scheduled">Meeting Scheduled</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="negotiating">Negotiating</option>
              <option value="won">Won</option>
            </select>
          </div>
        }
        confirmLabel="Update" cancelLabel="Cancel" variant="info"
        onConfirm={handleBulkUpdate} onCancel={() => setShowBulkUpdateDialog(false)} />
    </div>
  );
};

export default Contacts;
