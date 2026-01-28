import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { teamId, category, aiGenerated } = req.query;

    let query = `SELECT t.*, u.first_name as creator_first_name, u.last_name as creator_last_name
                 FROM email_templates t
                 LEFT JOIN users u ON t.created_by = u.id
                 WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (teamId) {
      query += ` AND t.team_id = $${paramIndex++}`;
      params.push(teamId);
    }

    if (category) {
      query += ` AND t.category = $${paramIndex++}`;
      params.push(category);
    }

    if (aiGenerated !== undefined) {
      query += ` AND t.is_ai_generated = $${paramIndex++}`;
      params.push(aiGenerated === 'true');
    }

    query += ` ORDER BY t.usage_count DESC, t.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(t => ({
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
    })));
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

export default router;
