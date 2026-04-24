import { Router } from 'express';
import { pool } from '../config/database';
import {
  callOpenRouter,
  generateEmailPrompt,
  generateSubjectLinesPrompt,
  analyzeEmailPrompt,
  improveEmailPrompt,
  scoreLeadPrompt,
  generatePersonalizationPrompt,
  predictBestTimePrompt,
  handleObjectionPrompt,
  forecastPipelinePrompt,
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

// ==================== AI LEAD SCORER ====================

// Get all lead scores
router.get('/lead-scores', async (req, res) => {
  try {
    const { teamId } = req.query;
    const result = await pool.query(
      `SELECT ls.*, c.first_name, c.last_name, c.email, c.company, c.job_title
       FROM ai_lead_scores ls
       LEFT JOIN contacts c ON ls.contact_id = c.id
       WHERE ls.team_id = $1
       ORDER BY ls.score DESC, ls.created_at DESC`,
      [teamId]
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      teamId: r.team_id,
      contactId: r.contact_id,
      contactName: r.first_name ? `${r.first_name} ${r.last_name}` : 'Unknown',
      contactEmail: r.email,
      company: r.company,
      jobTitle: r.job_title,
      score: r.score,
      confidence: parseFloat(r.confidence) || 0,
      factors: r.factors,
      aiAnalysis: r.ai_analysis,
      recommendation: r.recommendation,
      engagementLevel: r.engagement_level,
      buyingSignals: r.buying_signals || [],
      riskFactors: r.risk_factors || [],
      nextBestAction: r.next_best_action,
      predictedCloseDate: r.predicted_close_date,
      predictedDealValue: parseFloat(r.predicted_deal_value) || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (error) {
    console.error('Error fetching lead scores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single lead score
router.get('/lead-scores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ls.*, c.first_name, c.last_name, c.email, c.company, c.job_title
       FROM ai_lead_scores ls
       LEFT JOIN contacts c ON ls.contact_id = c.id
       WHERE ls.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead score not found' });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      teamId: r.team_id,
      contactId: r.contact_id,
      contactName: r.first_name ? `${r.first_name} ${r.last_name}` : 'Unknown',
      contactEmail: r.email,
      company: r.company,
      jobTitle: r.job_title,
      score: r.score,
      confidence: parseFloat(r.confidence) || 0,
      factors: r.factors,
      aiAnalysis: r.ai_analysis,
      recommendation: r.recommendation,
      engagementLevel: r.engagement_level,
      buyingSignals: r.buying_signals || [],
      riskFactors: r.risk_factors || [],
      nextBestAction: r.next_best_action,
      predictedCloseDate: r.predicted_close_date,
      predictedDealValue: parseFloat(r.predicted_deal_value) || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    });
  } catch (error) {
    console.error('Error fetching lead score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Score a lead with AI
router.post('/lead-scores/score', async (req, res) => {
  try {
    const { teamId, contactId } = req.body;

    // Get contact data
    const contactResult = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM emails_sent WHERE contact_id = c.id) as emails_sent,
        (SELECT COUNT(*) FROM emails_sent WHERE contact_id = c.id AND opened_at IS NOT NULL) as emails_opened,
        (SELECT COUNT(*) FROM emails_sent WHERE contact_id = c.id AND replied_at IS NOT NULL) as replies,
        (SELECT COUNT(*) FROM meetings WHERE contact_id = c.id) as meetings
       FROM contacts c WHERE c.id = $1`,
      [contactId]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = contactResult.rows[0];
    const messages = scoreLeadPrompt({
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.email,
      company: contact.company,
      jobTitle: contact.job_title,
      industry: contact.custom_fields?.industry,
      status: contact.status,
      source: contact.source,
      lastContactedAt: contact.last_contacted_at,
      leadScore: contact.lead_score,
      emailsSent: contact.emails_sent,
      emailsOpened: contact.emails_opened,
      replies: contact.replies,
      meetings: contact.meetings
    });

    const { content, tokensUsed } = await callOpenRouter(messages, { maxTokens: 1500 });
    const aiResult = parseAIResponse(content);

    // Save the lead score
    const insertResult = await pool.query(
      `INSERT INTO ai_lead_scores (team_id, contact_id, score, confidence, factors, ai_analysis, recommendation,
        engagement_level, buying_signals, risk_factors, next_best_action, predicted_close_date, predicted_deal_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [teamId, contactId, aiResult.score, aiResult.confidence, JSON.stringify(aiResult),
       aiResult.analysis, aiResult.recommendation, aiResult.engagementLevel,
       aiResult.buyingSignals, aiResult.riskFactors, aiResult.nextBestAction,
       aiResult.predictedCloseDate, aiResult.predictedDealValue]
    );

    // Update contact's lead score
    await pool.query(
      `UPDATE contacts SET lead_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [aiResult.score, contactId]
    );

    res.json({
      id: insertResult.rows[0].id,
      ...aiResult,
      tokensUsed
    });
  } catch (error: any) {
    console.error('Error scoring lead:', error);
    res.status(500).json({ error: error.message || 'Failed to score lead' });
  }
});

// Create lead score manually
router.post('/lead-scores', async (req, res) => {
  try {
    const { teamId, contactId, score, confidence, factors, aiAnalysis, recommendation,
            engagementLevel, buyingSignals, riskFactors, nextBestAction, predictedCloseDate, predictedDealValue } = req.body;

    const result = await pool.query(
      `INSERT INTO ai_lead_scores (team_id, contact_id, score, confidence, factors, ai_analysis, recommendation,
        engagement_level, buying_signals, risk_factors, next_best_action, predicted_close_date, predicted_deal_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [teamId, contactId, score, confidence, JSON.stringify(factors || {}), aiAnalysis, recommendation,
       engagementLevel, buyingSignals || [], riskFactors || [], nextBestAction, predictedCloseDate, predictedDealValue]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lead score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lead score
router.put('/lead-scores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { score, confidence, factors, aiAnalysis, recommendation,
            engagementLevel, buyingSignals, riskFactors, nextBestAction, predictedCloseDate, predictedDealValue } = req.body;

    const result = await pool.query(
      `UPDATE ai_lead_scores SET
        score = COALESCE($1, score),
        confidence = COALESCE($2, confidence),
        factors = COALESCE($3, factors),
        ai_analysis = COALESCE($4, ai_analysis),
        recommendation = COALESCE($5, recommendation),
        engagement_level = COALESCE($6, engagement_level),
        buying_signals = COALESCE($7, buying_signals),
        risk_factors = COALESCE($8, risk_factors),
        next_best_action = COALESCE($9, next_best_action),
        predicted_close_date = COALESCE($10, predicted_close_date),
        predicted_deal_value = COALESCE($11, predicted_deal_value),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [score, confidence, factors ? JSON.stringify(factors) : null, aiAnalysis, recommendation,
       engagementLevel, buyingSignals, riskFactors, nextBestAction, predictedCloseDate, predictedDealValue, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead score not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lead score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete lead score
router.delete('/lead-scores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM ai_lead_scores WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== AI PERSONALIZATION ENGINE ====================

// Get all personalizations
router.get('/personalizations', async (req, res) => {
  try {
    const { teamId } = req.query;
    const result = await pool.query(
      `SELECT p.*, c.first_name, c.last_name, c.email, c.company, c.job_title
       FROM ai_personalizations p
       LEFT JOIN contacts c ON p.contact_id = c.id
       WHERE p.team_id = $1
       ORDER BY p.created_at DESC`,
      [teamId]
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      teamId: r.team_id,
      contactId: r.contact_id,
      contactName: r.first_name ? `${r.first_name} ${r.last_name}` : 'Unknown',
      contactEmail: r.email,
      company: r.company,
      jobTitle: r.job_title,
      personalizationType: r.personalization_type,
      originalContent: r.original_content,
      personalizedContent: r.personalized_content,
      personalizationFactors: r.personalization_factors,
      tone: r.tone,
      industryContext: r.industry_context,
      companyInsights: r.company_insights,
      roleSpecificPoints: r.role_specific_points || [],
      painPoints: r.pain_points || [],
      valuePropositions: r.value_propositions || [],
      aiConfidence: parseFloat(r.ai_confidence) || 0,
      engagementPrediction: parseFloat(r.engagement_prediction) || 0,
      createdAt: r.created_at
    })));
  } catch (error) {
    console.error('Error fetching personalizations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single personalization
router.get('/personalizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, c.first_name, c.last_name, c.email, c.company, c.job_title
       FROM ai_personalizations p
       LEFT JOIN contacts c ON p.contact_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personalization not found' });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      teamId: r.team_id,
      contactId: r.contact_id,
      contactName: r.first_name ? `${r.first_name} ${r.last_name}` : 'Unknown',
      contactEmail: r.email,
      company: r.company,
      jobTitle: r.job_title,
      personalizationType: r.personalization_type,
      originalContent: r.original_content,
      personalizedContent: r.personalized_content,
      personalizationFactors: r.personalization_factors,
      tone: r.tone,
      industryContext: r.industry_context,
      companyInsights: r.company_insights,
      roleSpecificPoints: r.role_specific_points || [],
      painPoints: r.pain_points || [],
      valuePropositions: r.value_propositions || [],
      aiConfidence: parseFloat(r.ai_confidence) || 0,
      engagementPrediction: parseFloat(r.engagement_prediction) || 0,
      createdAt: r.created_at
    });
  } catch (error) {
    console.error('Error fetching personalization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate personalization with AI
router.post('/personalizations/generate', async (req, res) => {
  try {
    const { teamId, contactId, originalContent, tone, focusArea, personalizationType } = req.body;

    // Get contact data
    const contactResult = await pool.query(
      `SELECT * FROM contacts WHERE id = $1`,
      [contactId]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = contactResult.rows[0];
    const messages = generatePersonalizationPrompt({
      firstName: contact.first_name,
      lastName: contact.last_name,
      company: contact.company,
      jobTitle: contact.job_title,
      industry: contact.custom_fields?.industry
    }, { original: originalContent, tone, focusArea });

    const { content, tokensUsed } = await callOpenRouter(messages, { maxTokens: 1500 });
    const aiResult = parseAIResponse(content);

    // Save the personalization
    const insertResult = await pool.query(
      `INSERT INTO ai_personalizations (team_id, contact_id, personalization_type, original_content, personalized_content,
        personalization_factors, tone, industry_context, company_insights, role_specific_points, pain_points,
        value_propositions, ai_confidence, engagement_prediction)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [teamId, contactId, personalizationType || 'email', originalContent, aiResult.personalizedContent,
       JSON.stringify(aiResult.personalizationFactors), aiResult.tone, aiResult.industryContext,
       aiResult.companyInsights, aiResult.roleSpecificPoints, aiResult.painPoints,
       aiResult.valuePropositions, aiResult.confidence, aiResult.engagementPrediction]
    );

    res.json({
      id: insertResult.rows[0].id,
      ...aiResult,
      tokensUsed
    });
  } catch (error: any) {
    console.error('Error generating personalization:', error);
    res.status(500).json({ error: error.message || 'Failed to generate personalization' });
  }
});

// Create personalization manually
router.post('/personalizations', async (req, res) => {
  try {
    const { teamId, contactId, personalizationType, originalContent, personalizedContent,
            personalizationFactors, tone, industryContext, companyInsights, roleSpecificPoints,
            painPoints, valuePropositions, aiConfidence, engagementPrediction } = req.body;

    const result = await pool.query(
      `INSERT INTO ai_personalizations (team_id, contact_id, personalization_type, original_content, personalized_content,
        personalization_factors, tone, industry_context, company_insights, role_specific_points, pain_points,
        value_propositions, ai_confidence, engagement_prediction)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [teamId, contactId, personalizationType, originalContent, personalizedContent,
       JSON.stringify(personalizationFactors || {}), tone, industryContext, companyInsights,
       roleSpecificPoints || [], painPoints || [], valuePropositions || [], aiConfidence, engagementPrediction]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating personalization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update personalization
router.put('/personalizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { personalizedContent, tone, roleSpecificPoints, painPoints, valuePropositions } = req.body;

    const result = await pool.query(
      `UPDATE ai_personalizations SET
        personalized_content = COALESCE($1, personalized_content),
        tone = COALESCE($2, tone),
        role_specific_points = COALESCE($3, role_specific_points),
        pain_points = COALESCE($4, pain_points),
        value_propositions = COALESCE($5, value_propositions)
       WHERE id = $6
       RETURNING *`,
      [personalizedContent, tone, roleSpecificPoints, painPoints, valuePropositions, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personalization not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating personalization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete personalization
router.delete('/personalizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM ai_personalizations WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting personalization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== AI BEST TIME PREDICTOR ====================

// Get all best time predictions
router.get('/best-times', async (req, res) => {
  try {
    const { teamId } = req.query;
    const result = await pool.query(
      `SELECT bt.*, c.first_name, c.last_name, c.email, c.company, c.job_title
       FROM ai_best_times bt
       LEFT JOIN contacts c ON bt.contact_id = c.id
       WHERE bt.team_id = $1
       ORDER BY bt.confidence DESC, bt.created_at DESC`,
      [teamId]
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      teamId: r.team_id,
      contactId: r.contact_id,
      contactName: r.first_name ? `${r.first_name} ${r.last_name}` : 'Unknown',
      contactEmail: r.email,
      company: r.company,
      jobTitle: r.job_title,
      bestDay: r.best_day,
      bestTimeStart: r.best_time_start,
      bestTimeEnd: r.best_time_end,
      timezone: r.timezone,
      confidence: parseFloat(r.confidence) || 0,
      historicalData: r.historical_data,
      aiReasoning: r.ai_reasoning,
      engagementPatterns: r.engagement_patterns,
      optimalFrequency: r.optimal_frequency,
      avoidTimes: r.avoid_times || [],
      industryInsights: r.industry_insights,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (error) {
    console.error('Error fetching best times:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single best time prediction
router.get('/best-times/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT bt.*, c.first_name, c.last_name, c.email, c.company, c.job_title
       FROM ai_best_times bt
       LEFT JOIN contacts c ON bt.contact_id = c.id
       WHERE bt.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Best time prediction not found' });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      teamId: r.team_id,
      contactId: r.contact_id,
      contactName: r.first_name ? `${r.first_name} ${r.last_name}` : 'Unknown',
      contactEmail: r.email,
      company: r.company,
      jobTitle: r.job_title,
      bestDay: r.best_day,
      bestTimeStart: r.best_time_start,
      bestTimeEnd: r.best_time_end,
      timezone: r.timezone,
      confidence: parseFloat(r.confidence) || 0,
      historicalData: r.historical_data,
      aiReasoning: r.ai_reasoning,
      engagementPatterns: r.engagement_patterns,
      optimalFrequency: r.optimal_frequency,
      avoidTimes: r.avoid_times || [],
      industryInsights: r.industry_insights,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    });
  } catch (error) {
    console.error('Error fetching best time prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Predict best time with AI
router.post('/best-times/predict', async (req, res) => {
  try {
    const { teamId, contactId } = req.body;

    // Get contact data
    const contactResult = await pool.query(
      `SELECT * FROM contacts WHERE id = $1`,
      [contactId]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get historical engagement data
    const engagementResult = await pool.query(
      `SELECT opened_at, replied_at FROM emails_sent
       WHERE contact_id = $1 AND (opened_at IS NOT NULL OR replied_at IS NOT NULL)`,
      [contactId]
    );

    const contact = contactResult.rows[0];
    const historicalData = {
      emailsOpened: engagementResult.rows.filter(r => r.opened_at).map(r => r.opened_at),
      repliesSent: engagementResult.rows.filter(r => r.replied_at).map(r => r.replied_at)
    };

    const messages = predictBestTimePrompt({
      firstName: contact.first_name,
      lastName: contact.last_name,
      company: contact.company,
      jobTitle: contact.job_title,
      industry: contact.custom_fields?.industry,
      timezone: contact.custom_fields?.timezone || 'America/New_York'
    }, historicalData);

    const { content, tokensUsed } = await callOpenRouter(messages, { maxTokens: 1500 });
    const aiResult = parseAIResponse(content);

    // Save the prediction
    const insertResult = await pool.query(
      `INSERT INTO ai_best_times (team_id, contact_id, best_day, best_time_start, best_time_end, timezone,
        confidence, historical_data, ai_reasoning, engagement_patterns, optimal_frequency, avoid_times, industry_insights)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [teamId, contactId, aiResult.bestDay, aiResult.bestTimeStart, aiResult.bestTimeEnd, aiResult.timezone,
       aiResult.confidence, JSON.stringify(historicalData), aiResult.reasoning, JSON.stringify(aiResult.engagementPatterns),
       aiResult.optimalFrequency, aiResult.avoidTimes, aiResult.industryInsights]
    );

    res.json({
      id: insertResult.rows[0].id,
      ...aiResult,
      tokensUsed
    });
  } catch (error: any) {
    console.error('Error predicting best time:', error);
    res.status(500).json({ error: error.message || 'Failed to predict best time' });
  }
});

// Create best time manually
router.post('/best-times', async (req, res) => {
  try {
    const { teamId, contactId, bestDay, bestTimeStart, bestTimeEnd, timezone, confidence,
            historicalData, aiReasoning, engagementPatterns, optimalFrequency, avoidTimes, industryInsights } = req.body;

    const result = await pool.query(
      `INSERT INTO ai_best_times (team_id, contact_id, best_day, best_time_start, best_time_end, timezone,
        confidence, historical_data, ai_reasoning, engagement_patterns, optimal_frequency, avoid_times, industry_insights)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [teamId, contactId, bestDay, bestTimeStart, bestTimeEnd, timezone, confidence,
       JSON.stringify(historicalData || {}), aiReasoning, JSON.stringify(engagementPatterns || {}),
       optimalFrequency, avoidTimes || [], industryInsights]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating best time:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update best time
router.put('/best-times/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { bestDay, bestTimeStart, bestTimeEnd, timezone, confidence, optimalFrequency, avoidTimes } = req.body;

    const result = await pool.query(
      `UPDATE ai_best_times SET
        best_day = COALESCE($1, best_day),
        best_time_start = COALESCE($2, best_time_start),
        best_time_end = COALESCE($3, best_time_end),
        timezone = COALESCE($4, timezone),
        confidence = COALESCE($5, confidence),
        optimal_frequency = COALESCE($6, optimal_frequency),
        avoid_times = COALESCE($7, avoid_times),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [bestDay, bestTimeStart, bestTimeEnd, timezone, confidence, optimalFrequency, avoidTimes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Best time prediction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating best time:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete best time
router.delete('/best-times/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM ai_best_times WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting best time:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== AI OBJECTION HANDLER ====================

// Get all objections
router.get('/objections', async (req, res) => {
  try {
    const { teamId } = req.query;
    const result = await pool.query(
      `SELECT * FROM ai_objections WHERE team_id = $1 ORDER BY use_count DESC, created_at DESC`,
      [teamId]
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      teamId: r.team_id,
      objectionType: r.objection_type,
      objectionText: r.objection_text,
      responseStrategy: r.response_strategy,
      responseTemplates: r.response_templates || [],
      confidence: parseFloat(r.confidence) || 0,
      successRate: parseFloat(r.success_rate) || 0,
      useCount: r.use_count,
      industry: r.industry,
      buyerPersona: r.buyer_persona,
      relatedObjections: r.related_objections || [],
      followUpQuestions: r.follow_up_questions || [],
      aiInsights: r.ai_insights,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (error) {
    console.error('Error fetching objections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single objection
router.get('/objections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM ai_objections WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Objection not found' });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      teamId: r.team_id,
      objectionType: r.objection_type,
      objectionText: r.objection_text,
      responseStrategy: r.response_strategy,
      responseTemplates: r.response_templates || [],
      confidence: parseFloat(r.confidence) || 0,
      successRate: parseFloat(r.success_rate) || 0,
      useCount: r.use_count,
      industry: r.industry,
      buyerPersona: r.buyer_persona,
      relatedObjections: r.related_objections || [],
      followUpQuestions: r.follow_up_questions || [],
      aiInsights: r.ai_insights,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    });
  } catch (error) {
    console.error('Error fetching objection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle objection with AI
router.post('/objections/handle', async (req, res) => {
  try {
    const { teamId, objectionText, industry, buyerPersona, salesStage, previousInteractions } = req.body;

    const messages = handleObjectionPrompt(objectionText, {
      industry,
      buyerPersona,
      salesStage,
      previousInteractions
    });

    const { content, tokensUsed } = await callOpenRouter(messages, { maxTokens: 2000 });
    const aiResult = parseAIResponse(content);

    // Save the objection
    const insertResult = await pool.query(
      `INSERT INTO ai_objections (team_id, objection_type, objection_text, response_strategy, response_templates,
        confidence, success_rate, industry, buyer_persona, related_objections, follow_up_questions, ai_insights)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [teamId, aiResult.objectionType, objectionText, aiResult.responseStrategy, JSON.stringify(aiResult.responseTemplates),
       aiResult.confidence, aiResult.successRate, industry, buyerPersona, aiResult.relatedObjections,
       aiResult.followUpQuestions, aiResult.insights]
    );

    res.json({
      id: insertResult.rows[0].id,
      ...aiResult,
      tokensUsed
    });
  } catch (error: any) {
    console.error('Error handling objection:', error);
    res.status(500).json({ error: error.message || 'Failed to handle objection' });
  }
});

// Create objection manually
router.post('/objections', async (req, res) => {
  try {
    const { teamId, objectionType, objectionText, responseStrategy, responseTemplates, confidence,
            successRate, industry, buyerPersona, relatedObjections, followUpQuestions, aiInsights } = req.body;

    const result = await pool.query(
      `INSERT INTO ai_objections (team_id, objection_type, objection_text, response_strategy, response_templates,
        confidence, success_rate, industry, buyer_persona, related_objections, follow_up_questions, ai_insights)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [teamId, objectionType, objectionText, responseStrategy, JSON.stringify(responseTemplates || []),
       confidence, successRate, industry, buyerPersona, relatedObjections || [], followUpQuestions || [], aiInsights]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating objection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update objection
router.put('/objections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { objectionType, responseStrategy, responseTemplates, successRate, relatedObjections, followUpQuestions } = req.body;

    const result = await pool.query(
      `UPDATE ai_objections SET
        objection_type = COALESCE($1, objection_type),
        response_strategy = COALESCE($2, response_strategy),
        response_templates = COALESCE($3, response_templates),
        success_rate = COALESCE($4, success_rate),
        related_objections = COALESCE($5, related_objections),
        follow_up_questions = COALESCE($6, follow_up_questions),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [objectionType, responseStrategy, responseTemplates ? JSON.stringify(responseTemplates) : null,
       successRate, relatedObjections, followUpQuestions, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Objection not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating objection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Increment objection use count
router.post('/objections/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE ai_objections SET use_count = use_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error incrementing use count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete objection
router.delete('/objections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM ai_objections WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting objection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== AI PIPELINE FORECASTER ====================

// Get all forecasts
router.get('/forecasts', async (req, res) => {
  try {
    const { teamId } = req.query;
    const result = await pool.query(
      `SELECT * FROM ai_pipeline_forecasts WHERE team_id = $1 ORDER BY created_at DESC`,
      [teamId]
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      teamId: r.team_id,
      forecastPeriod: r.forecast_period,
      forecastDate: r.forecast_date,
      predictedRevenue: parseFloat(r.predicted_revenue) || 0,
      predictedDeals: r.predicted_deals,
      confidence: parseFloat(r.confidence) || 0,
      pipelineHealth: r.pipeline_health,
      riskAssessment: r.risk_assessment,
      opportunities: r.opportunities || [],
      recommendations: r.recommendations || [],
      aiAnalysis: r.ai_analysis,
      factorsConsidered: r.factors_considered,
      scenarioBest: parseFloat(r.scenario_best) || 0,
      scenarioLikely: parseFloat(r.scenario_likely) || 0,
      scenarioWorst: parseFloat(r.scenario_worst) || 0,
      createdAt: r.created_at
    })));
  } catch (error) {
    console.error('Error fetching forecasts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single forecast
router.get('/forecasts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM ai_pipeline_forecasts WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      teamId: r.team_id,
      forecastPeriod: r.forecast_period,
      forecastDate: r.forecast_date,
      predictedRevenue: parseFloat(r.predicted_revenue) || 0,
      predictedDeals: r.predicted_deals,
      confidence: parseFloat(r.confidence) || 0,
      pipelineHealth: r.pipeline_health,
      riskAssessment: r.risk_assessment,
      opportunities: r.opportunities || [],
      recommendations: r.recommendations || [],
      aiAnalysis: r.ai_analysis,
      factorsConsidered: r.factors_considered,
      scenarioBest: parseFloat(r.scenario_best) || 0,
      scenarioLikely: parseFloat(r.scenario_likely) || 0,
      scenarioWorst: parseFloat(r.scenario_worst) || 0,
      createdAt: r.created_at
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate forecast with AI
router.post('/forecasts/generate', async (req, res) => {
  try {
    const { teamId, forecastPeriod } = req.body;

    // Get pipeline data
    const pipelineResult = await pool.query(
      `SELECT c.*, ct.first_name, ct.last_name, ct.company
       FROM campaigns c
       LEFT JOIN contacts ct ON ct.id = (
         SELECT contact_id FROM emails_sent WHERE campaign_id = c.id LIMIT 1
       )
       WHERE c.team_id = $1 AND c.status IN ('active', 'draft')`,
      [teamId]
    );

    // Get historical data
    const historicalResult = await pool.query(
      `SELECT
        AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100 as average_win_rate,
        AVG(EXTRACT(DAY FROM (end_date - start_date))) as average_cycle_length
       FROM campaigns WHERE team_id = $1 AND end_date IS NOT NULL`,
      [teamId]
    );

    const pipelineData = {
      forecastPeriod,
      totalValue: pipelineResult.rows.reduce((sum, r) => sum + parseFloat(r.revenue_generated || 0), 0),
      deals: pipelineResult.rows.map(r => ({
        name: r.name,
        value: parseFloat(r.revenue_generated || 0),
        status: r.status,
        meetingsBooked: r.meetings_booked
      }))
    };

    const historicalData = {
      averageWinRate: parseFloat(historicalResult.rows[0]?.average_win_rate || 25),
      averageCycleLength: parseFloat(historicalResult.rows[0]?.average_cycle_length || 45)
    };

    const messages = forecastPipelinePrompt(pipelineData, historicalData);

    const { content, tokensUsed } = await callOpenRouter(messages, { maxTokens: 2000 });
    const aiResult = parseAIResponse(content);

    // Save the forecast
    const insertResult = await pool.query(
      `INSERT INTO ai_pipeline_forecasts (team_id, forecast_period, forecast_date, predicted_revenue, predicted_deals,
        confidence, pipeline_health, risk_assessment, opportunities, recommendations, ai_analysis, factors_considered,
        scenario_best, scenario_likely, scenario_worst)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [teamId, forecastPeriod || aiResult.forecastPeriod, aiResult.predictedRevenue, aiResult.predictedDeals,
       aiResult.confidence, aiResult.pipelineHealth, aiResult.riskAssessment, JSON.stringify(aiResult.opportunities),
       aiResult.recommendations, aiResult.analysis, JSON.stringify(aiResult.factorsConsidered),
       aiResult.scenarioBest, aiResult.scenarioLikely, aiResult.scenarioWorst]
    );

    res.json({
      id: insertResult.rows[0].id,
      ...aiResult,
      tokensUsed
    });
  } catch (error: any) {
    console.error('Error generating forecast:', error);
    res.status(500).json({ error: error.message || 'Failed to generate forecast' });
  }
});

// Create forecast manually
router.post('/forecasts', async (req, res) => {
  try {
    const { teamId, forecastPeriod, forecastDate, predictedRevenue, predictedDeals, confidence,
            pipelineHealth, riskAssessment, opportunities, recommendations, aiAnalysis, factorsConsidered,
            scenarioBest, scenarioLikely, scenarioWorst } = req.body;

    const result = await pool.query(
      `INSERT INTO ai_pipeline_forecasts (team_id, forecast_period, forecast_date, predicted_revenue, predicted_deals,
        confidence, pipeline_health, risk_assessment, opportunities, recommendations, ai_analysis, factors_considered,
        scenario_best, scenario_likely, scenario_worst)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [teamId, forecastPeriod, forecastDate || new Date(), predictedRevenue, predictedDeals, confidence,
       pipelineHealth, riskAssessment, JSON.stringify(opportunities || []), recommendations || [], aiAnalysis,
       JSON.stringify(factorsConsidered || {}), scenarioBest, scenarioLikely, scenarioWorst]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update forecast
router.put('/forecasts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { predictedRevenue, predictedDeals, confidence, pipelineHealth, recommendations } = req.body;

    const result = await pool.query(
      `UPDATE ai_pipeline_forecasts SET
        predicted_revenue = COALESCE($1, predicted_revenue),
        predicted_deals = COALESCE($2, predicted_deals),
        confidence = COALESCE($3, confidence),
        pipeline_health = COALESCE($4, pipeline_health),
        recommendations = COALESCE($5, recommendations)
       WHERE id = $6
       RETURNING *`,
      [predictedRevenue, predictedDeals, confidence, pipelineHealth, recommendations, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete forecast
router.delete('/forecasts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM ai_pipeline_forecasts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
