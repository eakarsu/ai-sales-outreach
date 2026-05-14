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

// GET /api/analytics/leaderboard — team performance leaderboard
router.get('/', async (req, res) => {
  try {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId is required' });

    const result = await pool.query(
      `SELECT
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(DISTINCT m.id) FILTER (WHERE m.team_id = $1) as meetings_booked,
        COUNT(DISTINCT t.id) FILTER (WHERE t.team_id = $1 AND t.status = 'completed') as tasks_completed,
        COUNT(DISTINCT c.id) FILTER (WHERE c.team_id = $1) as campaigns_created,
        COUNT(DISTINCT es.id) as emails_sent,
        COUNT(DISTINCT es.id) FILTER (WHERE es.opened_at IS NOT NULL) as emails_opened,
        COUNT(DISTINCT es.id) FILTER (WHERE es.replied_at IS NOT NULL) as replies_received,
        COALESCE(SUM(d.value) FILTER (WHERE d.stage = 'closed_won'), 0) as revenue_won
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       LEFT JOIN meetings m ON m.user_id = u.id AND m.team_id = $1
       LEFT JOIN tasks t ON t.assigned_to = u.id AND t.team_id = $1
       LEFT JOIN campaigns c ON c.created_by = u.id AND c.team_id = $1
       LEFT JOIN emails_sent es ON es.campaign_id IN (SELECT id FROM campaigns WHERE team_id = $1 AND created_by = u.id)
       LEFT JOIN deals d ON d.owner_id = u.id AND d.team_id = $1
       WHERE tm.team_id = $1
       GROUP BY u.id, u.first_name, u.last_name, u.email
       ORDER BY revenue_won DESC, meetings_booked DESC`,
      [teamId]
    );

    const leaderboard = result.rows.map((r, idx) => {
      const emailsSent = parseInt(r.emails_sent) || 0;
      const emailsOpened = parseInt(r.emails_opened) || 0;
      const repliesReceived = parseInt(r.replies_received) || 0;
      return {
        rank: idx + 1,
        userId: r.user_id,
        name: `${r.first_name} ${r.last_name}`,
        email: r.email,
        meetingsBooked: parseInt(r.meetings_booked) || 0,
        tasksCompleted: parseInt(r.tasks_completed) || 0,
        campaignsCreated: parseInt(r.campaigns_created) || 0,
        emailsSent,
        emailsOpened,
        repliesReceived,
        revenueWon: parseFloat(r.revenue_won) || 0,
        openRate: emailsSent > 0 ? ((emailsOpened / emailsSent) * 100).toFixed(1) : '0',
        replyRate: emailsSent > 0 ? ((repliesReceived / emailsSent) * 100).toFixed(1) : '0',
      };
    });

    res.json({ leaderboard, teamId, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/leaderboard/coaching/:userId — get AI coaching tips for a rep
router.get('/coaching/:userId', async (req, res) => {
  try {
    const { teamId } = req.query;
    const { userId } = req.params;

    const [userResult, metricsResult] = await Promise.all([
      pool.query('SELECT * FROM users WHERE id = $1', [userId]),
      pool.query(
        `SELECT
          COUNT(DISTINCT es.id) as emails_sent,
          COUNT(DISTINCT es.id) FILTER (WHERE es.opened_at IS NOT NULL) as emails_opened,
          COUNT(DISTINCT es.id) FILTER (WHERE es.replied_at IS NOT NULL) as replies_received,
          COUNT(DISTINCT m.id) as meetings_booked,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as tasks_completed,
          AVG(LENGTH(es.subject)) as avg_subject_length
         FROM users u
         LEFT JOIN campaigns c ON c.created_by = u.id AND c.team_id = $1
         LEFT JOIN emails_sent es ON es.campaign_id = c.id
         LEFT JOIN meetings m ON m.user_id = u.id AND m.team_id = $1
         LEFT JOIN tasks t ON t.assigned_to = u.id AND t.team_id = $1
         WHERE u.id = $2`,
        [teamId, userId]
      ),
    ]);

    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userResult.rows[0];
    const metrics = metricsResult.rows[0];
    const emailsSent = parseInt(metrics.emails_sent) || 0;
    const openRate = emailsSent > 0 ? (parseInt(metrics.emails_opened) / emailsSent * 100) : 0;
    const replyRate = emailsSent > 0 ? (parseInt(metrics.replies_received) / emailsSent * 100) : 0;

    const systemPrompt = `You are an elite sales coach providing personalized, data-driven coaching to sales reps.
Your coaching is specific, actionable, and benchmarked against best practices.
Industry benchmarks: open rate 25-35%, reply rate 5-10%, 2-3 meetings/week for active reps.

Respond with ONLY valid JSON.`;

    const userPrompt = `Generate personalized coaching tips for this sales rep:

Rep: ${user.first_name} ${user.last_name}
Role: ${user.role}

=== PERFORMANCE METRICS ===
Emails Sent: ${emailsSent}
Open Rate: ${openRate.toFixed(1)}% (benchmark: 28%)
Reply Rate: ${replyRate.toFixed(1)}% (benchmark: 7%)
Meetings Booked: ${metrics.meetings_booked || 0} (benchmark: 8-12/month)
Tasks Completed: ${metrics.tasks_completed || 0}
Average Subject Line Length: ${metrics.avg_subject_length ? Math.round(parseFloat(metrics.avg_subject_length)) : 'N/A'} chars (benchmark: <50)

Respond ONLY with JSON:
{
  "overallGrade": "B+",
  "strengthAreas": ["Area where rep is excelling with specific data"],
  "improvementAreas": [
    {
      "metric": "Open Rate",
      "currentValue": "${openRate.toFixed(1)}%",
      "benchmarkValue": "28%",
      "gap": "Below benchmark",
      "actionableTip": "Specific, concrete advice to improve this metric",
      "exerciseToTry": "A specific experiment or A/B test to run this week"
    }
  ],
  "weeklyFocus": "The one thing this rep should focus on this week",
  "thirtyDayGoal": "A specific, measurable goal for the next 30 days",
  "coachingNotes": "Personalized coaching narrative (2-3 paragraphs)",
  "celebrationWins": ["What this rep is doing well that deserves recognition"]
}`;

    const { content, tokensUsed } = await callOpenRouter(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { model: 'anthropic/claude-3-5-sonnet-20241022', maxTokens: 1500 }
    );

    const aiResult = parseAIJson(content);
    if (!aiResult) return res.status(422).json({ error: 'Failed to parse AI coaching response' });

    await pool.query(
      `INSERT INTO ai_results (team_id, user_id, feature, result, tokens_used, model)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId || null, userId, 'coaching_tips', JSON.stringify(aiResult), tokensUsed, 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});

    res.json({
      userId,
      repName: `${user.first_name} ${user.last_name}`,
      metrics: { emailsSent, openRate: openRate.toFixed(1), replyRate: replyRate.toFixed(1) },
      coaching: aiResult,
      tokensUsed,
    });
  } catch (error: any) {
    if (error instanceof OpenRouterTimeoutError) return res.status(503).json({ error: 'AI service timeout' });
    console.error('Error generating coaching tips:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
