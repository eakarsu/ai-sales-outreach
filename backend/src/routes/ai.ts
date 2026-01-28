import { Router } from 'express';
import { pool } from '../config/database';
import {
  callOpenRouter,
  generateEmailPrompt,
  generateSubjectLinesPrompt,
  analyzeEmailPrompt,
  improveEmailPrompt,
} from '../services/openrouter';

const router = Router();

// Helper to parse JSON from AI response
const parseAIResponse = (content: string): any => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse AI response');
  }
};

router.post('/generate-email', async (req, res) => {
  try {
    const { teamId, userId, type, context } = req.body;

    const messages = generateEmailPrompt(type, context || {});
    const { content, tokensUsed } = await callOpenRouter(messages);
    const generated = parseAIResponse(content);

    // Log the generation
    await pool.query(
      `INSERT INTO ai_generations (team_id, user_id, type, prompt, result, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId, userId, 'email_generation', JSON.stringify({ type, context }), JSON.stringify(generated), tokensUsed]
    );

    res.json({
      success: true,
      subject: generated.subject,
      body: generated.body,
      tokensUsed,
    });
  } catch (error: any) {
    console.error('Error generating email:', error);
    res.status(500).json({ error: error.message || 'Failed to generate email' });
  }
});

router.post('/improve-email', async (req, res) => {
  try {
    const { teamId, userId, subject, body, improvements } = req.body;

    const messages = improveEmailPrompt(subject, body, improvements || []);
    const { content, tokensUsed } = await callOpenRouter(messages);
    const improved = parseAIResponse(content);

    await pool.query(
      `INSERT INTO ai_generations (team_id, user_id, type, prompt, result, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId, userId, 'email_improvement', JSON.stringify({ subject, body, improvements }), JSON.stringify(improved), tokensUsed]
    );

    res.json({
      success: true,
      subject: improved.subject,
      body: improved.body,
      tokensUsed,
    });
  } catch (error: any) {
    console.error('Error improving email:', error);
    res.status(500).json({ error: error.message || 'Failed to improve email' });
  }
});

router.post('/generate-subject-lines', async (req, res) => {
  try {
    const { teamId, userId, context, count = 5 } = req.body;

    const messages = generateSubjectLinesPrompt(context || {}, count);
    const { content, tokensUsed } = await callOpenRouter(messages);
    const result = parseAIResponse(content);

    await pool.query(
      `INSERT INTO ai_generations (team_id, user_id, type, prompt, result, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId, userId, 'subject_lines', JSON.stringify(context), JSON.stringify(result.subjectLines), tokensUsed]
    );

    res.json({
      success: true,
      subjectLines: result.subjectLines,
      tokensUsed,
    });
  } catch (error: any) {
    console.error('Error generating subject lines:', error);
    res.status(500).json({ error: error.message || 'Failed to generate subject lines' });
  }
});

router.post('/analyze-email', async (req, res) => {
  try {
    const { teamId, userId, subject, body } = req.body;

    const messages = analyzeEmailPrompt(subject, body);
    const { content, tokensUsed } = await callOpenRouter(messages);
    const analysis = parseAIResponse(content);

    // Optionally log the analysis
    if (teamId && userId) {
      await pool.query(
        `INSERT INTO ai_generations (team_id, user_id, type, prompt, result, tokens_used)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [teamId, userId, 'email_analysis', JSON.stringify({ subject, body }), JSON.stringify(analysis), tokensUsed]
      );
    }

    res.json({
      ...analysis,
      tokensUsed,
    });
  } catch (error: any) {
    console.error('Error analyzing email:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze email' });
  }
});

router.get('/generations', async (req, res) => {
  try {
    const { teamId, limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT ag.*, u.first_name, u.last_name
       FROM ai_generations ag
       LEFT JOIN users u ON ag.user_id = u.id
       WHERE ag.team_id = $1
       ORDER BY ag.created_at DESC
       LIMIT $2`,
      [teamId, limit]
    );

    res.json(result.rows.map(g => ({
      id: g.id,
      type: g.type,
      prompt: g.prompt,
      result: g.result,
      tokensUsed: g.tokens_used,
      userName: g.first_name ? `${g.first_name} ${g.last_name}` : null,
      createdAt: g.created_at,
    })));
  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const { teamId } = req.query;

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_generations,
        SUM(tokens_used) as total_tokens,
        COUNT(*) FILTER (WHERE type = 'email_generation') as email_generations,
        COUNT(*) FILTER (WHERE type = 'subject_lines') as subject_generations,
        COUNT(*) FILTER (WHERE type = 'email_improvement') as improvements
       FROM ai_generations
       WHERE team_id = $1 AND created_at >= CURRENT_DATE - 30`,
      [teamId]
    );

    const r = result.rows[0];
    res.json({
      totalGenerations: parseInt(r.total_generations) || 0,
      totalTokens: parseInt(r.total_tokens) || 0,
      emailGenerations: parseInt(r.email_generations) || 0,
      subjectGenerations: parseInt(r.subject_generations) || 0,
      improvements: parseInt(r.improvements) || 0,
    });
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check for AI service
router.get('/status', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const isConfigured = apiKey && apiKey !== 'your-openrouter-api-key-here';

  res.json({
    configured: isConfigured,
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
  });
});

export default router;
