import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard } from '../components/Skeleton';
import {
  ArrowLeft, CheckCircle, Clock, User, Building, Flag, Calendar,
  Save, Edit, Trash2, X
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  taskType: string;
  priority: string;
  status: string;
  dueDate: string;
  completedAt: string;
  contact: { id: string; name: string; company: string; email: string } | null;
  createdBy: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  campaign: { id: string; name: string } | null;
  createdAt: string;
}

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, team } = useAuth();
  const { showToast } = useToast();
  const isNew = id === 'new';
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [editing, setEditing] = useState(isNew);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    taskType: 'follow_up',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && !isNew) {
      fetchTask();
    }
  }, [id, isNew]);

  const fetchTask = async () => {
    try {
      const response = await tasksAPI.getById(id!);
      setTask(response.data);
      setFormData({
        title: response.data.title || '',
        description: response.data.description || '',
        taskType: response.data.taskType || 'follow_up',
        priority: response.data.priority || 'medium',
        status: response.data.status || 'pending',
        dueDate: response.data.dueDate ? new Date(response.data.dueDate).toISOString().slice(0, 16) : '',
      });
    } catch (error) {
      showToast('Failed to load task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team?.id) return;

    setSaving(true);
    try {
      if (isNew) {
        const response = await tasksAPI.create({
          teamId: team.id,
          userId: user?.id,
          ...formData,
        });
        showToast('Task created successfully', 'success');
        navigate(`/tasks/${response.data.id}`);
      } else {
        await tasksAPI.update(id!, formData);
        const response = await tasksAPI.getById(id!);
        setTask(response.data);
        setEditing(false);
        showToast('Task updated successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to save task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await tasksAPI.delete(id!);
      showToast('Task deleted successfully', 'success');
      navigate('/tasks');
    } catch { showToast('Failed to delete task', 'error'); }
  };

  const handleComplete = async () => {
    try {
      await tasksAPI.complete(task!.id);
      showToast('Task marked as completed', 'success');
      fetchTask();
    } catch (error) {
      showToast('Failed to complete task', 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#dc2626';
      case 'medium': return '#d97706';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <SkeletonCard />
        <div style={{ marginTop: '24px' }}><SkeletonCard /></div>
      </div>
    );
  }

  if (isNew || editing) {
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => editing && !isNew ? setEditing(false) : navigate('/tasks')}
          style={{ marginBottom: '24px' }}>
          <ArrowLeft size={18} /> {isNew ? 'Back to Tasks' : 'Cancel Editing'}
        </button>

        <div className="card">
          <h2 style={{ fontWeight: '600', marginBottom: '24px' }}>{isNew ? 'Create New Task' : 'Edit Task'}</h2>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Task Title *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Follow up with John about proposal"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-input"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add details about the task"
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Task Type</label>
                <select name="taskType" className="form-input" value={formData.taskType} onChange={handleInputChange}>
                  <option value="follow_up">Follow Up</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select name="priority" className="form-input" value={formData.priority} onChange={handleInputChange}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-input" value={formData.status} onChange={handleInputChange}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="datetime-local"
                  name="dueDate"
                  className="form-input"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving || !formData.title}>
                <Save size={18} />
                {saving ? 'Saving...' : isNew ? 'Create Task' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary"
                onClick={() => isNew ? navigate('/tasks') : setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!task) {
    return <div className="empty-state">Task not found</div>;
  }

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/tasks')} style={{ marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Back to Tasks
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{task.title}</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{task.taskType.replace('_', ' ')}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {task.status !== 'completed' && (
            <button className="btn btn-primary" onClick={handleComplete}>
              <CheckCircle size={18} /> Mark Complete
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>
            <Edit size={18} /> Edit
          </button>
          <button className="btn btn-danger" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 size={18} /> Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Task Details</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Flag size={20} color={getPriorityColor(task.priority)} />
                <span style={{ textTransform: 'capitalize' }}>{task.priority} Priority</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={20} color="#6b7280" />
                <div>
                  <div style={{ fontWeight: '500' }}>Due: {formatDate(task.dueDate)}</div>
                  {task.completedAt && (
                    <div style={{ fontSize: '14px', color: '#16a34a' }}>
                      Completed: {formatDate(task.completedAt)}
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                padding: '12px',
                background: task.status === 'completed' ? '#dcfce7' : task.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
                borderRadius: '8px'
              }}>
                <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                  Status: {task.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {task.description && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Description</h3>
              <p style={{ color: '#6b7280', lineHeight: '1.6' }}>{task.description}</p>
            </div>
          )}
        </div>

        <div>
          {task.assignedTo && (
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Assigned To</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  color: '#4338ca'
                }}>
                  {task.assignedTo.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span style={{ fontWeight: '500' }}>{task.assignedTo.name}</span>
              </div>
            </div>
          )}

          {task.contact && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Related Contact</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <User size={20} color="#6b7280" />
                  <span style={{ fontWeight: '500' }}>{task.contact.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Building size={20} color="#6b7280" />
                  <span>{task.contact.company}</span>
                </div>
              </div>

              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '16px' }}
                onClick={() => navigate(`/contacts/${task.contact!.id}`)}
              >
                View Contact
              </button>
            </div>
          )}

          {task.campaign && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Related Campaign</h3>
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => navigate(`/campaigns/${task.campaign!.id}`)}
              >
                {task.campaign.name}
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog isOpen={showDeleteDialog} title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmLabel="Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleDelete} onCancel={() => setShowDeleteDialog(false)} />
    </div>
  );
};

export default TaskDetail;
