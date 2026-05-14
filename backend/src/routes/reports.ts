import { Router } from 'express';
import { pool } from '../config/database';

import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Get all reports
router.get('/', async (req, res) => {
  try {
    const { teamId, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [result, countResult] = await Promise.all([
      pool.query(
        `SELECT r.*, u.first_name, u.last_name
         FROM reports r
         LEFT JOIN users u ON r.created_by = u.id
         WHERE r.team_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [teamId, limitNum, offset]
      ),
      pool.query('SELECT COUNT(*) FROM reports WHERE team_id = $1', [teamId]),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      reports: result.rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        reportType: r.report_type,
        dateRange: r.date_range,
        status: r.status,
        fileUrl: r.file_url,
        createdBy: r.first_name ? `${r.first_name} ${r.last_name}` : null,
        createdAt: r.created_at,
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get report by ID
router.get('/:id', async (req, res) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, u.first_name, u.last_name
       FROM reports r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const r = result.rows[0];
    res.json({
      id: r.id,
      name: r.name,
      description: r.description,
      reportType: r.report_type,
      dateRange: r.date_range,
      filters: r.filters,
      data: r.data,
      status: r.status,
      fileUrl: r.file_url,
      createdBy: r.first_name ? `${r.first_name} ${r.last_name}` : null,
      createdAt: r.created_at,
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate report
router.post('/generate', async (req, res) => {
  try {
    const { teamId, createdBy, name, description, reportType, dateRange, filters } = req.body;

    if (!teamId || !name || !reportType) {
      return res.status(400).json({ error: 'Missing required fields: teamId, name, reportType' });
    }

    // Generate report data based on type
    let data: any = {};

    switch (reportType) {
      case 'campaign_performance':
        const campaignResult = await pool.query(
          `SELECT name, emails_sent, emails_opened, replies_received, meetings_booked, revenue_generated,
            CASE WHEN emails_sent > 0 THEN (emails_opened::float / emails_sent * 100) ELSE 0 END as open_rate,
            CASE WHEN emails_sent > 0 THEN (replies_received::float / emails_sent * 100) ELSE 0 END as reply_rate
           FROM campaigns WHERE team_id = $1 ORDER BY revenue_generated DESC`,
          [teamId]
        );
        data = { campaigns: campaignResult.rows };
        break;

      case 'email_analytics':
        const emailResult = await pool.query(
          `SELECT date, emails_sent, emails_opened, emails_clicked, replies_received
           FROM analytics WHERE team_id = $1 ORDER BY date DESC LIMIT 30`,
          [teamId]
        );
        data = { analytics: emailResult.rows };
        break;

      case 'team_performance':
        const teamResult = await pool.query(
          `SELECT u.first_name, u.last_name,
            COUNT(DISTINCT m.id) as meetings_booked,
            COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as tasks_completed
           FROM users u
           JOIN team_members tm ON u.id = tm.user_id
           LEFT JOIN meetings m ON u.id = m.user_id AND m.team_id = $1
           LEFT JOIN tasks t ON u.id = t.assigned_to AND t.team_id = $1
           WHERE tm.team_id = $1
           GROUP BY u.id, u.first_name, u.last_name`,
          [teamId]
        );
        data = { teamMembers: teamResult.rows };
        break;

      case 'contact_engagement':
        const contactResult = await pool.query(
          `SELECT c.first_name, c.last_name, c.company, c.status, c.lead_score,
            COUNT(es.id) as emails_received,
            COUNT(es.id) FILTER (WHERE es.opened_at IS NOT NULL) as emails_opened
           FROM contacts c
           LEFT JOIN emails_sent es ON c.id = es.contact_id
           WHERE c.team_id = $1
           GROUP BY c.id, c.first_name, c.last_name, c.company, c.status, c.lead_score
           ORDER BY c.lead_score DESC`,
          [teamId]
        );
        data = { contacts: contactResult.rows };
        break;

      case 'revenue_summary':
        const revenueResult = await pool.query(
          `SELECT
            SUM(revenue_generated) as total_revenue,
            SUM(meetings_booked) as total_meetings,
            COUNT(*) as total_campaigns,
            AVG(CASE WHEN emails_sent > 0 THEN (replies_received::float / emails_sent * 100) ELSE 0 END) as avg_reply_rate
           FROM campaigns WHERE team_id = $1`,
          [teamId]
        );
        data = { summary: revenueResult.rows[0] };
        break;

      default:
        data = { message: 'Report type not supported' };
    }

    // Save the report
    const result = await pool.query(
      `INSERT INTO reports (team_id, created_by, name, description, report_type, date_range, filters, data, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed')
       RETURNING *`,
      [teamId, createdBy || null, name, description || null, reportType, dateRange || 'last_30_days', JSON.stringify(filters || {}), JSON.stringify(data)]
    );

    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      reportType: result.rows[0].report_type,
      data,
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete report
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
