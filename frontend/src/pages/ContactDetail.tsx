import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contactsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard } from '../components/Skeleton';
import { FormField, validateEmail, validateRequired } from '../components/FormValidation';
import {
  ArrowLeft, Mail, Phone, Linkedin, Building, Briefcase,
  Calendar, Star, Edit, Trash2, Send, Save, X
} from 'lucide-react';

const ContactDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { team } = useAuth();
  const { showToast } = useToast();
  const isNew = id === 'new';
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [editing, setEditing] = useState(isNew);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', company: '', jobTitle: '',
    phone: '', linkedinUrl: '', source: 'manual', status: 'new',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchContact = async () => {
      if (!id || isNew) return;
      try {
        const response = await contactsAPI.getById(id);
        setContact(response.data);
        setFormData({
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          email: response.data.email || '',
          company: response.data.company || '',
          jobTitle: response.data.jobTitle || '',
          phone: response.data.phone || '',
          linkedinUrl: response.data.linkedinUrl || '',
          source: response.data.source || 'manual',
          status: response.data.status || 'new',
        });
      } catch (error) {
        showToast('Failed to load contact', 'error');
      } finally { setLoading(false); }
    };
    fetchContact();
  }, [id, isNew]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const emailErr = validateEmail(formData.email);
    const firstNameErr = validateRequired(formData.firstName, 'First name');
    const lastNameErr = validateRequired(formData.lastName, 'Last name');
    if (emailErr) newErrors.email = emailErr;
    if (firstNameErr) newErrors.firstName = firstNameErr;
    if (lastNameErr) newErrors.lastName = lastNameErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (isNew) {
        const response = await contactsAPI.create({ teamId: team?.id, ...formData });
        showToast('Contact created successfully', 'success');
        navigate(`/contacts/${response.data.id}`);
      } else {
        await contactsAPI.update(id!, formData);
        const response = await contactsAPI.getById(id!);
        setContact(response.data);
        setEditing(false);
        showToast('Contact updated successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to save contact', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await contactsAPI.delete(id!);
      showToast('Contact deleted successfully', 'success');
      navigate('/contacts');
    } catch { showToast('Failed to delete contact', 'error'); }
  };

  const handleCampaignClick = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  if (loading) {
    return <div style={{ padding: '24px' }}><SkeletonCard /><div style={{ marginTop: '24px' }}><SkeletonCard /></div></div>;
  }

  if (isNew || editing) {
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => editing && !isNew ? setEditing(false) : navigate('/contacts')}
          style={{ marginBottom: '24px' }}>
          <ArrowLeft size={18} /> {isNew ? 'Back to Contacts' : 'Cancel Editing'}
        </button>

        <div className="card">
          <h2 style={{ fontWeight: '600', marginBottom: '24px' }}>{isNew ? 'Add New Contact' : 'Edit Contact'}</h2>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormField label="First Name" error={errors.firstName} required>
                <input type="text" name="firstName" className="form-input" value={formData.firstName}
                  onChange={handleInputChange} placeholder="John" style={errors.firstName ? { borderColor: '#dc2626' } : {}} />
              </FormField>
              <FormField label="Last Name" error={errors.lastName} required>
                <input type="text" name="lastName" className="form-input" value={formData.lastName}
                  onChange={handleInputChange} placeholder="Doe" style={errors.lastName ? { borderColor: '#dc2626' } : {}} />
              </FormField>
            </div>
            <FormField label="Email" error={errors.email} required>
              <input type="email" name="email" className="form-input" value={formData.email}
                onChange={handleInputChange} placeholder="john@company.com" style={errors.email ? { borderColor: '#dc2626' } : {}} />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input type="text" name="company" className="form-input" value={formData.company}
                  onChange={handleInputChange} placeholder="Company Inc." />
              </div>
              <div className="form-group">
                <label className="form-label">Job Title</label>
                <input type="text" name="jobTitle" className="form-input" value={formData.jobTitle}
                  onChange={handleInputChange} placeholder="CEO" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input type="tel" name="phone" className="form-input" value={formData.phone}
                  onChange={handleInputChange} placeholder="+1 (555) 123-4567" />
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input type="url" name="linkedinUrl" className="form-input" value={formData.linkedinUrl}
                  onChange={handleInputChange} placeholder="https://linkedin.com/in/johndoe" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select name="source" className="form-input" value={formData.source} onChange={handleInputChange}>
                  <option value="manual">Manual Entry</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="referral">Referral</option>
                  <option value="website">Website</option>
                  <option value="conference">Conference</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-input" value={formData.status} onChange={handleInputChange}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="meeting_scheduled">Meeting Scheduled</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="won">Won</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={18} /> {saving ? 'Saving...' : isNew ? 'Add Contact' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary"
                onClick={() => isNew ? navigate('/contacts') : setEditing(false)}>
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
      <button className="btn btn-secondary" onClick={() => navigate('/contacts')} style={{ marginBottom: '24px' }}>
        <ArrowLeft size={18} /> Back to Contacts
      </button>

      <div className="detail-header">
        <div style={{ display: 'flex', gap: '20px' }}>
          <div className="avatar lg">{contact.firstName?.[0]}{contact.lastName?.[0]}</div>
          <div className="detail-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <h1 className="page-title">{contact.firstName} {contact.lastName}</h1>
              <span className={`badge ${contact.status}`}>{contact.status?.replace('_', ' ')}</span>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '12px' }}>{contact.jobTitle} at {contact.company}</p>
            <div style={{ display: 'flex', gap: '24px', color: '#6b7280', fontSize: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={16} /> {contact.email}</span>
              {contact.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={16} /> {contact.phone}</span>}
              {contact.linkedinUrl && (
                <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0077b5' }}>
                  <Linkedin size={16} /> LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-primary"><Send size={18} /> Send Email</button>
          <button className="btn btn-secondary" onClick={() => setEditing(true)}><Edit size={18} /> Edit</button>
          <button className="btn btn-danger" onClick={() => setShowDeleteDialog(true)}><Trash2 size={18} /> Delete</button>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Email History</h3>
            {contact.emails?.length > 0 ? (
              <div>
                {contact.emails.map((email: any) => (
                  <div key={email.id} className="list-item" onClick={() => handleCampaignClick(email.campaignId)}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: email.status === 'replied' ? '#dcfce7' : email.status === 'opened' ? '#dbeafe' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mail size={18} color={email.status === 'replied' ? '#16a34a' : email.status === 'opened' ? '#2563eb' : '#6b7280'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{email.subject}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>{email.campaignName} - {new Date(email.sentAt).toLocaleDateString()}</div>
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
                <span key={index} style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '16px', fontSize: '13px', fontWeight: '500' }}>
                  {tag}
                </span>
              ))}
              {(!contact.tags || contact.tags.length === 0) && <span style={{ color: '#6b7280' }}>No tags</span>}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Lead Score</h3>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: `6px solid ${getLeadScoreColor(contact.leadScore)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: '12px' }}>
                <span style={{ fontSize: '32px', fontWeight: '700', color: getLeadScoreColor(contact.leadScore) }}>{contact.leadScore}</span>
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
              <DetailItem icon={Calendar} label="Added" value={new Date(contact.createdAt).toLocaleDateString()} />
              <DetailItem icon={Mail} label="Last Contacted" value={contact.lastContactedAt ? new Date(contact.lastContactedAt).toLocaleDateString() : 'Never'} />
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Contact"
        message={`Are you sure you want to delete ${contact.firstName} ${contact.lastName}? This action cannot be undone.`}
        confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleDelete} onCancel={() => setShowDeleteDialog(false)} />
    </div>
  );
};

const DetailItem: React.FC<{ icon: any; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={16} color="#6b7280" />
    </div>
    <div>
      <div style={{ fontSize: '12px', color: '#6b7280' }}>{label}</div>
      <div style={{ fontWeight: '500' }}>{value}</div>
    </div>
  </div>
);

export default ContactDetail;
