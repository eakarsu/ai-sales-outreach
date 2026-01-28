import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.first_name as owner_first_name, u.last_name as owner_last_name,
       (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
       FROM teams t
       LEFT JOIN users u ON t.owner_id = u.id
       ORDER BY t.created_at DESC`
    );
    res.json(result.rows.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      ownerId: t.owner_id,
      ownerName: `${t.owner_first_name} ${t.owner_last_name}`,
      plan: t.plan,
      monthlyPrice: t.monthly_price,
      memberCount: parseInt(t.member_count),
      createdAt: t.created_at
    })));
  } catch (error) {
    console.error('Error fetching teams:', error);
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
      `SELECT t.*, u.first_name as owner_first_name, u.last_name as owner_last_name
       FROM teams t
       LEFT JOIN users u ON t.owner_id = u.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role as user_role, tm.role as team_role
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1`,
      [req.params.id]
    );

    const t = result.rows[0];
    res.json({
      id: t.id,
      name: t.name,
      description: t.description,
      ownerId: t.owner_id,
      ownerName: `${t.owner_first_name} ${t.owner_last_name}`,
      plan: t.plan,
      monthlyPrice: t.monthly_price,
      createdAt: t.created_at,
      members: membersResult.rows.map(m => ({
        id: m.id,
        email: m.email,
        firstName: m.first_name,
        lastName: m.last_name,
        userRole: m.user_role,
        teamRole: m.team_role
      }))
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, ownerId, plan, monthlyPrice } = req.body;
    const result = await pool.query(
      `INSERT INTO teams (name, description, owner_id, plan, monthly_price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, ownerId, plan || 'starter', monthlyPrice || 50]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, plan, monthlyPrice } = req.body;
    const result = await pool.query(
      `UPDATE teams SET name = $1, description = $2, plan = $3, monthly_price = $4
       WHERE id = $5
       RETURNING *`,
      [name, description, plan, monthlyPrice, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const { userId, role } = req.body;
    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO UPDATE SET role = $3`,
      [req.params.id, userId, role || 'member']
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/members/:userId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
