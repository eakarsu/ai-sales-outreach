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

// POST /api/ai/playbook/generate — generate playbook from team's performance data
router.post('/generate', async (req, res) => {
  try {
    const { teamId, userId } = req.body;
    if (!teamId) return res.status(400).json({ error: 'teamId is required' });

    // Gather performance data
    const [topTemplates, campaignPerf, leadScores] = await Promise.all([
      pool.query(
        `SELECT name, subject, open_rate, reply_rate, usage_count, category
         FROM email_templates WHERE team_id = $1 AND usage_count > 0
         ORDER BY reply_rate DESC LIMIT 10`,
        [teamId]
      ),
      pool.query(
        `SELECT type, AVG(CASE WHEN emails_sent > 0 THEN emails_opened::float/emails_sent ELSE 0 END) as avg_open_rate,
                AVG(CASE WHEN emails_sent > 0 THEN replies_received::float/emails_sent ELSE 0 END) as avg_reply_rate,
                COUNT(*) as campaign_count
         FROM campaigns WHERE team_id = $1 AND emails_sent > 0
         GROUP BY type`,
        [teamId]
      ),
      pool.query(
        `SELECT AVG(score) as avg_score, AVG(confidence) as avg_confidence,
                COUNT(*) as total_scored
         FROM ai_lead_scores WHERE team_id = $1`,
        [teamId]
      ),
    ]);

    const systemPrompt = `You are a sales excellence coach who creates data-driven sales playbooks.
You analyze performance data to identify what's working, what patterns drive success, and what reps should do more of.
Your playbooks are specific, actionable, and backed by data.

Respond with ONLY valid JSON.`;

    const userPrompt = `Create a sales playbook based on this team's actual performance data:

=== TOP PERFORMING TEMPLATES ===
${JSON.stringify(topTemplates.rows, null, 2)}

=== CAMPAIGN PERFORMANCE BY TYPE ===
${JSON.stringify(campaignPerf.rows, null, 2)}

=== LEAD SCORING SUMMARY ===
${JSON.stringify(leadScores.rows[0], null, 2)}

Generate a comprehensive sales playbook that:
1. Identifies the top 3-5 winning patterns from this data
2. Recommends specific actions to replicate success
3. Suggests sequence templates based on what's working
4. Provides coaching tips for the team

Respond ONLY with JSON:
{
  "name": "Q2 2026 Sales Playbook",
  "insights": [
    {
      "finding": "Specific data-backed finding",
      "impact": "What this means for revenue",
      "action": "Specific recommended action",
      "priority": "high" | "medium" | "low"
    }
  ],
  "topPatterns": [
    {
      "pattern": "Pattern description",
      "evidenceScore": 85,
      "recommendation": "How to replicate this pattern"
    }
  ],
  "recommendedSequences": [
    {
      "name": "Sequence name",
      "trigger": "When to use this sequence",
      "steps": [
        {"step": 1, "delay": "Day 1", "action": "Send cold outreach email", "template": "Subject line pattern to use"},
        {"step": 2, "delay": "Day 3", "action": "LinkedIn connection", "template": null},
        {"step": 3, "delay": "Day 7", "action": "Follow-up email", "template": "Follow-up subject pattern"}
      ]
    }
  ],
  "coachingTips": ["Tip 1 for the team", "Tip 2"],
  "kpisToTrack": ["KPI 1", "KPI 2"],
  "successPredictors": ["What strongly correlates with closed deals"]
}`;

    const { content, tokensUsed } = await callOpenRouter(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { model: 'anthropic/claude-3-5-sonnet-20241022', maxTokens: 2500 }
    );

    const aiResult = parseAIJson(content);
    if (!aiResult) {
      return res.status(422).json({ error: 'Failed to parse AI response' });
    }

    const result = await pool.query(
      `INSERT INTO ai_playbooks (team_id, name, insights, top_patterns, recommended_sequences)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [teamId, aiResult.name || 'Sales Playbook',
       JSON.stringify(aiResult.insights || []),
       JSON.stringify(aiResult.topPatterns || []),
       JSON.stringify(aiResult.recommendedSequences || [])]
    );

    await pool.query(
      `INSERT INTO ai_results (team_id, user_id, feature, result, tokens_used, model)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId, userId || null, 'playbook_generation', JSON.stringify(aiResult), tokensUsed, 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});

    res.status(201).json({
      id: result.rows[0].id,
      ...aiResult,
      savedAt: result.rows[0].created_at,
      tokensUsed,
    });
  } catch (error: any) {
    if (error instanceof OpenRouterTimeoutError) {
      return res.status(503).json({ error: 'AI service timeout' });
    }
    console.error('Error generating playbook:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/ai/playbook — list playbooks
router.get('/', async (req, res) => {
  try {
    const { teamId, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [result, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM ai_playbooks WHERE team_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [teamId, limitNum, offset]
      ),
      pool.query('SELECT COUNT(*) FROM ai_playbooks WHERE team_id = $1', [teamId]),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      playbooks: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching playbooks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/playbook/insights — quick AI insights without saving a full playbook
router.get('/insights', async (req, res) => {
  try {
    const { teamId } = req.query;
    const result = await pool.query(
      `SELECT insights, top_patterns, coaching_tips_text, created_at
       FROM ai_playbooks WHERE team_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [teamId]
    );
    if (result.rows.length === 0) {
      return res.json({ insights: [], topPatterns: [], message: 'No playbook generated yet. Run /generate first.' });
    }
    const row = result.rows[0];
    res.json({
      insights: row.insights || [],
      topPatterns: row.top_patterns || [],
      generatedAt: row.created_at,
    });
  } catch (error) {
    console.error('Error fetching playbook insights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
