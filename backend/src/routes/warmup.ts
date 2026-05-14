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

// POST /api/ai/warmup/create — create an AI-powered warmup schedule
router.post('/create', async (req, res) => {
  try {
    const { teamId, userId, emailAddress, name, totalDays = 30 } = req.body;
    if (!teamId || !emailAddress) {
      return res.status(400).json({ error: 'teamId and emailAddress are required' });
    }

    const systemPrompt = `You are an email deliverability expert specializing in domain warm-up strategies.
Your warm-up schedules are based on industry best practices:
- Start slow (5-10 emails/day) and ramp up gradually
- Never jump volume by more than 50% day-over-day
- Include diversity in subject lines and content to avoid spam triggers
- Recommend optimal sending times per day
- Flag days for extra monitoring

Respond with ONLY valid JSON.`;

    const userPrompt = `Create a ${totalDays}-day email warm-up schedule for:
Email: ${emailAddress}

Generate a daily volume curve that:
1. Starts at 5 emails/day
2. Gradually ramps to ~200 emails/day by day ${totalDays}
3. Uses fibonacci-like progression to avoid spam triggers

Respond ONLY with JSON:
{
  "dailySchedule": [
    {"day": 1, "volume": 5, "focus": "High-engagement contacts only", "sendWindow": "9:00-11:00"},
    {"day": 2, "volume": 8, "focus": "Warm contacts", "sendWindow": "9:00-11:00"}
  ],
  "recommendations": [
    "Only send to highly engaged contacts in week 1",
    "Monitor bounce rate daily — pause if >2%"
  ],
  "milestones": [
    {"day": 7, "target": 30, "check": "Review spam complaint rate"},
    {"day": 14, "target": 80, "check": "Check domain reputation score"}
  ],
  "estimatedMaxVolume": 200,
  "riskFactors": ["New domain has no sending history", "Start with clean lists only"]
}`;

    const { content, tokensUsed } = await callOpenRouter(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { model: 'anthropic/claude-3-5-sonnet-20241022', maxTokens: 2000 }
    );

    const aiResult = parseAIJson(content) || {
      dailySchedule: Array.from({ length: totalDays }, (_, i) => ({
        day: i + 1,
        volume: Math.min(200, Math.floor(5 * Math.pow(1.1, i))),
        focus: i < 7 ? 'High-engagement only' : 'Warm contacts',
        sendWindow: '9:00-11:00'
      })),
      recommendations: ['Start with your most engaged contacts', 'Monitor bounce rates daily'],
      milestones: [{ day: 7, target: 30, check: 'Review spam rates' }],
      estimatedMaxVolume: 200,
      riskFactors: [],
    };

    const result = await pool.query(
      `INSERT INTO warmup_schedules (team_id, name, email_address, total_days, daily_limit, ai_curve, ai_recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [teamId, name || `Warmup for ${emailAddress}`, emailAddress, totalDays,
       aiResult.dailySchedule?.[0]?.volume || 5,
       JSON.stringify(aiResult.dailySchedule || []),
       aiResult.recommendations || []]
    );

    await pool.query(
      `INSERT INTO ai_results (team_id, user_id, feature, result, tokens_used, model)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId, userId || null, 'warmup_schedule', JSON.stringify(aiResult), tokensUsed, 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});

    res.status(201).json({
      id: result.rows[0].id,
      ...result.rows[0],
      aiSchedule: aiResult,
      tokensUsed,
    });
  } catch (error: any) {
    if (error instanceof OpenRouterTimeoutError) {
      return res.status(503).json({ error: 'AI service timeout' });
    }
    console.error('Error creating warmup schedule:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/ai/warmup — list warmup schedules for team
router.get('/', async (req, res) => {
  try {
    const { teamId, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [result, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM warmup_schedules WHERE team_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [teamId, limitNum, offset]
      ),
      pool.query('SELECT COUNT(*) FROM warmup_schedules WHERE team_id = $1', [teamId]),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      warmupSchedules: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching warmup schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/warmup/:id — get specific warmup schedule
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM warmup_schedules WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching warmup schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ai/warmup/:id/advance — advance to next day
router.post('/:id/advance', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE warmup_schedules
       SET current_day = current_day + 1,
           status = CASE WHEN current_day + 1 >= total_days THEN 'completed' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error advancing warmup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
