import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { contactsAPI } from '../services/api';
import { Users, Plus, Search, Filter, Upload, Download, Star } from 'lucide-react';

const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!team?.id) return;
      try {
        const params: any = { teamId: team.id };
        if (filter !== 'all') params.status = filter;
        if (search) params.search = search;
        const response = await contactsAPI.getAll(params);
        setContacts(response.data.contacts);
        setTotal(response.data.total);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [team?.id, filter, search]);

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

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="page-subtitle">{total} contacts in your database</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary">
            <Upload size={18} />
            Import
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/contacts/new')}>
            <Plus size={18} />
            Add Contact
          </button>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${filter === tab.key ? 'active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary">
          <Filter size={18} />
          Filters
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Contact</th>
              <th>Company</th>
              <th>Status</th>
              <th>Lead Score</th>
              <th>Source</th>
              <th>Last Contacted</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(contact => (
              <tr key={contact.id} onClick={() => handleContactClick(contact.id)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="avatar">
                      {contact.firstName?.[0]}{contact.lastName?.[0]}
                    </div>
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
                <td>
                  <span className={`badge ${contact.status}`}>
                    {contact.status?.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '60px',
                      height: '6px',
                      borderRadius: '3px',
                      background: '#e5e7eb'
                    }}>
                      <div style={{
                        width: `${contact.leadScore}%`,
                        height: '100%',
                        borderRadius: '3px',
                        background: getLeadScoreColor(contact.leadScore)
                      }}></div>
                    </div>
                    <span style={{ fontWeight: '500', color: getLeadScoreColor(contact.leadScore) }}>
                      {contact.leadScore}
                    </span>
                  </div>
                </td>
                <td>{contact.source || '-'}</td>
                <td>
                  {contact.lastContactedAt
                    ? new Date(contact.lastContactedAt).toLocaleDateString()
                    : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contacts.length === 0 && (
        <div className="empty-state">
          <Users size={64} />
          <h3 style={{ marginTop: '16px', fontWeight: '600' }}>No contacts found</h3>
          <p>Import contacts or add them manually to get started.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="btn btn-secondary">
              <Upload size={18} />
              Import Contacts
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/contacts/new')}>
              <Plus size={18} />
              Add Contact
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
