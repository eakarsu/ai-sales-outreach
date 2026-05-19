import { Router } from 'express';
import { pool } from '../config/database';

import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Allowed sort columns for tasks
const TASK_SORT_COLUMNS: Record<string, string> = {
  title: 't.title',
  taskType: 't.task_type',
  priority: 't.priority',
  status: 't.status',
  dueDate: 't.due_date',
  completedAt: 't.completed_at',
  createdAt: 't.created_at',
};

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const { teamId, status, assignedTo, priority, page = 1, limit = 20, sortBy = 'dueDate', sortOrder = 'asc' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const sortColumn = TASK_SORT_COLUMNS[sortBy as string] || 't.due_date';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    let query = `
      SELECT t.*,
        c.first_name as contact_first_name, c.last_name as contact_last_name, c.company as contact_company,
        u.first_name as creator_first_name, u.last_name as creator_last_name,
        a.first_name as assignee_first_name, a.last_name as assignee_last_name,
        camp.name as campaign_name
      FROM tasks t
      LEFT JOIN contacts c ON t.contact_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      LEFT JOIN campaigns camp ON t.campaign_id = camp.id
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) FROM tasks t WHERE 1=1`;
    const params: any[] = [];
    const countParams: any[] = [];
    let paramIndex = 1;
    let countParamIndex = 1;

    if (teamId) {
      query += ` AND t.team_id = $${paramIndex++}`;
      countQuery += ` AND t.team_id = $${countParamIndex++}`;
      params.push(teamId);
      countParams.push(teamId);
    }

    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      countQuery += ` AND t.status = $${countParamIndex++}`;
      params.push(status);
      countParams.push(status);
    }

    if (assignedTo) {
      query += ` AND t.assigned_to = $${paramIndex++}`;
      countQuery += ` AND t.assigned_to = $${countParamIndex++}`;
      params.push(assignedTo);
      countParams.push(assignedTo);
    }

    if (priority) {
      query += ` AND t.priority = $${paramIndex++}`;
      countQuery += ` AND t.priority = $${countParamIndex++}`;
      params.push(priority);
      countParams.push(priority);
    }

    query += ` ORDER BY ${sortColumn} ${order} NULLS LAST LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      tasks: result.rows.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        taskType: t.task_type,
        priority: t.priority,
        status: t.status,
        dueDate: t.due_date,
        completedAt: t.completed_at,
        contact: t.contact_first_name ? {
          id: t.contact_id,
          name: `${t.contact_first_name} ${t.contact_last_name}`,
          company: t.contact_company,
        } : null,
        createdBy: t.creator_first_name ? {
          id: t.user_id,
          name: `${t.creator_first_name} ${t.creator_last_name}`,
        } : null,
        assignedTo: t.assignee_first_name ? {
          id: t.assigned_to,
          name: `${t.assignee_first_name} ${t.assignee_last_name}`,
        } : null,
        campaign: t.campaign_name ? {
          id: t.campaign_id,
          name: t.campaign_name,
        } : null,
        createdAt: t.created_at,
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task by ID
router.get('/:id', async (req, res) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*,
        c.first_name as contact_first_name, c.last_name as contact_last_name,
        c.company as contact_company, c.email as contact_email,
        u.first_name as creator_first_name, u.last_name as creator_last_name,
        a.first_name as assignee_first_name, a.last_name as assignee_last_name,
        camp.name as campaign_name
       FROM tasks t
       LEFT JOIN contacts c ON t.contact_id = c.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN users a ON t.assigned_to = a.id
       LEFT JOIN campaigns camp ON t.campaign_id = camp.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const t = result.rows[0];
    res.json({
      id: t.id,
      title: t.title,
      description: t.description,
      taskType: t.task_type,
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date,
      completedAt: t.completed_at,
      contact: t.contact_first_name ? {
        id: t.contact_id,
        name: `${t.contact_first_name} ${t.contact_last_name}`,
        company: t.contact_company,
        email: t.contact_email,
      } : null,
      createdBy: t.creator_first_name ? {
        id: t.user_id,
        name: `${t.creator_first_name} ${t.creator_last_name}`,
      } : null,
      assignedTo: t.assignee_first_name ? {
        id: t.assigned_to,
        name: `${t.assignee_first_name} ${t.assignee_last_name}`,
      } : null,
      campaign: t.campaign_name ? {
        id: t.campaign_id,
        name: t.campaign_name,
      } : null,
      createdAt: t.created_at,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const { teamId, userId, assignedTo, contactId, campaignId, title, description, taskType, priority, dueDate } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks (team_id, user_id, assigned_to, contact_id, campaign_id, title, description, task_type, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [teamId, userId, assignedTo || userId, contactId, campaignId, title, description, taskType || 'follow_up', priority || 'medium', dueDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, taskType, priority, status, dueDate, assignedTo } = req.body;

    const result = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        task_type = COALESCE($3, task_type),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        due_date = COALESCE($6, due_date),
        assigned_to = COALESCE($7, assigned_to),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [title, description, taskType, priority, status, dueDate, assignedTo, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete task
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task stats
router.get('/stats/summary', async (req, res) => {
  try {
    const { teamId, userId } = req.query;

    let query = `
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed') as high_priority,
        COUNT(*) FILTER (WHERE due_date < CURRENT_TIMESTAMP AND status != 'completed') as overdue
      FROM tasks
      WHERE team_id = $1
    `;
    const params: any[] = [teamId];

    if (userId) {
      params.push(userId);
      query += ` AND assigned_to = $${params.length}`;
    }

    const result = await pool.query(query, params);

    const r = result.rows[0];
    res.json({
      totalTasks: parseInt(r.total_tasks) || 0,
      pending: parseInt(r.pending) || 0,
      inProgress: parseInt(r.in_progress) || 0,
      completed: parseInt(r.completed) || 0,
      highPriority: parseInt(r.high_priority) || 0,
      overdue: parseInt(r.overdue) || 0,
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk delete
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'At least one ID is required' });
    }
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = ANY($1::uuid[]) RETURNING id',
      [ids]
    );
    res.json({ deleted: result.rowCount });
  } catch (error) {
    console.error('Error bulk deleting tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update
router.post('/bulk-update', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'At least one ID is required' });
    }
    const setClauses: string[] = [];
    const params: any[] = [ids];
    let paramIndex = 2;

    if (updates.status) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(updates.status);
    }
    if (updates.priority) {
      setClauses.push(`priority = $${paramIndex++}`);
      params.push(updates.priority);
    }
    if (updates.assignedTo) {
      setClauses.push(`assigned_to = $${paramIndex++}`);
      params.push(updates.assignedTo);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    const result = await pool.query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ANY($1::uuid[]) RETURNING id`,
      params
    );
    res.json({ updated: result.rowCount });
  } catch (error) {
    console.error('Error bulk updating tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV export
router.get('/export/csv', async (req, res) => {
  try {
    const { teamId } = req.query;
    let query = 'SELECT t.*, u.first_name as assignee_first, u.last_name as assignee_last FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id';
    const params: any[] = [];
    if (teamId) {
      query += ' WHERE t.team_id = $1';
      params.push(teamId);
    }
    query += ' ORDER BY t.created_at DESC';
    const result = await pool.query(query, params);

    const headers = ['Title', 'Type', 'Priority', 'Status', 'Assigned To', 'Due Date', 'Created At'];
    const rows = result.rows.map(t => [
      t.title, t.task_type, t.priority, t.status,
      `${t.assignee_first || ''} ${t.assignee_last || ''}`.trim(),
      t.due_date, t.created_at
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
