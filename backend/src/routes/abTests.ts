import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { teamId, status } = req.query;

    let query = `SELECT ab.*, c.name as campaign_name,
                 ta.name as variant_a_name, tb.name as variant_b_name
                 FROM ab_tests ab
                 LEFT JOIN campaigns c ON ab.campaign_id = c.id
                 LEFT JOIN email_templates ta ON ab.variant_a_template_id = ta.id
                 LEFT JOIN email_templates tb ON ab.variant_b_template_id = tb.id
                 WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (teamId) {
      query += ` AND c.team_id = $${paramIndex++}`;
      params.push(teamId);
    }

    if (status) {
      query += ` AND ab.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY ab.started_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(t => ({
      id: t.id,
      campaignId: t.campaign_id,
      campaignName: t.campaign_name,
      name: t.name,
      status: t.status,
      variantATemplateId: t.variant_a_template_id,
      variantBTemplateId: t.variant_b_template_id,
      variantAName: t.variant_a_name,
      variantBName: t.variant_b_name,
      variantASent: t.variant_a_sent,
      variantBSent: t.variant_b_sent,
      variantAOpens: t.variant_a_opens,
      variantBOpens: t.variant_b_opens,
      variantAReplies: t.variant_a_replies,
      variantBReplies: t.variant_b_replies,
      variantAOpenRate: t.variant_a_sent > 0 ? ((t.variant_a_opens / t.variant_a_sent) * 100).toFixed(1) : 0,
      variantBOpenRate: t.variant_b_sent > 0 ? ((t.variant_b_opens / t.variant_b_sent) * 100).toFixed(1) : 0,
      variantAReplyRate: t.variant_a_sent > 0 ? ((t.variant_a_replies / t.variant_a_sent) * 100).toFixed(1) : 0,
      variantBReplyRate: t.variant_b_sent > 0 ? ((t.variant_b_replies / t.variant_b_sent) * 100).toFixed(1) : 0,
      winner: t.winner,
      startedAt: t.started_at,
      endedAt: t.ended_at
    })));
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
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
      `SELECT ab.*, c.name as campaign_name,
       ta.name as variant_a_name, ta.subject as variant_a_subject,
       tb.name as variant_b_name, tb.subject as variant_b_subject
       FROM ab_tests ab
       LEFT JOIN campaigns c ON ab.campaign_id = c.id
       LEFT JOIN email_templates ta ON ab.variant_a_template_id = ta.id
       LEFT JOIN email_templates tb ON ab.variant_b_template_id = tb.id
       WHERE ab.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'A/B Test not found' });
    }

    const t = result.rows[0];
    res.json({
      id: t.id,
      campaignId: t.campaign_id,
      campaignName: t.campaign_name,
      name: t.name,
      status: t.status,
      variantA: {
        templateId: t.variant_a_template_id,
        name: t.variant_a_name,
        subject: t.variant_a_subject,
        sent: t.variant_a_sent,
        opens: t.variant_a_opens,
        replies: t.variant_a_replies,
        openRate: t.variant_a_sent > 0 ? ((t.variant_a_opens / t.variant_a_sent) * 100).toFixed(1) : 0,
        replyRate: t.variant_a_sent > 0 ? ((t.variant_a_replies / t.variant_a_sent) * 100).toFixed(1) : 0
      },
      variantB: {
        templateId: t.variant_b_template_id,
        name: t.variant_b_name,
        subject: t.variant_b_subject,
        sent: t.variant_b_sent,
        opens: t.variant_b_opens,
        replies: t.variant_b_replies,
        openRate: t.variant_b_sent > 0 ? ((t.variant_b_opens / t.variant_b_sent) * 100).toFixed(1) : 0,
        replyRate: t.variant_b_sent > 0 ? ((t.variant_b_replies / t.variant_b_sent) * 100).toFixed(1) : 0
      },
      winner: t.winner,
      startedAt: t.started_at,
      endedAt: t.ended_at
    });
  } catch (error) {
    console.error('Error fetching A/B test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { campaignId, name, variantATemplateId, variantBTemplateId } = req.body;
    const result = await pool.query(
      `INSERT INTO ab_tests (campaign_id, name, variant_a_template_id, variant_b_template_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [campaignId, name, variantATemplateId, variantBTemplateId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating A/B test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    // Determine winner based on reply rate
    const testResult = await pool.query(
      'SELECT * FROM ab_tests WHERE id = $1',
      [req.params.id]
    );

    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'A/B Test not found' });
    }

    const test = testResult.rows[0];
    const aRate = test.variant_a_sent > 0 ? test.variant_a_replies / test.variant_a_sent : 0;
    const bRate = test.variant_b_sent > 0 ? test.variant_b_replies / test.variant_b_sent : 0;
    const winner = aRate >= bRate ? 'A' : 'B';

    const result = await pool.query(
      `UPDATE ab_tests SET
       status = 'completed',
       winner = $1,
       ended_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [winner, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error completing A/B test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ab_tests WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting A/B test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
