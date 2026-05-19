import { Router } from 'express';
import { pool } from '../config/database';
import {
  callOpenRouter,
  OpenRouterTimeoutError,
} from '../services/openrouter';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function parseAIJson(text: string): any {
  try { return JSON.parse(text); } catch(e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch(e) {}
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) { try { return JSON.parse(text.slice(start, end + 1)); } catch(e) {} }
  return null;
}

// GET /api/contacts/:id/momentum
router.get('/:id/momentum', async (req, res) => {
  try {
    const { id } = req.params;

    const contactResult = await pool.query(
      `SELECT c.*,
        (SELECT MAX(sent_at) FROM emails_sent WHERE contact_id = c.id) as last_email_sent,
        (SELECT MAX(opened_at) FROM emails_sent WHERE contact_id = c.id AND opened_at IS NOT NULL) as last_opened,
        (SELECT MAX(replied_at) FROM emails_sent WHERE contact_id = c.id AND replied_at IS NOT NULL) as last_replied,
        (SELECT COUNT(*) FROM emails_sent WHERE contact_id = c.id) as total_emails,
        (SELECT COUNT(*) FROM emails_sent WHERE contact_id = c.id AND opened_at IS NOT NULL) as opened_count,
        (SELECT COUNT(*) FROM emails_sent WHERE contact_id = c.id AND replied_at IS NOT NULL) as reply_count
       FROM contacts c WHERE c.id = $1`,
      [id]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const c = contactResult.rows[0];
    const now = new Date();
    const daysSinceLastEmail = c.last_email_sent
      ? Math.floor((now.getTime() - new Date(c.last_email_sent).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const totalEmails = parseInt(c.total_emails) || 0;
    const openedCount = parseInt(c.opened_count) || 0;
    const replyCount = parseInt(c.reply_count) || 0;
    const openRate = totalEmails > 0 ? openedCount / totalEmails : 0;
    const replyRate = totalEmails > 0 ? replyCount / totalEmails : 0;

    const systemPrompt = `You are an elite sales momentum analyst with expertise in B2B sales cycles, buyer psychology, and revenue forecasting.

Your momentum assessments combine:
- Engagement velocity (recency + frequency of interactions)
- Response pattern analysis (open rates, reply rates, timing)
- Lead qualification signals (job title, company, industry fit)
- Buying stage inference based on behavioral data
- Time-decay weighting for older engagement signals

Always respond with ONLY valid JSON — no markdown, no extra text.`;

    const userPrompt = `Analyze the deal momentum for this sales prospect:

=== CONTACT ===
Name: ${c.first_name} ${c.last_name}
Company: ${c.company || 'Unknown'}
Job Title: ${c.job_title || 'Unknown'}
Industry: ${c.industry || 'Unknown'}
Lead Score: ${c.lead_score || 'Unscored'}
Status: ${c.status || 'new'}

=== ENGAGEMENT DATA ===
Total emails sent: ${totalEmails}
Emails opened: ${openedCount} (${Math.round(openRate * 100)}% open rate)
Replies received: ${replyCount} (${Math.round(replyRate * 100)}% reply rate)
Days since last email: ${daysSinceLastEmail ?? 'No contact yet'}
Last email opened: ${c.last_opened ? new Date(c.last_opened).toDateString() : 'Never'}
Last replied: ${c.last_replied ? new Date(c.last_replied).toDateString() : 'Never'}

Score momentum 0-100 (100 = deal closing imminently, 0 = dead/lost).
Trend: "rising" (momentum increasing), "falling" (losing interest), or "stalled" (no change).

Respond ONLY with JSON:
{
  "score": 65,
  "trend": "rising",
  "daysToClose": 21,
  "reasoning": "2-3 sentence analysis of momentum and buying signals observed...",
  "nextAction": "Specific, concrete sales action the rep should take right now",
  "urgency": "high" | "medium" | "low",
  "dealHealthFactors": ["Factor 1", "Factor 2"],
  "warningSignals": ["Warning 1"]
}`;

    try {
      const { content, tokensUsed } = await callOpenRouter(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { model: 'anthropic/claude-3-5-sonnet-20241022', maxTokens: 600 }
      );

      const aiResult = parseAIJson(content) || buildFallbackMomentum(openRate, replyRate, daysSinceLastEmail);

      // Persist to deal_momentum table
      await pool.query(
        `INSERT INTO deal_momentum
          (team_id, contact_id, score, trend, days_to_close, reasoning, next_action,
           open_rate_percent, reply_rate_percent, days_since_last_email, total_emails, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
         ON CONFLICT (contact_id) DO UPDATE SET
           score = EXCLUDED.score,
           trend = EXCLUDED.trend,
           days_to_close = EXCLUDED.days_to_close,
           reasoning = EXCLUDED.reasoning,
           next_action = EXCLUDED.next_action,
           open_rate_percent = EXCLUDED.open_rate_percent,
           reply_rate_percent = EXCLUDED.reply_rate_percent,
           days_since_last_email = EXCLUDED.days_since_last_email,
           total_emails = EXCLUDED.total_emails,
           updated_at = CURRENT_TIMESTAMP`,
        [
          c.team_id, id, aiResult.score, aiResult.trend, aiResult.daysToClose,
          aiResult.reasoning, aiResult.nextAction,
          Math.round(openRate * 100), Math.round(replyRate * 100),
          daysSinceLastEmail, totalEmails
        ]
      ).catch(() => {}); // Non-blocking — table may not have UNIQUE yet

      // Also persist to ai_results for audit trail
      await pool.query(
        `INSERT INTO ai_results (team_id, feature, result, tokens_used, model)
         VALUES ($1, $2, $3, $4, $5)`,
        [c.team_id, 'deal_momentum', JSON.stringify(aiResult), tokensUsed, 'anthropic/claude-3-5-sonnet-20241022']
      ).catch(() => {});

      res.json({
        contactId: id,
        contactName: `${c.first_name} ${c.last_name}`,
        company: c.company,
        score: aiResult.score,
        trend: aiResult.trend,
        daysToClose: aiResult.daysToClose,
        reasoning: aiResult.reasoning,
        nextAction: aiResult.nextAction,
        urgency: aiResult.urgency || 'medium',
        dealHealthFactors: aiResult.dealHealthFactors || [],
        warningSignals: aiResult.warningSignals || [],
        metrics: {
          daysSinceLastEmail,
          openRatePercent: Math.round(openRate * 100),
          replyRatePercent: Math.round(replyRate * 100),
          totalEmails,
        },
      });
    } catch (err) {
      if (err instanceof OpenRouterTimeoutError) {
        const fallback = buildFallbackMomentum(openRate, replyRate, daysSinceLastEmail);
        return res.status(503).json({ success: false, error: 'AI service timeout', fallback: true, ...fallback });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error computing deal momentum:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/contacts/momentum/all?teamId=xxx — list all stored momentum scores
router.get('/momentum/all', async (req, res) => {
  try {
    const { teamId, page = 1, limit = 20 } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await pool.query(
      `SELECT dm.*, c.first_name, c.last_name, c.company
       FROM deal_momentum dm
       LEFT JOIN contacts c ON c.id = dm.contact_id
       WHERE dm.team_id = $1
       ORDER BY dm.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [teamId, parseInt(limit), offset]
    );
    const countResult = await pool.query('SELECT COUNT(*) FROM deal_momentum WHERE team_id = $1', [teamId]);
    const total = parseInt(countResult.rows[0].count);
    res.json({
      momentum: result.rows.map(r => ({
        id: r.id,
        contactId: r.contact_id,
        contactName: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        company: r.company || '',
        currentMomentum: r.trend === 'rising' ? 'accelerating' : r.trend === 'stalled' ? 'stalled' : 'cooling',
        momentumScore: r.score || 0,
        emailVelocity: r.total_emails > 0 ? parseFloat((r.total_emails / 7).toFixed(1)) : 0,
        replyLag: r.days_since_last_email || 0,
        closeProbability: Math.min(95, Math.max(5, r.score || 0)),
        predictedCloseDate: r.days_to_close
          ? new Date(Date.now() + r.days_to_close * 24 * 60 * 60 * 1000).toISOString()
          : null,
        alerts: r.warning_signals || [],
        recommendations: r.next_action ? [r.next_action] : [],
        createdAt: r.updated_at,
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error fetching momentum scores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/contacts/momentum/calculate — trigger momentum calculation for a contact
router.post('/momentum/calculate', async (req, res) => {
  try {
    const { contactId, teamId } = req.body;
    if (!contactId) return res.status(400).json({ error: 'contactId is required' });
    // Delegate to the /:id/momentum logic by making an internal query
    const contactResult = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM emails_sent WHERE contact_id = c.id) as total_emails,
        (SELECT COUNT(*) FROM emails_sent WHERE contact_id = c.id AND opened_at IS NOT NULL) as opened_count,
        (SELECT COUNT(*) FROM emails_sent WHERE contact_id = c.id AND replied_at IS NOT NULL) as reply_count,
        (SELECT MAX(sent_at) FROM emails_sent WHERE contact_id = c.id) as last_email_sent
       FROM contacts c WHERE c.id = $1`,
      [contactId]
    );
    if (contactResult.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    const c = contactResult.rows[0];
    const now = new Date();
    const daysSinceLastEmail = c.last_email_sent
      ? Math.floor((now.getTime() - new Date(c.last_email_sent).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const totalEmails = parseInt(c.total_emails) || 0;
    const openedCount = parseInt(c.opened_count) || 0;
    const replyCount = parseInt(c.reply_count) || 0;
    const openRate = totalEmails > 0 ? openedCount / totalEmails : 0;
    const replyRate = totalEmails > 0 ? replyCount / totalEmails : 0;
    const fallback = buildFallbackMomentum(openRate, replyRate, daysSinceLastEmail);
    await pool.query(
      `INSERT INTO deal_momentum
        (team_id, contact_id, score, trend, days_to_close, reasoning, next_action,
         open_rate_percent, reply_rate_percent, days_since_last_email, total_emails, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
       ON CONFLICT (contact_id) DO UPDATE SET
         score = EXCLUDED.score, trend = EXCLUDED.trend, updated_at = CURRENT_TIMESTAMP`,
      [
        teamId || c.team_id, contactId, fallback.score, fallback.trend, fallback.daysToClose,
        fallback.reasoning, fallback.nextAction,
        Math.round(openRate * 100), Math.round(replyRate * 100), daysSinceLastEmail, totalEmails,
      ]
    ).catch(() => {});
    res.json({ success: true, contactId, score: fallback.score, trend: fallback.trend });
  } catch (error) {
    console.error('Error calculating momentum:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/contacts/momentum/:id
router.delete('/momentum/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM deal_momentum WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting momentum:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add UNIQUE constraint attempt for deal_momentum (best-effort migration)
pool.query(`
  DO $$ BEGIN
    ALTER TABLE deal_momentum ADD CONSTRAINT deal_momentum_contact_id_unique UNIQUE (contact_id);
  EXCEPTION WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
  END $$;
`).catch(() => {});

function buildFallbackMomentum(openRate: number, replyRate: number, daysSinceLastEmail: number | null) {
  return {
    score: Math.min(100, Math.round(openRate * 50 + replyRate * 50)),
    trend: daysSinceLastEmail && daysSinceLastEmail > 14 ? 'stalled' : replyRate > 0.2 ? 'rising' : 'falling',
    daysToClose: null,
    reasoning: `Based on a ${Math.round(openRate * 100)}% open rate and ${Math.round(replyRate * 100)}% reply rate, this contact shows ${replyRate > 0.2 ? 'positive' : 'limited'} engagement signals.`,
    nextAction: replyRate > 0 ? 'Schedule a follow-up call to capitalize on their prior reply.' : 'Send a value-add email with a specific resource relevant to their industry.',
    urgency: replyRate > 0.3 ? 'high' : replyRate > 0.1 ? 'medium' : 'low',
    dealHealthFactors: [],
    warningSignals: daysSinceLastEmail && daysSinceLastEmail > 21 ? ['Over 3 weeks since last contact'] : [],
  };
}

export default router;
