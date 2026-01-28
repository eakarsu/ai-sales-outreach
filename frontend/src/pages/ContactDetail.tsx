import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contactsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft, Mail, Phone, Linkedin, Building, Briefcase,
  Calendar, Star, Edit, Trash2, Send, Save
} from 'lucide-react';

const ContactDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { team } = useAuth();
  const isNew = id === 'new';
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    phone: '',
    linkedinUrl: '',
    source: 'manual',
    status: 'new',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchContact = async () => {
      if (!id || isNew) return;
      try {
        const response = await contactsAPI.getById(id);
        setContact(response.data);
      } catch (error) {
        console.error('Error fetching contact:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [id, isNew]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team?.id) return;

    setSaving(true);
    try {
      const response = await contactsAPI.create({
        teamId: team.id,
        ...formData,
      });
      navigate(`/contacts/${response.data.id}`);
    } catch (error) {
      console.error('Error creating contact:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCampaignClick = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (isNew) {
    return (
      <div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/contacts')}
          style={{ marginBottom: '24px' }}
        >
          <ArrowLeft size={18} />
          Back to Contacts
        </button>

        <div className="card">
          <h2 style={{ fontWeight: '600', marginBottom: '24px' }}>Add New Contact</h2>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  className="form-input"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  className="form-input"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john@company.com"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input
                  type="text"
                  name="company"
                  className="form-input"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="Company Inc."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Job Title</label>
                <input
                  type="text"
                  name="jobTitle"
                  className="form-input"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  placeholder="CEO"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input
                  type="url"
                  name="linkedinUrl"
                  className="form-input"
                  value={formData.linkedinUrl}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select
                  name="source"
                  className="form-input"
                  value={formData.source}
                  onChange={handleInputChange}
                >
                  <option value="manual">Manual Entry</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="referral">Referral</option>
                  <option value="website">Website</option>
                  <option value="conference">Conference</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  name="status"
                  className="form-input"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="opportunity">Opportunity</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving || !formData.email}>
                <Save size={18} />
                {saving ? 'Saving...' : 'Add Contact'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/contacts')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!contact) {
    return <div className="empty-state">Contact not found</div>;
  }

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#ea580c';
    return '#d97706';
  };

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => navigate('/contacts')}
        style={{ marginBottom: '24px' }}
      >
        <ArrowLeft size={18} />
        Back to Contacts
      </button>

      <div className="detail-header">
        <div style={{ display: 'flex', gap: '20px' }}>
          <div className="avatar lg">
            {contact.firstName?.[0]}{contact.lastName?.[0]}
          </div>
          <div className="detail-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <h1 className="page-title">{contact.firstName} {contact.lastName}</h1>
              <span className={`badge ${contact.status}`}>{contact.status?.replace('_', ' ')}</span>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '12px' }}>
              {contact.jobTitle} at {contact.company}
            </p>
            <div style={{ display: 'flex', gap: '24px', color: '#6b7280', fontSize: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={16} /> {contact.email}
              </span>
              {contact.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={16} /> {contact.phone}
                </span>
              )}
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0077b5' }}
                >
                  <Linkedin size={16} /> LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-primary">
            <Send size={18} />
            Send Email
          </button>
          <button className="btn btn-secondary">
            <Edit size={18} />
            Edit
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Email History</h3>
            {contact.emails?.length > 0 ? (
              <div>
                {contact.emails.map((email: any) => (
                  <div
                    key={email.id}
                    className="list-item"
                    onClick={() => handleCampaignClick(email.campaignId)}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: email.status === 'replied' ? '#dcfce7' : email.status === 'opened' ? '#dbeafe' : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Mail size={18} color={email.status === 'replied' ? '#16a34a' : email.status === 'opened' ? '#2563eb' : '#6b7280'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{email.subject}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {email.campaignName} - {new Date(email.sentAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`badge ${email.status}`}>{email.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280' }}>No emails sent to this contact yet.</p>
            )}
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {contact.tags?.map((tag: string, index: number) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 12px',
                    background: '#e0e7ff',
                    color: '#4f46e5',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  {tag}
                </span>
              ))}
              {(!contact.tags || contact.tags.length === 0) && (
                <span style={{ color: '#6b7280' }}>No tags</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Lead Score</h3>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: `6px solid ${getLeadScoreColor(contact.leadScore)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '32px', fontWeight: '700', color: getLeadScoreColor(contact.leadScore) }}>
                  {contact.leadScore}
                </span>
              </div>
              <p style={{ color: '#6b7280' }}>
                {contact.leadScore >= 80 ? 'Hot Lead' : contact.leadScore >= 60 ? 'Warm Lead' : 'Cold Lead'}
              </p>
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Contact Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <DetailItem icon={Building} label="Company" value={contact.company} />
              <DetailItem icon={Briefcase} label="Job Title" value={contact.jobTitle} />
              <DetailItem icon={Star} label="Source" value={contact.source || 'Unknown'} />
              <DetailItem
                icon={Calendar}
                label="Added"
                value={new Date(contact.createdAt).toLocaleDateString()}
              />
              <DetailItem
                icon={Mail}
                label="Last Contacted"
                value={contact.lastContactedAt ? new Date(contact.lastContactedAt).toLocaleDateString() : 'Never'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem: React.FC<{ icon: any; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      background: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Icon size={16} color="#6b7280" />
    </div>
    <div>
      <div style={{ fontSize: '12px', color: '#6b7280' }}>{label}</div>
      <div style={{ fontWeight: '500' }}>{value}</div>
    </div>
  </div>
);

export default ContactDetail;
