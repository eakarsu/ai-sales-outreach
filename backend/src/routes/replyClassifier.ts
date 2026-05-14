import { Router } from 'express';
import { pool } from '../config/database';
import { callOpenRouter, OpenRouterTimeoutError } from '../services/openrouter';
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

// POST /api/ai/classify-reply — classify an email reply and draft response
router.post('/', async (req, res) => {
  try {
    const { teamId, userId, contactId, emailId, replyText, contactContext } = req.body;
    if (!teamId || !replyText) {
      return res.status(400).json({ error: 'teamId and replyText are required' });
    }

    const systemPrompt = `You are an elite sales AI that analyzes email replies to classify intent and draft follow-up responses.

Classification categories:
- "interested": Shows buying intent, asks for more info, or wants to meet
- "not_interested": Explicit rejection or opt-out
- "referral": Redirects to another person/department
- "unsubscribe_request": Wants to be removed from outreach
- "auto_reply": Out-of-office or automated response
- "needs_more_info": Asking questions before committing
- "timing_issue": Interested but timing isn't right ("check back in Q3")
- "negotiating": Engaged in price/terms discussion
- "stalled": No clear direction, non-committal

For interested/needs_more_info/timing_issue classifications, always draft a response.

Respond with ONLY valid JSON.`;

    const userPrompt = `Classify this email reply and draft an appropriate response:

=== REPLY TEXT ===
"${replyText}"

=== CONTACT CONTEXT ===
${contactContext ? JSON.stringify(contactContext, null, 2) : 'No additional context provided'}

Respond ONLY with JSON:
{
  "classification": "interested",
  "confidence": 92,
  "sentiment": "positive" | "neutral" | "negative",
  "urgency": "high" | "medium" | "low",
  "keyInsights": ["What this reply reveals about the prospect's situation"],
  "draftResponse": "Complete, ready-to-send follow-up email response (null if not_interested/unsubscribe/auto_reply)",
  "draftSubject": "Re: [Original Subject]",
  "nextActions": [
    "Primary recommended action",
    "Secondary action"
  ],
  "dealSignals": {
    "budgetMentioned": false,
    "timelineExpressed": false,
    "competitorMentioned": false,
    "painPointRevealed": true
  },
  "followUpTiming": "Recommended timing for next follow-up (e.g., '2 business days', 'Q3 2026')"
}`;

    const { content, tokensUsed } = await callOpenRouter(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { model: 'anthropic/claude-3-5-sonnet-20241022', maxTokens: 1200 }
    );

    const aiResult = parseAIJson(content);
    if (!aiResult) {
      return res.status(422).json({ error: 'Failed to parse AI response' });
    }

    // Persist the classification
    const insertResult = await pool.query(
      `INSERT INTO reply_classifications
        (team_id, contact_id, email_id, classification, sentiment, draft_response, confidence, raw_reply)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [teamId, contactId || null, emailId || null, aiResult.classification,
       aiResult.sentiment, aiResult.draftResponse || null, aiResult.confidence, replyText]
    );

    await pool.query(
      `INSERT INTO ai_results (team_id, user_id, feature, result, tokens_used, model)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId, userId || null, 'reply_classification', JSON.stringify(aiResult), tokensUsed, 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});

    res.status(201).json({
      id: insertResult.rows[0].id,
      ...aiResult,
      tokensUsed,
    });
  } catch (error: any) {
    if (error instanceof OpenRouterTimeoutError) {
      return res.status(503).json({ error: 'AI service timeout' });
    }
    console.error('Error classifying reply:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/ai/classify-reply — get classifications for team
router.get('/', async (req, res) => {
  try {
    const { teamId, contactId, classification, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = `SELECT rc.*, c.first_name, c.last_name, c.company
                 FROM reply_classifications rc
                 LEFT JOIN contacts c ON rc.contact_id = c.id
                 WHERE rc.team_id = $1`;
    const params: any[] = [teamId];
    let paramIndex = 2;

    if (contactId) { query += ` AND rc.contact_id = $${paramIndex++}`; params.push(contactId); }
    if (classification) { query += ` AND rc.classification = $${paramIndex++}`; params.push(classification); }

    query += ` ORDER BY rc.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query('SELECT COUNT(*) FROM reply_classifications WHERE team_id = $1', [teamId]),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      classifications: result.rows.map(r => ({
        ...r,
        contactName: r.first_name ? `${r.first_name} ${r.last_name}` : null,
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching reply classifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ai/classify-reply/:id/action — mark a classification as actioned
router.post('/:id/action', async (req, res) => {
  try {
    await pool.query(
      'UPDATE reply_classifications SET actioned = true WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error actioning classification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
