import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Zap, Mail, Lock, AlertCircle, UserCheck, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAutoPopulate = () => {
    setEmail('john.smith@company.com');
    setPassword('password123');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Zap size={32} style={{ color: '#4f46e5' }} />
            <span>SalesAI</span>
          </div>
          <p className="login-subtitle">AI-Powered Sales Outreach Platform</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: '#fee2e2', color: '#dc2626', padding: '12px 16px',
              borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <button type="button" onClick={handleAutoPopulate} className="btn btn-secondary"
            style={{
              width: '100%', padding: '12px', marginBottom: '20px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: '#f0fdf4', border: '2px solid #22c55e', color: '#16a34a', fontWeight: '600'
            }}>
            <UserCheck size={18} /> Auto-Fill Demo Credentials
          </button>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#9ca3af' }} />
              <input type="email" className="form-input" style={{ paddingLeft: '42px' }}
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#9ca3af' }} />
              <input type={showPassword ? 'text' : 'password'} className="form-input"
                style={{ paddingLeft: '42px', paddingRight: '42px' }}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button type="button" onClick={() => navigate('/password-reset')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '14px' }}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
          <p>Click the green button above to auto-fill demo credentials</p>
          <p style={{ marginTop: '4px' }}>Or use any seeded email with password: <strong>password123</strong></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
