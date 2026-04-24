import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { authAPI } from '../services/api';
import {
  Settings as SettingsIcon, User, Bell, Shield, CreditCard,
  Mail, Globe, Key, Trash2, Save, Check, Eye, EyeOff, CheckCircle, AlertCircle
} from 'lucide-react';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, team, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });

  const [notifications, setNotifications] = useState({
    emailReplies: true,
    meetingsBooked: true,
    campaignComplete: true,
    weeklyDigest: true,
    newFeatures: false
  });

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<any>(null);

  // Email verification
  const [verifying, setVerifying] = useState(false);

  const handleSave = () => {
    setSaved(true);
    showToast('Settings saved successfully', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showToast('Please fill in all password fields', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      showToast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordStrength(null);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to change password';
      const details = err.response?.data?.details;
      showToast(details ? `${msg}: ${details.join(', ')}` : msg, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const checkStrength = async (pw: string) => {
    if (pw.length < 3) { setPasswordStrength(null); return; }
    try {
      const res = await authAPI.checkPasswordStrength(pw);
      setPasswordStrength(res.data);
    } catch { }
  };

  const handleResendVerification = async () => {
    setVerifying(true);
    try {
      await authAPI.resendVerification();
      showToast('Verification email sent', 'success');
    } catch {
      showToast('Failed to send verification email', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const strengthColors: Record<string, string> = {
    very_weak: '#dc2626', weak: '#ea580c', fair: '#d97706',
    good: '#16a34a', strong: '#059669', very_strong: '#047857',
  };

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'billing', label: 'Billing', icon: CreditCard },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px' }}>
        <div className="card" style={{ height: 'fit-content' }}>
          {tabs.map(tab => (
            <div key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '8px', background: activeTab === tab.key ? '#f3f4f6' : 'transparent', color: activeTab === tab.key ? '#4f46e5' : '#6b7280', fontWeight: activeTab === tab.key ? '500' : '400', marginBottom: '4px' }}>
              <tab.icon size={18} />{tab.label}
            </div>
          ))}
        </div>

        <div>
          {activeTab === 'profile' && (
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '24px' }}>Profile Settings</h3>

              {/* Email verification banner */}
              {user && !user.emailVerified && (
                <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e' }}>
                    <AlertCircle size={18} />
                    <span>Your email is not verified. Please verify to access all features.</span>
                  </div>
                  <button className="btn btn-secondary" onClick={handleResendVerification} disabled={verifying} style={{ fontSize: '13px', padding: '6px 12px' }}>
                    {verifying ? 'Sending...' : 'Resend Verification'}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
                <div className="avatar lg">{profile.firstName?.[0]}{profile.lastName?.[0]}</div>
                <div>
                  <button className="btn btn-secondary">Change Avatar</button>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>JPG, GIF or PNG. Max size 2MB.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" className="form-input" value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" className="form-input" value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input type="email" className="form-input" value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  {user?.emailVerified && (
                    <CheckCircle size={18} style={{ position: 'absolute', right: '14px', top: '14px', color: '#16a34a' }} />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                <Shield size={14} />
                Role: <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{user?.role}</span>
              </div>

              <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: '16px' }}>
                {saved ? <Check size={18} /> : <Save size={18} />}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '24px' }}>Notification Preferences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <NotificationToggle label="Email Replies" description="Get notified when a prospect replies to your email" enabled={notifications.emailReplies} onChange={(v) => setNotifications({ ...notifications, emailReplies: v })} />
                <NotificationToggle label="Meetings Booked" description="Get notified when a meeting is scheduled" enabled={notifications.meetingsBooked} onChange={(v) => setNotifications({ ...notifications, meetingsBooked: v })} />
                <NotificationToggle label="Campaign Complete" description="Get notified when a campaign finishes" enabled={notifications.campaignComplete} onChange={(v) => setNotifications({ ...notifications, campaignComplete: v })} />
                <NotificationToggle label="Weekly Digest" description="Receive a weekly summary of your outreach performance" enabled={notifications.weeklyDigest} onChange={(v) => setNotifications({ ...notifications, weeklyDigest: v })} />
                <NotificationToggle label="New Features" description="Get updates about new features and improvements" enabled={notifications.newFeatures} onChange={(v) => setNotifications({ ...notifications, newFeatures: v })} />
              </div>
              <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={handleSave}>
                {saved ? <Check size={18} /> : <Save size={18} />}
                {saved ? 'Saved!' : 'Save Preferences'}
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '24px' }}>Change Password</h3>

              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showCurrentPw ? 'text' : 'password'} className="form-input" placeholder="Enter current password"
                    value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ paddingRight: '42px' }} />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                    style={{ position: 'absolute', right: '14px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                    {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNewPw ? 'text' : 'password'} className="form-input" placeholder="Enter new password"
                      value={newPassword} onChange={(e) => { setNewPassword(e.target.value); checkStrength(e.target.value); }}
                      style={{ paddingRight: '42px' }} />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                      style={{ position: 'absolute', right: '14px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                      {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordStrength && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px',
                            background: i <= passwordStrength.score ? strengthColors[passwordStrength.level] : '#e5e7eb' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '12px', color: strengthColors[passwordStrength.level], fontWeight: '500' }}>
                        {passwordStrength.level?.replace('_', ' ')}
                      </span>
                      {passwordStrength.errors?.length > 0 && (
                        <ul style={{ fontSize: '12px', color: '#dc2626', margin: '4px 0 0', paddingLeft: '16px' }}>
                          {passwordStrength.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input type="password" className="form-input" placeholder="Confirm new password"
                    value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>Passwords do not match</p>
                  )}
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleChangePassword} disabled={changingPassword}
                style={{ marginTop: '8px' }}>
                <Key size={18} />
                {changingPassword ? 'Changing...' : 'Update Password'}
              </button>

              <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

              <h4 style={{ fontWeight: '600', marginBottom: '16px', color: '#dc2626' }}>Danger Zone</h4>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button className="btn btn-danger" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 size={18} /> Delete Account
              </button>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '24px' }}>Billing & Subscription</h3>

              <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #16a34a', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#16a34a', marginBottom: '4px' }}>CURRENT PLAN</div>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>{team?.plan || 'Professional'}</div>
                    <div style={{ color: '#6b7280' }}>${team?.monthly_price || 100}/user/month</div>
                  </div>
                  <button className="btn btn-primary">Upgrade Plan</button>
                </div>
              </div>

              <h4 style={{ fontWeight: '600', marginBottom: '16px' }}>Usage This Month</h4>
              <div className="metric-row" style={{ marginBottom: '24px' }}>
                <div className="metric-item">
                  <div className="metric-value">2,450</div>
                  <div className="metric-label">Emails Sent</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>of 5,000 included</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">45</div>
                  <div className="metric-label">AI Generations</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>of 100 included</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">{team?.members?.length || 5}</div>
                  <div className="metric-label">Team Members</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>of 10 included</div>
                </div>
              </div>

              <h4 style={{ fontWeight: '600', marginBottom: '16px' }}>Payment Method</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CreditCard size={24} color="#6b7280" />
                  <div>
                    <div style={{ fontWeight: '500' }}>Visa ending in 4242</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Expires 12/2025</div>
                  </div>
                </div>
                <button className="btn btn-secondary">Update</button>
              </div>

              <h4 style={{ fontWeight: '600', marginBottom: '16px' }}>Billing History</h4>
              <div className="table-container" style={{ boxShadow: 'none' }}>
                <table className="table">
                  <thead>
                    <tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((_, i) => (
                      <tr key={i}>
                        <td>{new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</td>
                        <td>Monthly subscription - Professional</td>
                        <td>$500.00</td>
                        <td><span className="badge completed">Paid</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Account"
        message="Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data will be lost."
        confirmLabel="Delete Account" cancelLabel="Cancel" variant="danger"
        onConfirm={() => { showToast('Account deletion is not available in demo mode', 'warning'); setShowDeleteDialog(false); }}
        onCancel={() => setShowDeleteDialog(false)} />
    </div>
  );
};

const NotificationToggle: React.FC<{
  label: string; description: string; enabled: boolean; onChange: (value: boolean) => void;
}> = ({ label, description, enabled, onChange }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <div style={{ fontWeight: '500' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#6b7280' }}>{description}</div>
    </div>
    <div onClick={() => onChange(!enabled)}
      style={{ width: '44px', height: '24px', borderRadius: '12px', background: enabled ? '#4f46e5' : '#e5e7eb', position: 'relative', cursor: 'pointer' }}>
      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: enabled ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></div>
    </div>
  </div>
);

export default Settings;
