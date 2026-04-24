import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

// Allowed sort columns for contacts
const CONTACT_SORT_COLUMNS: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  company: 'company',
  status: 'status',
  leadScore: 'lead_score',
  createdAt: 'created_at',
  lastContactedAt: 'last_contacted_at',
};

router.get('/', async (req, res) => {
  try {
    const { teamId, status, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const sortColumn = CONTACT_SORT_COLUMNS[sortBy as string] || 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let query = `SELECT * FROM contacts WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM contacts WHERE 1=1`;
    const params: any[] = [];
    const countParams: any[] = [];
    let paramIndex = 1;
    let countParamIndex = 1;

    if (teamId) {
      query += ` AND team_id = $${paramIndex++}`;
      countQuery += ` AND team_id = $${countParamIndex++}`;
      params.push(teamId);
      countParams.push(teamId);
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      countQuery += ` AND status = $${countParamIndex++}`;
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR company ILIKE $${paramIndex})`;
      countQuery += ` AND (first_name ILIKE $${countParamIndex} OR last_name ILIKE $${countParamIndex} OR email ILIKE $${countParamIndex} OR company ILIKE $${countParamIndex})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      paramIndex++;
      countParamIndex++;
    }

    query += ` ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      contacts: result.rows.map(c => ({
        id: c.id,
        teamId: c.team_id,
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
        company: c.company,
        jobTitle: c.job_title,
        phone: c.phone,
        linkedinUrl: c.linkedin_url,
        status: c.status,
        leadScore: c.lead_score,
        source: c.source,
        tags: c.tags,
        customFields: c.custom_fields,
        lastContactedAt: c.last_contacted_at,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    // Skip non-UUID values like "new"
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }

    const result = await pool.query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const emailsResult = await pool.query(
      `SELECT es.*, c.name as campaign_name
       FROM emails_sent es
       LEFT JOIN campaigns c ON es.campaign_id = c.id
       WHERE es.contact_id = $1
       ORDER BY es.sent_at DESC
       LIMIT 20`,
      [req.params.id]
    );

    const c = result.rows[0];
    res.json({
      id: c.id,
      teamId: c.team_id,
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      company: c.company,
      jobTitle: c.job_title,
      phone: c.phone,
      linkedinUrl: c.linkedin_url,
      status: c.status,
      leadScore: c.lead_score,
      source: c.source,
      tags: c.tags,
      customFields: c.custom_fields,
      lastContactedAt: c.last_contacted_at,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      emails: emailsResult.rows.map(e => ({
        id: e.id,
        campaignId: e.campaign_id,
        campaignName: e.campaign_name,
        subject: e.subject,
        status: e.status,
        sentAt: e.sent_at,
        openedAt: e.opened_at,
        clickedAt: e.clicked_at,
        repliedAt: e.replied_at
      }))
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { teamId, email, firstName, lastName, company, jobTitle, phone, linkedinUrl, status, source, tags } = req.body;
    const result = await pool.query(
      `INSERT INTO contacts (team_id, email, first_name, last_name, company, job_title, phone, linkedin_url, status, source, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [teamId, email, firstName, lastName, company, jobTitle, phone, linkedinUrl, status || 'new', source, tags || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { email, firstName, lastName, company, jobTitle, phone, linkedinUrl, status, leadScore, tags } = req.body;
    const result = await pool.query(
      `UPDATE contacts SET
       email = COALESCE($1, email),
       first_name = COALESCE($2, first_name),
       last_name = COALESCE($3, last_name),
       company = COALESCE($4, company),
       job_title = COALESCE($5, job_title),
       phone = COALESCE($6, phone),
       linkedin_url = COALESCE($7, linkedin_url),
       status = COALESCE($8, status),
       lead_score = COALESCE($9, lead_score),
       tags = COALESCE($10, tags),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [email, firstName, lastName, company, jobTitle, phone, linkedinUrl, status, leadScore, tags, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM contacts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { contacts, teamId } = req.body;
    const insertedIds = [];

    for (const contact of contacts) {
      const result = await pool.query(
        `INSERT INTO contacts (team_id, email, first_name, last_name, company, job_title, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [teamId, contact.email, contact.firstName, contact.lastName, contact.company, contact.jobTitle, 'bulk_import']
      );
      if (result.rows.length > 0) {
        insertedIds.push(result.rows[0].id);
      }
    }

    res.status(201).json({ imported: insertedIds.length });
  } catch (error) {
    console.error('Error bulk importing contacts:', error);
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
      `DELETE FROM contacts WHERE id = ANY($1::uuid[]) RETURNING id`,
      [ids]
    );
    res.json({ deleted: result.rowCount });
  } catch (error) {
    console.error('Error bulk deleting contacts:', error);
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
    if (updates.leadScore !== undefined) {
      setClauses.push(`lead_score = $${paramIndex++}`);
      params.push(updates.leadScore);
    }
    if (updates.source) {
      setClauses.push(`source = $${paramIndex++}`);
      params.push(updates.source);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(
      `UPDATE contacts SET ${setClauses.join(', ')} WHERE id = ANY($1::uuid[]) RETURNING id`,
      params
    );
    res.json({ updated: result.rowCount });
  } catch (error) {
    console.error('Error bulk updating contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV export
router.get('/export/csv', async (req, res) => {
  try {
    const { teamId } = req.query;
    let query = 'SELECT * FROM contacts';
    const params: any[] = [];
    if (teamId) {
      query += ' WHERE team_id = $1';
      params.push(teamId);
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Job Title', 'Phone', 'Status', 'Lead Score', 'Source', 'Created At'];
    const rows = result.rows.map(c => [
      c.first_name, c.last_name, c.email, c.company, c.job_title,
      c.phone, c.status, c.lead_score, c.source, c.created_at
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
