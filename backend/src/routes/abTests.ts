import { Router } from 'express';
import { pool } from '../config/database';
import {
  callOpenRouter,
  OpenRouterTimeoutError,
  generateEmailPrompt,
} from '../services/openrouter';
import { emailGenerationLimiter } from '../middleware/rateLimiter';

import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { teamId, status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = `SELECT ab.*, c.name as campaign_name,
                 ta.name as variant_a_name, tb.name as variant_b_name
                 FROM ab_tests ab
                 LEFT JOIN campaigns c ON ab.campaign_id = c.id
                 LEFT JOIN email_templates ta ON ab.variant_a_template_id = ta.id
                 LEFT JOIN email_templates tb ON ab.variant_b_template_id = tb.id
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM ab_tests ab LEFT JOIN campaigns c ON ab.campaign_id = c.id WHERE 1=1`;
    const params: any[] = [];
    const countParams: any[] = [];
    let paramIndex = 1;
    let countParamIndex = 1;

    if (teamId) {
      query += ` AND c.team_id = $${paramIndex++}`;
      countQuery += ` AND c.team_id = $${countParamIndex++}`;
      params.push(teamId);
      countParams.push(teamId);
    }

    if (status) {
      query += ` AND ab.status = $${paramIndex++}`;
      countQuery += ` AND ab.status = $${countParamIndex++}`;
      params.push(status);
      countParams.push(status);
    }

    query += ` ORDER BY ab.started_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      abTests: result.rows.map(t => ({
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
    })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
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

// Helper to parse JSON from AI response
const parseAIResponse = (content: string): any => {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(content);
  } catch {
    throw new Error('Failed to parse AI response');
  }
};

// POST /api/ab-tests/generate — AI A/B test runner: generates 2 variants and stores them
router.post('/generate', emailGenerationLimiter, async (req, res) => {
  try {
    const { teamId, userId, campaignName, context } = req.body;

    if (!teamId || !context) {
      return res.status(400).json({ error: 'teamId and context are required' });
    }

    // Control: professional tone
    const controlMessages = generateEmailPrompt('cold_outreach', { ...context, style: 'professional' });
    let controlRes: { content: string; tokensUsed: number };
    try {
      controlRes = await callOpenRouter(controlMessages);
    } catch (err) {
      if (err instanceof OpenRouterTimeoutError) {
        return res.status(503).json({ success: false, error: 'AI service timeout', fallback: true });
      }
      throw err;
    }
    const controlEmail = parseAIResponse(controlRes.content);

    // Treatment: conversational tone
    const treatmentMessages = generateEmailPrompt('cold_outreach', { ...context, style: 'conversational' });
    let treatmentRes: { content: string; tokensUsed: number };
    try {
      treatmentRes = await callOpenRouter(treatmentMessages);
    } catch (err) {
      if (err instanceof OpenRouterTimeoutError) {
        return res.status(503).json({ success: false, error: 'AI service timeout', fallback: true });
      }
      throw err;
    }
    const treatmentEmail = parseAIResponse(treatmentRes.content);

    // Persist test + both variants to DB
    let testId: string | null = null;
    try {
      const insertResult = await pool.query(
        `INSERT INTO ab_tests (team_id, user_id, campaign_name, status)
         VALUES ($1, $2, $3, 'running')
         RETURNING id`,
        [teamId, userId, campaignName || 'Untitled A/B Test']
      );
      testId = insertResult.rows[0].id;

      await pool.query(
        `INSERT INTO ab_test_variants (test_id, test_group, subject, body)
         VALUES ($1, 'control', $2, $3), ($1, 'treatment', $4, $5)`,
        [testId, controlEmail.subject, controlEmail.body, treatmentEmail.subject, treatmentEmail.body]
      );
    } catch { /* tables may not yet exist */ }

    res.json({
      success: true,
      testId,
      control: { testGroup: 'control', subject: controlEmail.subject, body: controlEmail.body },
      treatment: { testGroup: 'treatment', subject: treatmentEmail.subject, body: treatmentEmail.body },
      tokensUsed: controlRes.tokensUsed + treatmentRes.tokensUsed,
    });
  } catch (error: any) {
    console.error('Error creating A/B test:', error);
    res.status(500).json({ error: error.message || 'Failed to create A/B test' });
  }
});

// GET /api/ab-tests/:id/results — calculate open/reply rates and declare winner via z-test
router.get('/:id/results', async (req, res) => {
  try {
    const { id } = req.params;

    const variantResult = await pool.query(
      `SELECT v.*, t.campaign_name,
        COUNT(es.id) as emails_sent,
        COUNT(es.opened_at) as opens,
        COUNT(es.replied_at) as replies
       FROM ab_test_variants v
       LEFT JOIN ab_tests t ON v.test_id = t.id
       LEFT JOIN emails_sent es ON es.ab_variant_id = v.id
       WHERE v.test_id = $1
       GROUP BY v.id, t.campaign_name`,
      [id]
    );

    if (variantResult.rows.length === 0) {
      return res.status(404).json({ error: 'A/B test not found or no variants' });
    }

    const variants = variantResult.rows.map(v => {
      const sent = parseInt(v.emails_sent) || 0;
      const opens = parseInt(v.opens) || 0;
      const replies = parseInt(v.replies) || 0;
      return {
        id: v.id,
        testGroup: v.test_group,
        subject: v.subject,
        emailsSent: sent,
        opens,
        replies,
        openRate: sent > 0 ? parseFloat((opens / sent * 100).toFixed(2)) : 0,
        replyRate: sent > 0 ? parseFloat((replies / sent * 100).toFixed(2)) : 0,
      };
    });

    // Two-proportion z-test at 95% CI
    let winner: string | null = null;
    if (variants.length >= 2) {
      const [a, b] = variants;
      const n1 = a.emailsSent;
      const n2 = b.emailsSent;
      const p1 = n1 > 0 ? a.opens / n1 : 0;
      const p2 = n2 > 0 ? b.opens / n2 : 0;

      if (n1 > 30 && n2 > 30) {
        const pPool = (a.opens + b.opens) / (n1 + n2);
        const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
        const z = se > 0 ? Math.abs(p1 - p2) / se : 0;
        winner = z > 1.96
          ? (p1 > p2 ? a.testGroup : b.testGroup)
          : 'inconclusive (need more data)';
      } else {
        winner = 'inconclusive (insufficient sample size, need >30 per group)';
      }
    }

    res.json({
      testId: id,
      campaignName: variantResult.rows[0].campaign_name,
      variants,
      winner,
      methodology: 'Two-proportion z-test at 95% confidence (z > 1.96)',
    });
  } catch (error) {
    console.error('Error fetching A/B test results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
