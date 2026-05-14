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

const DEAL_STAGES = ['prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

// GET /api/deals — list all deals with pipeline view
router.get('/', async (req, res) => {
  try {
    const { teamId, stage, ownerId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const SORT_COLS: Record<string, string> = {
      createdAt: 'd.created_at', value: 'd.value', stage: 'd.stage',
      closeDate: 'd.close_date', winProbability: 'd.win_probability',
    };
    const sortColumn = SORT_COLS[sortBy as string] || 'd.created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let query = `SELECT d.*, c.first_name as contact_first, c.last_name as contact_last, c.company,
                        u.first_name as owner_first, u.last_name as owner_last
                 FROM deals d
                 LEFT JOIN contacts c ON d.contact_id = c.id
                 LEFT JOIN users u ON d.owner_id = u.id
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM deals d WHERE 1=1`;
    const params: any[] = [];
    const countParams: any[] = [];
    let paramIndex = 1;
    let countParamIndex = 1;

    if (teamId) {
      query += ` AND d.team_id = $${paramIndex++}`;
      countQuery += ` AND d.team_id = $${countParamIndex++}`;
      params.push(teamId);
      countParams.push(teamId);
    }
    if (stage) {
      query += ` AND d.stage = $${paramIndex++}`;
      countQuery += ` AND d.stage = $${countParamIndex++}`;
      params.push(stage);
      countParams.push(stage);
    }
    if (ownerId) {
      query += ` AND d.owner_id = $${paramIndex++}`;
      countQuery += ` AND d.owner_id = $${countParamIndex++}`;
      params.push(ownerId);
      countParams.push(ownerId);
    }

    query += ` ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count);

    // Pipeline summary by stage
    const pipelineResult = await pool.query(
      `SELECT stage, COUNT(*) as count, SUM(value) as total_value, AVG(win_probability) as avg_probability
       FROM deals WHERE team_id = $1 AND stage NOT IN ('closed_won', 'closed_lost')
       GROUP BY stage`,
      [teamId]
    );

    res.json({
      deals: result.rows.map(d => ({
        id: d.id,
        title: d.title,
        value: parseFloat(d.value) || 0,
        stage: d.stage,
        probability: d.probability,
        winProbability: parseFloat(d.win_probability) || 0,
        aiWinProbability: d.ai_win_probability ? parseFloat(d.ai_win_probability) : null,
        closeDate: d.close_date,
        notes: d.notes,
        contact: d.contact_first ? { id: d.contact_id, name: `${d.contact_first} ${d.contact_last}`, company: d.company } : null,
        owner: d.owner_first ? { id: d.owner_id, name: `${d.owner_first} ${d.owner_last}` } : null,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      pipeline: pipelineResult.rows.map(p => ({
        stage: p.stage,
        count: parseInt(p.count),
        totalValue: parseFloat(p.total_value) || 0,
        avgProbability: parseFloat(p.avg_probability) || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/deals — create a deal
router.post('/', async (req, res) => {
  try {
    const { teamId, contactId, campaignId, ownerId, title, value, stage, probability, closeDate, notes } = req.body;
    if (!teamId || !title) return res.status(400).json({ error: 'teamId and title are required' });
    if (stage && !DEAL_STAGES.includes(stage)) {
      return res.status(400).json({ error: `stage must be one of: ${DEAL_STAGES.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO deals (team_id, contact_id, campaign_id, owner_id, title, value, stage, probability, close_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [teamId, contactId || null, campaignId || null, ownerId || null, title,
       value || 0, stage || 'prospecting', probability || 0, closeDate || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/deals/:id — update a deal
router.put('/:id', async (req, res) => {
  try {
    const { title, value, stage, probability, closeDate, notes, lostReason } = req.body;
    if (stage && !DEAL_STAGES.includes(stage)) {
      return res.status(400).json({ error: `stage must be one of: ${DEAL_STAGES.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE deals SET
         title = COALESCE($1, title),
         value = COALESCE($2, value),
         stage = COALESCE($3, stage),
         probability = COALESCE($4, probability),
         close_date = COALESCE($5, close_date),
         notes = COALESCE($6, notes),
         lost_reason = COALESCE($7, lost_reason),
         won_at = CASE WHEN $3 = 'closed_won' AND won_at IS NULL THEN CURRENT_TIMESTAMP ELSE won_at END,
         lost_at = CASE WHEN $3 = 'closed_lost' AND lost_at IS NULL THEN CURRENT_TIMESTAMP ELSE lost_at END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [title, value, stage, probability, closeDate, notes, lostReason, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/deals/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM deals WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/deals/:id/ai-score — get AI win probability for a deal
router.post('/:id/ai-score', async (req, res) => {
  try {
    const { teamId, userId } = req.body;

    const dealResult = await pool.query(
      `SELECT d.*, c.first_name, c.last_name, c.company, c.job_title, c.lead_score,
              c.industry, c.status as contact_status
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       WHERE d.id = $1`,
      [req.params.id]
    );

    if (dealResult.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    const deal = dealResult.rows[0];

    const systemPrompt = `You are a revenue intelligence AI that calculates deal win probabilities.
You combine engagement signals, deal characteristics, and industry patterns to predict outcomes.
Be realistic — average B2B win rates are 25-30%. Only score high (70%+) for very strong signals.

Respond with ONLY valid JSON.`;

    const userPrompt = `Calculate the win probability for this deal:

Deal: "${deal.title}"
Stage: ${deal.stage}
Value: $${deal.value?.toLocaleString() || 0}
Close Date: ${deal.close_date || 'Not set'}
Days in Stage: calculated from created_at

Contact: ${deal.first_name || ''} ${deal.last_name || ''} at ${deal.company || 'Unknown'}
Title: ${deal.job_title || 'Unknown'}
Industry: ${deal.industry || 'Unknown'}
Lead Score: ${deal.lead_score || 'Unscored'}

BANT Assessment:
- Budget: ${deal.value > 0 ? `Deal value set at $${deal.value}` : 'Not confirmed'}
- Authority: ${deal.job_title || 'Unknown role'}
- Need: ${deal.stage !== 'prospecting' ? 'Confirmed' : 'Unconfirmed'}
- Timeline: ${deal.close_date ? `Target ${deal.close_date}` : 'Not set'}

Respond ONLY with JSON:
{
  "winProbability": 42,
  "confidence": 75,
  "stageHealthScore": 68,
  "positiveFactors": ["Factor 1 increasing win chance", "Factor 2"],
  "riskFactors": ["Risk 1", "Risk 2"],
  "recommendedNextStep": "Specific next action to improve win probability",
  "predictedCloseDate": "2026-06-15",
  "dealSizeAssessment": "appropriately_sized" | "oversized" | "undersized",
  "analysis": "2-3 sentence deal analysis"
}`;

    const { content, tokensUsed } = await callOpenRouter(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { model: 'anthropic/claude-3-5-sonnet-20241022', maxTokens: 800 }
    );

    const aiResult = parseAIJson(content);
    if (!aiResult) return res.status(422).json({ error: 'Failed to parse AI response' });

    // Update deal with AI score
    await pool.query(
      'UPDATE deals SET ai_win_probability = $1, ai_analysis = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [aiResult.winProbability, aiResult.analysis, req.params.id]
    );

    await pool.query(
      `INSERT INTO ai_results (team_id, user_id, feature, result, tokens_used, model)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId || deal.team_id, userId || null, 'deal_win_probability', JSON.stringify(aiResult), tokensUsed, 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});

    res.json({ dealId: req.params.id, ...aiResult, tokensUsed });
  } catch (error: any) {
    if (error instanceof OpenRouterTimeoutError) return res.status(503).json({ error: 'AI service timeout' });
    console.error('Error scoring deal:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
