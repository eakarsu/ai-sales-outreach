import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/track/open/:trackingId — tracking pixel for email open events
router.get('/open/:trackingId', async (req, res) => {
  const PIXEL = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  try {
    const { trackingId } = req.params;

    await pool.query(
      `UPDATE emails_sent
       SET opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP)
       WHERE tracking_id = $1`,
      [trackingId]
    );
  } catch (error) {
    console.error('Error recording email open:', error);
  }

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', PIXEL.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(PIXEL);
});

// GET /api/campaigns/:id/stats — campaign email stats (requires auth)
router.get('/campaigns/:id/stats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const campaignResult = await pool.query(
      `SELECT id, name, emails_sent FROM campaigns WHERE id = $1`,
      [id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    const statsResult = await pool.query(
      `SELECT
        COUNT(*) AS total_sent,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
        COUNT(*) FILTER (WHERE replied_at IS NOT NULL) AS replied,
        COUNT(*) FILTER (WHERE bounced_at IS NOT NULL) AS bounced
       FROM emails_sent
       WHERE campaign_id = $1`,
      [id]
    );

    const s = statsResult.rows[0];
    const totalSent = parseInt(s.total_sent) || 0;
    const opened = parseInt(s.opened) || 0;
    const replied = parseInt(s.replied) || 0;
    const bounced = parseInt(s.bounced) || 0;

    res.json({
      campaignId: id,
      campaignName: campaign.name,
      totalSent,
      opened,
      replied,
      bounced,
      openRate: totalSent > 0 ? parseFloat((opened / totalSent * 100).toFixed(2)) : 0,
      replyRate: totalSent > 0 ? parseFloat((replied / totalSent * 100).toFixed(2)) : 0,
      bounceRate: totalSent > 0 ? parseFloat((bounced / totalSent * 100).toFixed(2)) : 0,
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
