import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

// Allowed sort columns for campaigns
const CAMPAIGN_SORT_COLUMNS: Record<string, string> = {
  name: 'c.name',
  status: 'c.status',
  type: 'c.type',
  startDate: 'c.start_date',
  endDate: 'c.end_date',
  totalContacts: 'c.total_contacts',
  emailsSent: 'c.emails_sent',
  revenueGenerated: 'c.revenue_generated',
  createdAt: 'c.created_at',
};

router.get('/', async (req, res) => {
  try {
    const { teamId, status, type, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const sortColumn = CAMPAIGN_SORT_COLUMNS[sortBy as string] || 'c.created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let query = `SELECT c.*, u.first_name as creator_first_name, u.last_name as creator_last_name
                 FROM campaigns c
                 LEFT JOIN users u ON c.created_by = u.id
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM campaigns c WHERE 1=1`;
    const params: any[] = [];
    const countParams: any[] = [];
    let paramIndex = 1;
    let countParamIndex = 1;

    if (teamId) {
      query += ` AND c.team_id = $${paramIndex++}`;
      countQuery += ` AND c.team_id = $${countParamIndex++}`;
      params.push(teamId);
      countParams.push(teamId);
    }

    if (status) {
      query += ` AND c.status = $${paramIndex++}`;
      countQuery += ` AND c.status = $${countParamIndex++}`;
      params.push(status);
      countParams.push(status);
    }

    if (type) {
      query += ` AND c.type = $${paramIndex++}`;
      countQuery += ` AND c.type = $${countParamIndex++}`;
      params.push(type);
      countParams.push(type);
    }

    query += ` ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      campaigns: result.rows.map(c => ({
        id: c.id,
        teamId: c.team_id,
        name: c.name,
        description: c.description,
        status: c.status,
        type: c.type,
        startDate: c.start_date,
        endDate: c.end_date,
        targetAudience: c.target_audience,
        totalContacts: c.total_contacts,
        emailsSent: c.emails_sent,
        emailsOpened: c.emails_opened,
        emailsClicked: c.emails_clicked,
        repliesReceived: c.replies_received,
        meetingsBooked: c.meetings_booked,
        revenueGenerated: parseFloat(c.revenue_generated),
        createdBy: c.created_by,
        creatorName: c.creator_first_name ? `${c.creator_first_name} ${c.creator_last_name}` : null,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        openRate: c.emails_sent > 0 ? ((c.emails_opened / c.emails_sent) * 100).toFixed(1) : 0,
        replyRate: c.emails_sent > 0 ? ((c.replies_received / c.emails_sent) * 100).toFixed(1) : 0
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const result = await pool.query(
      `SELECT c.*, u.first_name as creator_first_name, u.last_name as creator_last_name
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const sequencesResult = await pool.query(
      `SELECT cs.*, et.name as template_name, et.subject as template_subject
       FROM campaign_sequences cs
       LEFT JOIN email_templates et ON cs.template_id = et.id
       WHERE cs.campaign_id = $1
       ORDER BY cs.step_number`,
      [req.params.id]
    );

    const emailsResult = await pool.query(
      `SELECT es.*, co.first_name, co.last_name, co.email as contact_email, co.company
       FROM emails_sent es
       JOIN contacts co ON es.contact_id = co.id
       WHERE es.campaign_id = $1
       ORDER BY es.sent_at DESC
       LIMIT 50`,
      [req.params.id]
    );

    const c = result.rows[0];
    res.json({
      id: c.id,
      teamId: c.team_id,
      name: c.name,
      description: c.description,
      status: c.status,
      type: c.type,
      startDate: c.start_date,
      endDate: c.end_date,
      targetAudience: c.target_audience,
      totalContacts: c.total_contacts,
      emailsSent: c.emails_sent,
      emailsOpened: c.emails_opened,
      emailsClicked: c.emails_clicked,
      repliesReceived: c.replies_received,
      meetingsBooked: c.meetings_booked,
      revenueGenerated: parseFloat(c.revenue_generated),
      createdBy: c.created_by,
      creatorName: c.creator_first_name ? `${c.creator_first_name} ${c.creator_last_name}` : null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      openRate: c.emails_sent > 0 ? ((c.emails_opened / c.emails_sent) * 100).toFixed(1) : 0,
      replyRate: c.emails_sent > 0 ? ((c.replies_received / c.emails_sent) * 100).toFixed(1) : 0,
      sequences: sequencesResult.rows.map(s => ({
        id: s.id,
        stepNumber: s.step_number,
        templateId: s.template_id,
        templateName: s.template_name,
        templateSubject: s.template_subject,
        delayDays: s.delay_days,
        delayHours: s.delay_hours,
        subjectOverride: s.subject_override,
        bodyOverride: s.body_override
      })),
      recentEmails: emailsResult.rows.map(e => ({
        id: e.id,
        contactId: e.contact_id,
        contactName: `${e.first_name} ${e.last_name}`,
        contactEmail: e.contact_email,
        company: e.company,
        subject: e.subject,
        status: e.status,
        sentAt: e.sent_at,
        openedAt: e.opened_at,
        repliedAt: e.replied_at
      }))
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { teamId, name, description, type, targetAudience, createdBy } = req.body;
    const result = await pool.query(
      `INSERT INTO campaigns (team_id, name, description, type, target_audience, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [teamId, name, description, type || 'outreach', targetAudience, createdBy]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, status, type, startDate, endDate, targetAudience } = req.body;
    const result = await pool.query(
      `UPDATE campaigns SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       status = COALESCE($3, status),
       type = COALESCE($4, type),
       start_date = COALESCE($5, start_date),
       end_date = COALESCE($6, end_date),
       target_audience = COALESCE($7, target_audience),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, description, status, type, startDate, endDate, targetAudience, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM campaigns WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/start', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE campaigns SET status = 'active', start_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE campaigns SET status = 'paused', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/sequences', async (req, res) => {
  try {
    const { templateId, stepNumber, delayDays, delayHours, subjectOverride, bodyOverride } = req.body;
    const result = await pool.query(
      `INSERT INTO campaign_sequences (campaign_id, template_id, step_number, delay_days, delay_hours, subject_override, body_override)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.params.id, templateId, stepNumber, delayDays || 0, delayHours || 0, subjectOverride, bodyOverride]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding sequence:', error);
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
      `DELETE FROM campaigns WHERE id = ANY($1::uuid[]) RETURNING id`,
      [ids]
    );
    res.json({ deleted: result.rowCount });
  } catch (error) {
    console.error('Error bulk deleting campaigns:', error);
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
      `UPDATE campaigns SET ${setClauses.join(', ')} WHERE id = ANY($1::uuid[]) RETURNING id`,
      params
    );
    res.json({ updated: result.rowCount });
  } catch (error) {
    console.error('Error bulk updating campaigns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV export
router.get('/export/csv', async (req, res) => {
  try {
    const { teamId } = req.query;
    let query = 'SELECT * FROM campaigns';
    const params: any[] = [];
    if (teamId) {
      query += ' WHERE team_id = $1';
      params.push(teamId);
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const headers = ['Name', 'Description', 'Status', 'Type', 'Start Date', 'End Date', 'Total Contacts', 'Emails Sent', 'Emails Opened', 'Replies Received', 'Meetings Booked', 'Revenue Generated', 'Created At'];
    const rows = result.rows.map(c => [
      c.name, c.description, c.status, c.type, c.start_date, c.end_date,
      c.total_contacts, c.emails_sent, c.emails_opened, c.replies_received,
      c.meetings_booked, c.revenue_generated, c.created_at
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=campaigns.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting campaigns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
