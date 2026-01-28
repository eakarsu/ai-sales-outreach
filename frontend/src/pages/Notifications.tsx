import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { notificationsAPI } from '../services/api';
import { Bell, Check, CheckCheck, Trash2, Mail, Calendar, Users, TrendingUp, AlertCircle, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll({ userId: user?.id });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead(user?.id || '');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsAPI.delete(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearRead = async () => {
    try {
      await notificationsAPI.clearRead(user?.id || '');
      setNotifications(notifications.filter(n => !n.isRead));
    } catch (error) {
      console.error('Error clearing read notifications:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Navigate to link if available, otherwise navigate based on type
    if (notification.link) {
      navigate(notification.link);
      return;
    }

    // Fallback navigation based on notification type
    const type = notification.type;
    if (type.includes('email')) navigate('/campaigns');
    else if (type.includes('meeting')) navigate('/meetings');
    else if (type.includes('task')) navigate('/tasks');
    else if (type.includes('campaign')) navigate('/campaigns');
    else if (type.includes('contact') || type.includes('lead')) navigate('/contacts');
    else if (type.includes('deal')) navigate('/analytics');
    else if (type.includes('report')) navigate('/reports');
    else if (type.includes('sequence')) navigate('/sequences');
    else if (type.includes('integration')) navigate('/integrations');
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('email')) return <Mail size={20} color="#4f46e5" />;
    if (type.includes('meeting')) return <Calendar size={20} color="#ea580c" />;
    if (type.includes('contact') || type.includes('lead')) return <Users size={20} color="#16a34a" />;
    if (type.includes('campaign')) return <TrendingUp size={20} color="#7c3aed" />;
    if (type.includes('task')) return <Bell size={20} color="#2563eb" />;
    if (type.includes('warning') || type.includes('quota')) return <AlertCircle size={20} color="#dc2626" />;
    if (type.includes('deal')) return <TrendingUp size={20} color="#16a34a" />;
    if (type.includes('ai')) return <Info size={20} color="#7c3aed" />;
    return <Info size={20} color="#6b7280" />;
  };

  const getTypeBadge = (type: string) => {
    let category = 'system';
    let label = type.replace(/_/g, ' ');

    if (type.includes('email')) category = 'email';
    else if (type.includes('meeting')) category = 'meeting';
    else if (type.includes('contact') || type.includes('lead')) category = 'contact';
    else if (type.includes('campaign')) category = 'campaign';
    else if (type.includes('task')) category = 'task';
    else if (type.includes('warning') || type.includes('quota')) category = 'alert';
    else if (type.includes('deal')) category = 'deal';

    const styles: Record<string, { bg: string; color: string }> = {
      email: { bg: '#eef2ff', color: '#4f46e5' },
      meeting: { bg: '#fff7ed', color: '#ea580c' },
      contact: { bg: '#dcfce7', color: '#16a34a' },
      campaign: { bg: '#f3e8ff', color: '#7c3aed' },
      task: { bg: '#dbeafe', color: '#2563eb' },
      alert: { bg: '#fee2e2', color: '#dc2626' },
      deal: { bg: '#dcfce7', color: '#16a34a' },
      system: { bg: '#f3f4f6', color: '#6b7280' },
    };
    const style = styles[category] || styles.system;
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: '500',
        background: style.bg,
        color: style.color,
        textTransform: 'capitalize'
      }}>
        {label}
      </span>
    );
  };

  const formatTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const matchesFilter = (type: string, filter: string) => {
    if (filter === 'email') return type.includes('email');
    if (filter === 'meeting') return type.includes('meeting');
    if (filter === 'campaign') return type.includes('campaign');
    if (filter === 'alert') return type.includes('warning') || type.includes('quota') || type === 'alert';
    if (filter === 'task') return type.includes('task');
    return type === filter;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return matchesFilter(n.type, filter);
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    emails: notifications.filter(n => n.type.includes('email')).length,
    meetings: notifications.filter(n => n.type.includes('meeting')).length,
    tasks: notifications.filter(n => n.type.includes('task')).length,
    alerts: notifications.filter(n => n.type.includes('warning') || n.type.includes('quota')).length,
  };

  if (loading) {
    return <div className="loading">Loading notifications...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay updated on your sales activities</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleClearRead}
            disabled={!notifications.some(n => n.isRead)}
          >
            <Trash2 size={18} />
            Clear Read
          </button>
          <button
            className="btn btn-primary"
            onClick={handleMarkAllAsRead}
            disabled={!notifications.some(n => !n.isRead)}
          >
            <CheckCheck size={18} />
            Mark All Read
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#ede9fe' }}><Bell size={24} color="#7c3aed" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('unread')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fef3c7' }}><Bell size={24} color="#d97706" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.unread}</div>
            <div className="stat-label">Unread</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('email')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#eef2ff' }}><Mail size={24} color="#4f46e5" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.emails}</div>
            <div className="stat-label">Email</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('meeting')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fff7ed' }}><Calendar size={24} color="#ea580c" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.meetings}</div>
            <div className="stat-label">Meetings</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {['all', 'unread', 'email', 'meeting', 'task', 'campaign'].map(f => (
              <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredNotifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                background: notification.isRead ? '#f9fafb' : '#fff',
                border: notification.isRead ? '1px solid #e5e7eb' : '1px solid #c7d2fe',
                borderLeft: notification.isRead ? '1px solid #e5e7eb' : '3px solid #4f46e5',
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: notification.isRead ? 0.8 : 1
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getTypeIcon(notification.type)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontWeight: notification.isRead ? '500' : '600',
                    color: notification.isRead ? '#6b7280' : '#111827'
                  }}>
                    {notification.title}
                  </span>
                  {getTypeBadge(notification.type)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '8px',
                  lineHeight: '1.5'
                }}>
                  {notification.message}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {formatTime(notification.createdAt)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {!notification.isRead && (
                  <button
                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                    style={{
                      background: 'none',
                      color: '#6b7280',
                      padding: '8px',
                      borderRadius: '4px'
                    }}
                    title="Mark as read"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={(e) => handleDelete(notification.id, e)}
                  style={{
                    background: 'none',
                    color: '#6b7280',
                    padding: '8px',
                    borderRadius: '4px'
                  }}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredNotifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <Bell size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p>No notifications found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
