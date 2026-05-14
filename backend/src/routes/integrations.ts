import { Router } from 'express';
import { pool } from '../config/database';

import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { teamId, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM integrations';
    let countQuery = 'SELECT COUNT(*) FROM integrations';
    const params: any[] = [];
    const countParams: any[] = [];

    if (teamId) {
      query += ' WHERE team_id = $1';
      countQuery += ' WHERE team_id = $1';
      params.push(teamId);
      countParams.push(teamId);
      query += ' ORDER BY name LIMIT $2 OFFSET $3';
      params.push(limitNum, offset);
    } else {
      query += ' ORDER BY name LIMIT $1 OFFSET $2';
      params.push(limitNum, offset);
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      integrations: result.rows.map(i => ({
        id: i.id,
        teamId: i.team_id,
        name: i.name,
        type: i.type,
        status: i.status,
        config: i.config,
        lastSyncAt: i.last_sync_at,
        createdAt: i.created_at
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
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
      'SELECT * FROM integrations WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const i = result.rows[0];
    res.json({
      id: i.id,
      teamId: i.team_id,
      name: i.name,
      type: i.type,
      status: i.status,
      config: i.config,
      lastSyncAt: i.last_sync_at,
      createdAt: i.created_at
    });
  } catch (error) {
    console.error('Error fetching integration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { teamId, name, type, config } = req.body;
    const result = await pool.query(
      `INSERT INTO integrations (team_id, name, type, config)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [teamId, name, type, config || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating integration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/connect', async (req, res) => {
  try {
    const { config } = req.body;
    const result = await pool.query(
      `UPDATE integrations SET
       status = 'connected',
       config = COALESCE($1, config),
       last_sync_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [config, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error connecting integration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/disconnect', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE integrations SET
       status = 'disconnected',
       config = '{}'
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/sync', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE integrations SET
       last_sync_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ success: true, lastSyncAt: result.rows[0].last_sync_at });
  } catch (error) {
    console.error('Error syncing integration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM integrations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
