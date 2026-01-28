import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { tasksAPI } from '../services/api';
import { CheckSquare, Plus, Clock, AlertTriangle, CheckCircle, Circle, User } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  taskType: string;
  priority: string;
  status: string;
  dueDate: string;
  completedAt: string;
  contact: { id: string; name: string; company: string } | null;
  createdBy: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  campaign: { id: string; name: string } | null;
  createdAt: string;
}

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (team?.id) {
      fetchTasks();
    }
  }, [team?.id]);

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getAll({ teamId: team?.id });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await tasksAPI.complete(taskId);
      fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      high: { bg: '#fee2e2', color: '#dc2626' },
      medium: { bg: '#fef3c7', color: '#d97706' },
      low: { bg: '#f3f4f6', color: '#6b7280' },
    };
    const style = styles[priority] || styles.medium;
    return (
      <span style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '500', background: style.bg, color: style.color }}>
        {priority}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color="#16a34a" />;
      case 'in_progress':
        return <Clock size={20} color="#2563eb" />;
      default:
        return <Circle size={20} color="#9ca3af" />;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return <span style={{ color: '#dc2626' }}>Overdue</span>;
    if (diffDays === 0) return <span style={{ color: '#d97706' }}>Today</span>;
    if (diffDays === 1) return <span>Tomorrow</span>;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'overdue') {
      return t.status !== 'completed' && new Date(t.dueDate) < new Date();
    }
    return t.status === filter;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < new Date()).length,
  };

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Manage your follow-ups and to-dos</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tasks/new')}>
          <Plus size={18} />
          New Task
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#ede9fe' }}><CheckSquare size={24} color="#7c3aed" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('pending')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#f3f4f6' }}><Circle size={24} color="#6b7280" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('in_progress')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#dbeafe' }}><Clock size={24} color="#2563eb" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilter('overdue')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: '#fee2e2' }}><AlertTriangle size={24} color="#dc2626" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {['all', 'pending', 'in_progress', 'completed', 'overdue'].map(f => (
              <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.replace('_', ' ').charAt(0).toUpperCase() + f.replace('_', ' ').slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredTasks.map(task => (
            <div
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: task.status === 'completed' ? '#f9fafb' : '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: task.status === 'completed' ? 0.7 : 1
              }}
            >
              <button
                onClick={(e) => task.status !== 'completed' && handleComplete(task.id, e)}
                style={{ background: 'none', padding: 0, cursor: task.status !== 'completed' ? 'pointer' : 'default' }}
              >
                {getStatusIcon(task.status)}
              </button>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '500',
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                  color: task.status === 'completed' ? '#9ca3af' : '#111827'
                }}>
                  {task.title}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', gap: '12px', marginTop: '4px' }}>
                  {task.contact && <span>{task.contact.name} - {task.contact.company}</span>}
                  {task.assignedTo && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> {task.assignedTo.name}
                    </span>
                  )}
                </div>
              </div>

              {getPriorityBadge(task.priority)}

              <div style={{ minWidth: '80px', textAlign: 'right', fontSize: '14px' }}>
                {formatDate(task.dueDate)}
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No tasks found
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
