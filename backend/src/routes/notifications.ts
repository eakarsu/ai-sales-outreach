import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

// Get all notifications for user
router.get('/', async (req, res) => {
  try {
    const { userId, unreadOnly, limit = 50 } = req.query;

    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (unreadOnly === 'true') {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT $2';
    params.push(parseInt(limit as string));

    const result = await pool.query(query, params);

    res.json(result.rows.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: n.is_read,
      createdAt: n.created_at,
    })));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const { userId } = req.query;

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ count: parseInt(result.rows[0].count) || 0 });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create notification
router.post('/', async (req, res) => {
  try {
    const { teamId, userId, type, title, message, link } = req.body;

    const result = await pool.query(
      `INSERT INTO notifications (team_id, user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [teamId, userId, type, title, message, link]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark as read
router.post('/:id/read', async (req, res) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1',
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all as read
router.post('/read-all', async (req, res) => {
  try {
    const { userId } = req.body;

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete all read notifications
router.delete('/clear/read', async (req, res) => {
  try {
    const { userId } = req.query;
    await pool.query('DELETE FROM notifications WHERE user_id = $1 AND is_read = true', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
