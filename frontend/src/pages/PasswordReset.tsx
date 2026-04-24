import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Zap, Mail, Lock, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

const PasswordReset: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'confirm' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<any>(null);

  const checkStrength = async (pw: string) => {
    if (pw.length < 3) { setPasswordStrength(null); return; }
    try {
      const res = await authAPI.checkPasswordStrength(pw);
      setPasswordStrength(res.data);
    } catch { }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.requestPasswordReset(email);
      if (res.data.resetToken) setToken(res.data.resetToken);
      setStep('confirm');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally { setLoading(false); }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authAPI.confirmPasswordReset(token, newPassword);
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally { setLoading(false); }
  };

  const strengthColors: Record<string, string> = {
    very_weak: '#dc2626', weak: '#ea580c', fair: '#d97706',
    good: '#16a34a', strong: '#059669', very_strong: '#047857',
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Zap size={32} style={{ color: '#4f46e5' }} />
            <span>SalesAI</span>
          </div>
          <p className="login-subtitle">
            {step === 'request' && 'Reset your password'}
            {step === 'confirm' && 'Enter your new password'}
            {step === 'done' && 'Password reset complete'}
          </p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestReset}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#9ca3af' }} />
                <input type="email" className="form-input" style={{ paddingLeft: '42px' }} value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleConfirmReset}>
            <div className="form-group">
              <label className="form-label">Reset Token</label>
              <input type="text" className="form-input" value={token} onChange={(e) => setToken(e.target.value)}
                placeholder="Paste reset token" required />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Check your email for the reset token (demo: auto-filled)</p>
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#9ca3af' }} />
                <input type={showPassword ? 'text' : 'password'} className="form-input" style={{ paddingLeft: '42px', paddingRight: '42px' }}
                  value={newPassword} onChange={(e) => { setNewPassword(e.target.value); checkStrength(e.target.value); }}
                  placeholder="Enter new password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
              <input type="password" className="form-input" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={64} style={{ color: '#16a34a', margin: '0 auto 16px' }} />
            <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>Password Reset Successfully</h3>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>You can now log in with your new password.</p>
            <button className="btn btn-primary" style={{ width: '100%', padding: '14px' }} onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}>
            <ArrowLeft size={16} /> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
