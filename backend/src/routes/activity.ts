import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { teamId, userId, action, limit = 50 } = req.query;

    let query = `SELECT al.*, u.first_name, u.last_name, u.email
                 FROM activity_log al
                 LEFT JOIN users u ON al.user_id = u.id
                 WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (teamId) {
      query += ` AND al.team_id = $${paramIndex++}`;
      params.push(teamId);
    }

    if (userId) {
      query += ` AND al.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (action) {
      query += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json(result.rows.map(a => ({
      id: a.id,
      teamId: a.team_id,
      userId: a.user_id,
      userName: a.first_name ? `${a.first_name} ${a.last_name}` : a.email,
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id,
      details: a.details,
      createdAt: a.created_at
    })));
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { teamId, userId, action, entityType, entityId, details } = req.body;
    const result = await pool.query(
      `INSERT INTO activity_log (team_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [teamId, userId, action, entityType, entityId, details || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { teamId } = req.query;

    const result = await pool.query(
      `SELECT action, COUNT(*) as count
       FROM activity_log
       WHERE team_id = $1 AND created_at >= CURRENT_DATE - 7
       GROUP BY action
       ORDER BY count DESC`,
      [teamId]
    );

    res.json(result.rows.map(r => ({
      action: r.action,
      count: parseInt(r.count)
    })));
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
