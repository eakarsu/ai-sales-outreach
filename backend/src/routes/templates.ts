import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

// Allowed sort columns for templates
const TEMPLATE_SORT_COLUMNS: Record<string, string> = {
  name: 't.name',
  subject: 't.subject',
  category: 't.category',
  openRate: 't.open_rate',
  replyRate: 't.reply_rate',
  usageCount: 't.usage_count',
  createdAt: 't.created_at',
};

router.get('/', async (req, res) => {
  try {
    const { teamId, category, aiGenerated, page = 1, limit = 20, sortBy = 'usageCount', sortOrder = 'desc' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const sortColumn = TEMPLATE_SORT_COLUMNS[sortBy as string] || 't.usage_count';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let query = `SELECT t.*, u.first_name as creator_first_name, u.last_name as creator_last_name
                 FROM email_templates t
                 LEFT JOIN users u ON t.created_by = u.id
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM email_templates t WHERE 1=1`;
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

    if (category) {
      query += ` AND t.category = $${paramIndex++}`;
      countQuery += ` AND t.category = $${countParamIndex++}`;
      params.push(category);
      countParams.push(category);
    }

    if (aiGenerated !== undefined) {
      query += ` AND t.is_ai_generated = $${paramIndex++}`;
      countQuery += ` AND t.is_ai_generated = $${countParamIndex++}`;
      params.push(aiGenerated === 'true');
      countParams.push(aiGenerated === 'true');
    }

    query += ` ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      templates: result.rows.map(t => ({
        id: t.id,
        teamId: t.team_id,
        name: t.name,
        subject: t.subject,
        body: t.body,
        category: t.category,
        isAiGenerated: t.is_ai_generated,
        variables: t.variables,
        openRate: parseFloat(t.open_rate),
        replyRate: parseFloat(t.reply_rate),
        usageCount: t.usage_count,
        createdBy: t.created_by,
        creatorName: t.creator_first_name ? `${t.creator_first_name} ${t.creator_last_name}` : null,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const result = await pool.query(
      `SELECT t.*, u.first_name as creator_first_name, u.last_name as creator_last_name
       FROM email_templates t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const t = result.rows[0];
    res.json({
      id: t.id,
      teamId: t.team_id,
      name: t.name,
      subject: t.subject,
      body: t.body,
      category: t.category,
      isAiGenerated: t.is_ai_generated,
      variables: t.variables,
      openRate: parseFloat(t.open_rate),
      replyRate: parseFloat(t.reply_rate),
      usageCount: t.usage_count,
      createdBy: t.created_by,
      creatorName: t.creator_first_name ? `${t.creator_first_name} ${t.creator_last_name}` : null,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { teamId, name, subject, body, category, isAiGenerated, variables, createdBy } = req.body;
    const result = await pool.query(
      `INSERT INTO email_templates (team_id, name, subject, body, category, is_ai_generated, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [teamId, name, subject, body, category, isAiGenerated || false, variables || [], createdBy]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, subject, body, category, variables } = req.body;
    const result = await pool.query(
      `UPDATE email_templates SET
       name = COALESCE($1, name),
       subject = COALESCE($2, subject),
       body = COALESCE($3, body),
       category = COALESCE($4, category),
       variables = COALESCE($5, variables),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, subject, body, category, variables, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM email_templates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/use', async (req, res) => {
  try {
    await pool.query(
      'UPDATE email_templates SET usage_count = usage_count + 1 WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating template usage:', error);
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
      `DELETE FROM email_templates WHERE id = ANY($1::uuid[]) RETURNING id`,
      [ids]
    );
    res.json({ deleted: result.rowCount });
  } catch (error) {
    console.error('Error bulk deleting templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV export
router.get('/export/csv', async (req, res) => {
  try {
    const { teamId } = req.query;
    let query = 'SELECT * FROM email_templates';
    const params: any[] = [];
    if (teamId) {
      query += ' WHERE team_id = $1';
      params.push(teamId);
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const headers = ['Name', 'Subject', 'Body', 'Category', 'AI Generated', 'Open Rate', 'Reply Rate', 'Usage Count', 'Created At'];
    const rows = result.rows.map(t => [
      t.name, t.subject, t.body, t.category, t.is_ai_generated,
      t.open_rate, t.reply_rate, t.usage_count, t.created_at
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=templates.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
