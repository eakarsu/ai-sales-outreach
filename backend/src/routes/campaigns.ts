import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { teamId, status, type } = req.query;

    let query = `SELECT c.*, u.first_name as creator_first_name, u.last_name as creator_last_name
                 FROM campaigns c
                 LEFT JOIN users u ON c.created_by = u.id
                 WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (teamId) {
      query += ` AND c.team_id = $${paramIndex++}`;
      params.push(teamId);
    }

    if (status) {
      query += ` AND c.status = $${paramIndex++}`;
      params.push(status);
    }

    if (type) {
      query += ` AND c.type = $${paramIndex++}`;
      params.push(type);
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(c => ({
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
    })));
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

export default router;
