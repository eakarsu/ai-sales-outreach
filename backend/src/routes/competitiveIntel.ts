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

// POST /api/ai/competitive-intel/analyze
router.post('/analyze', async (req, res) => {
  try {
    const { teamId, userId, companyName, industry, ourProduct, targetCompetitors } = req.body;
    if (!teamId || !industry) {
      return res.status(400).json({ error: 'teamId and industry are required' });
    }

    const systemPrompt = `You are a competitive intelligence analyst specializing in B2B SaaS markets.
You analyze competitive landscapes, identify differentiation opportunities, and create battle cards for sales teams.
Your analysis helps reps win deals against specific competitors.

Respond with ONLY valid JSON.`;

    const userPrompt = `Perform competitive intelligence analysis:

Our Product: ${ourProduct || 'AI-powered sales outreach platform'}
Target Industry: ${industry}
Company Context: ${companyName || 'Our Company'}
Known Competitors: ${targetCompetitors?.join(', ') || 'Major players in the space'}

Analyze the competitive landscape and provide:
1. Top 3-5 competitor profiles with their key selling points and weaknesses
2. Our differentiation angles against each competitor
3. Common objections when prospects mention competitors and how to handle them
4. Positioning tips by buyer persona

Respond ONLY with JSON:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"],
      "typicalCustomer": "Who they serve best",
      "pricing": "Pricing model description",
      "ourAdvantage": "Why we win against them"
    }
  ],
  "differentiators": ["Key differentiator 1", "Key differentiator 2"],
  "battleCards": {
    "CompetitorName": {
      "whenTheyMention": "Prospect says they're considering Competitor",
      "ourResponse": "Specific response template",
      "proofPoints": ["Case study or metric 1", "Proof point 2"]
    }
  },
  "positioningByPersona": {
    "VP of Sales": "How to position for VP of Sales prospects",
    "SDR Manager": "How to position for SDR Manager prospects"
  },
  "marketTrends": ["Trend 1 affecting competitive dynamics", "Trend 2"],
  "aiConfidence": 82.5
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
      `INSERT INTO ai_competitive_intel (team_id, company_name, industry, competitors, differentiators, objection_responses, positioning_tips, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [teamId, companyName, industry, JSON.stringify(aiResult.competitors || []),
       aiResult.differentiators || [], JSON.stringify(aiResult.battleCards || {}),
       aiResult.positioningByPersona ? Object.values(aiResult.positioningByPersona) : [],
       aiResult.aiConfidence || 80]
    );

    await pool.query(
      `INSERT INTO ai_results (team_id, user_id, feature, result, tokens_used, model)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId, userId || null, 'competitive_intel', JSON.stringify(aiResult), tokensUsed, 'anthropic/claude-3-5-sonnet-20241022']
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
    console.error('Error analyzing competitive intel:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/ai/competitive-intel — list saved analyses
router.get('/', async (req, res) => {
  try {
    const { teamId, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [result, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM ai_competitive_intel WHERE team_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [teamId, limitNum, offset]
      ),
      pool.query('SELECT COUNT(*) FROM ai_competitive_intel WHERE team_id = $1', [teamId]),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      analyses: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching competitive intel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
