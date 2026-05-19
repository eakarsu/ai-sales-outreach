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

// POST /api/ai/prospect-research — research a contact/company
router.post('/', async (req, res) => {
  try {
    const { teamId, userId, contactId } = req.body;
    if (!teamId || !contactId) {
      return res.status(400).json({ error: 'teamId and contactId are required' });
    }

    const contactResult = await pool.query(
      'SELECT * FROM contacts WHERE id = $1 AND team_id = $2',
      [contactId, teamId]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = contactResult.rows[0];

    const systemPrompt = `You are an elite sales intelligence researcher with expertise in B2B company analysis.
You create comprehensive prospect briefs that help sales reps have highly informed, relevant conversations.
Your research covers company context, likely pain points, technology landscape, and sales approach recommendations.

Important: Base your analysis on the information provided about the company and role. Be specific and actionable.

Respond with ONLY valid JSON.`;

    const userPrompt = `Research this prospect and generate a comprehensive brief:

=== CONTACT INFORMATION ===
Name: ${contact.first_name} ${contact.last_name}
Title: ${contact.job_title || 'Unknown'}
Company: ${contact.company || 'Unknown'}
Industry: ${contact.industry || contact.custom_fields?.industry || 'Unknown'}
Email: ${contact.email}
LinkedIn: ${contact.linkedin_url || 'Not provided'}

Generate a sales-ready prospect brief:

Respond ONLY with JSON:
{
  "companyOverview": "2-3 sentence overview of this type of company, their business model, and market position",
  "techStack": ["Likely tool 1 they use", "Likely tool 2", "Technology 3"],
  "painPoints": [
    "Specific pain point this role/company type commonly faces",
    "Another relevant challenge",
    "Third pain point"
  ],
  "triggerEvents": [
    "Common trigger event that would make them receptive to outreach (e.g. rapid hiring, funding round, new initiative)",
    "Another trigger event to watch for"
  ],
  "decisionMakers": [
    {
      "title": "Likely co-decision maker title",
      "influence": "Their role in the buying decision",
      "approach": "How to engage them"
    }
  ],
  "recommendedApproach": "Specific, tactical recommendation for how to approach this prospect — what angle to lead with, what pain to reference, what proof points to use",
  "emailOpeningLine": "A highly personalized first sentence for an outreach email that references something specific to their role/company",
  "talkingPoints": ["Key talking point 1", "Key talking point 2", "Key talking point 3"],
  "avoidTopics": ["Topics or approaches to avoid with this persona"],
  "buyingCyclePrediction": "Typical buying cycle length and stages for this type of company",
  "aiConfidence": 78.5
}`;

    const { content, tokensUsed } = await callOpenRouter(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { model: 'anthropic/claude-3-5-sonnet-20241022', maxTokens: 2000 }
    );

    const aiResult = parseAIJson(content);
    if (!aiResult) {
      return res.status(422).json({ error: 'Failed to parse AI research response' });
    }

    const result = await pool.query(
      `INSERT INTO ai_prospect_research
        (team_id, contact_id, company_overview, tech_stack, pain_points, trigger_events,
         decision_makers, recommended_approach, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [teamId, contactId, aiResult.companyOverview, aiResult.techStack || [],
       aiResult.painPoints || [], aiResult.triggerEvents || [],
       JSON.stringify(aiResult.decisionMakers || []),
       aiResult.recommendedApproach, aiResult.aiConfidence || 75]
    );

    await pool.query(
      `INSERT INTO ai_results (team_id, user_id, feature, result, tokens_used, model)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId, userId || null, 'prospect_research', JSON.stringify(aiResult), tokensUsed, 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});

    res.status(201).json({
      id: result.rows[0].id,
      contactId,
      contactName: `${contact.first_name} ${contact.last_name}`,
      company: contact.company,
      ...aiResult,
      savedAt: result.rows[0].created_at,
      tokensUsed,
    });
  } catch (error: any) {
    if (error instanceof OpenRouterTimeoutError) {
      return res.status(503).json({ error: 'AI service timeout' });
    }
    console.error('Error researching prospect:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/ai/prospect-research?contactId=xxx — get research for a contact
router.get('/', async (req, res) => {
  try {
    const { teamId, contactId, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = `SELECT pr.*, c.first_name, c.last_name, c.company
                 FROM ai_prospect_research pr
                 JOIN contacts c ON pr.contact_id = c.id
                 WHERE pr.team_id = $1`;
    const params: any[] = [teamId];
    let paramIndex = 2;

    if (contactId) {
      query += ` AND pr.contact_id = $${paramIndex++}`;
      params.push(contactId);
    }

    query += ` ORDER BY pr.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM ai_prospect_research WHERE team_id = $1',
      [teamId]
    );

    const total = parseInt(countResult.rows[0].count);
    res.json({
      research: result.rows.map(r => ({
        ...r,
        contactName: `${r.first_name} ${r.last_name}`,
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching prospect research:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
