import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

// Allowed sort columns for meetings
const MEETING_SORT_COLUMNS: Record<string, string> = {
  title: 'm.title',
  status: 'm.status',
  meetingType: 'm.meeting_type',
  scheduledAt: 'm.scheduled_at',
  durationMinutes: 'm.duration_minutes',
  revenuePotential: 'm.revenue_potential',
  createdAt: 'm.created_at',
};

// Get all meetings
router.get('/', async (req, res) => {
  try {
    const { teamId, status, userId, page = 1, limit = 20, sortBy = 'scheduledAt', sortOrder = 'desc' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const sortColumn = MEETING_SORT_COLUMNS[sortBy as string] || 'm.scheduled_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let query = `
      SELECT m.*,
        c.first_name as contact_first_name, c.last_name as contact_last_name, c.company as contact_company,
        u.first_name as user_first_name, u.last_name as user_last_name
      FROM meetings m
      LEFT JOIN contacts c ON m.contact_id = c.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) FROM meetings m WHERE 1=1`;
    const params: any[] = [];
    const countParams: any[] = [];
    let paramIndex = 1;
    let countParamIndex = 1;

    if (teamId) {
      query += ` AND m.team_id = $${paramIndex++}`;
      countQuery += ` AND m.team_id = $${countParamIndex++}`;
      params.push(teamId);
      countParams.push(teamId);
    }

    if (status) {
      query += ` AND m.status = $${paramIndex++}`;
      countQuery += ` AND m.status = $${countParamIndex++}`;
      params.push(status);
      countParams.push(status);
    }

    if (userId) {
      query += ` AND m.user_id = $${paramIndex++}`;
      countQuery += ` AND m.user_id = $${countParamIndex++}`;
      params.push(userId);
      countParams.push(userId);
    }

    query += ` ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      meetings: result.rows.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        meetingType: m.meeting_type,
        status: m.status,
        scheduledAt: m.scheduled_at,
        durationMinutes: m.duration_minutes,
        location: m.location,
        meetingLink: m.meeting_link,
        outcome: m.outcome,
        notes: m.notes,
        revenuePotential: parseFloat(m.revenue_potential) || 0,
        contact: m.contact_first_name ? {
          id: m.contact_id,
          name: `${m.contact_first_name} ${m.contact_last_name}`,
          company: m.contact_company,
        } : null,
        user: m.user_first_name ? {
          id: m.user_id,
          name: `${m.user_first_name} ${m.user_last_name}`,
        } : null,
        createdAt: m.created_at,
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meeting by ID
router.get('/:id', async (req, res) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT m.*,
        c.first_name as contact_first_name, c.last_name as contact_last_name,
        c.company as contact_company, c.email as contact_email, c.job_title as contact_title,
        u.first_name as user_first_name, u.last_name as user_last_name
       FROM meetings m
       LEFT JOIN contacts c ON m.contact_id = c.id
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const m = result.rows[0];
    res.json({
      id: m.id,
      title: m.title,
      description: m.description,
      meetingType: m.meeting_type,
      status: m.status,
      scheduledAt: m.scheduled_at,
      durationMinutes: m.duration_minutes,
      location: m.location,
      meetingLink: m.meeting_link,
      outcome: m.outcome,
      notes: m.notes,
      revenuePotential: parseFloat(m.revenue_potential) || 0,
      contact: m.contact_first_name ? {
        id: m.contact_id,
        name: `${m.contact_first_name} ${m.contact_last_name}`,
        company: m.contact_company,
        email: m.contact_email,
        title: m.contact_title,
      } : null,
      user: m.user_first_name ? {
        id: m.user_id,
        name: `${m.user_first_name} ${m.user_last_name}`,
      } : null,
      createdAt: m.created_at,
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create meeting
router.post('/', async (req, res) => {
  try {
    const { teamId, contactId, userId, title, description, meetingType, scheduledAt, durationMinutes, location, meetingLink, revenuePotential } = req.body;

    const result = await pool.query(
      `INSERT INTO meetings (team_id, contact_id, user_id, title, description, meeting_type, scheduled_at, duration_minutes, location, meeting_link, revenue_potential)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [teamId, contactId, userId, title, description, meetingType || 'discovery', scheduledAt, durationMinutes || 30, location, meetingLink, revenuePotential || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update meeting
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, meetingType, status, scheduledAt, durationMinutes, location, meetingLink, outcome, notes, revenuePotential } = req.body;

    const result = await pool.query(
      `UPDATE meetings SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        meeting_type = COALESCE($3, meeting_type),
        status = COALESCE($4, status),
        scheduled_at = COALESCE($5, scheduled_at),
        duration_minutes = COALESCE($6, duration_minutes),
        location = COALESCE($7, location),
        meeting_link = COALESCE($8, meeting_link),
        outcome = COALESCE($9, outcome),
        notes = COALESCE($10, notes),
        revenue_potential = COALESCE($11, revenue_potential),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [title, description, meetingType, status, scheduledAt, durationMinutes, location, meetingLink, outcome, notes, revenuePotential, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete meeting with outcome
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, notes } = req.body;

    await pool.query(
      `UPDATE meetings SET status = 'completed', outcome = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [outcome, notes, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel meeting
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE meetings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete meeting
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM meetings WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meeting stats
router.get('/stats/summary', async (req, res) => {
  try {
    const { teamId } = req.query;

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_meetings,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE outcome = 'positive') as positive_outcomes,
        SUM(revenue_potential) as total_pipeline
       FROM meetings
       WHERE team_id = $1`,
      [teamId]
    );

    const r = result.rows[0];
    res.json({
      totalMeetings: parseInt(r.total_meetings) || 0,
      scheduled: parseInt(r.scheduled) || 0,
      completed: parseInt(r.completed) || 0,
      cancelled: parseInt(r.cancelled) || 0,
      positiveOutcomes: parseInt(r.positive_outcomes) || 0,
      totalPipeline: parseFloat(r.total_pipeline) || 0,
    });
  } catch (error) {
    console.error('Error fetching meeting stats:', error);
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
      `DELETE FROM meetings WHERE id = ANY($1::uuid[]) RETURNING id`,
      [ids]
    );
    res.json({ deleted: result.rowCount });
  } catch (error) {
    console.error('Error bulk deleting meetings:', error);
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

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(
      `UPDATE meetings SET ${setClauses.join(', ')} WHERE id = ANY($1::uuid[]) RETURNING id`,
      params
    );
    res.json({ updated: result.rowCount });
  } catch (error) {
    console.error('Error bulk updating meetings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV export
router.get('/export/csv', async (req, res) => {
  try {
    const { teamId } = req.query;
    let query = 'SELECT * FROM meetings';
    const params: any[] = [];
    if (teamId) {
      query += ' WHERE team_id = $1';
      params.push(teamId);
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const headers = ['Title', 'Description', 'Meeting Type', 'Status', 'Scheduled At', 'Duration (min)', 'Location', 'Meeting Link', 'Outcome', 'Notes', 'Revenue Potential', 'Created At'];
    const rows = result.rows.map(m => [
      m.title, m.description, m.meeting_type, m.status, m.scheduled_at,
      m.duration_minutes, m.location, m.meeting_link, m.outcome, m.notes,
      m.revenue_potential, m.created_at
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=meetings.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting meetings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
