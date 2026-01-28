import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

router.get('/dashboard', async (req, res) => {
  try {
    const { teamId } = req.query;

    // Get overall stats
    const campaignStats = await pool.query(
      `SELECT
        COUNT(*) as total_campaigns,
        COUNT(*) FILTER (WHERE status = 'active') as active_campaigns,
        SUM(emails_sent) as total_emails_sent,
        SUM(emails_opened) as total_emails_opened,
        SUM(replies_received) as total_replies,
        SUM(meetings_booked) as total_meetings,
        SUM(revenue_generated) as total_revenue
       FROM campaigns
       WHERE team_id = $1`,
      [teamId]
    );

    const contactStats = await pool.query(
      `SELECT
        COUNT(*) as total_contacts,
        COUNT(*) FILTER (WHERE status = 'qualified') as qualified,
        COUNT(*) FILTER (WHERE status = 'won') as won,
        AVG(lead_score) as avg_lead_score
       FROM contacts
       WHERE team_id = $1`,
      [teamId]
    );

    // Get last 30 days trend
    const trendData = await pool.query(
      `SELECT date, emails_sent, emails_opened, replies_received, meetings_booked, revenue
       FROM analytics
       WHERE team_id = $1
       ORDER BY date DESC
       LIMIT 30`,
      [teamId]
    );

    // Get top performing campaigns
    const topCampaigns = await pool.query(
      `SELECT id, name, emails_sent, emails_opened, replies_received, meetings_booked, revenue_generated,
       CASE WHEN emails_sent > 0 THEN (emails_opened::float / emails_sent * 100) ELSE 0 END as open_rate,
       CASE WHEN emails_sent > 0 THEN (replies_received::float / emails_sent * 100) ELSE 0 END as reply_rate
       FROM campaigns
       WHERE team_id = $1 AND emails_sent > 0
       ORDER BY revenue_generated DESC
       LIMIT 5`,
      [teamId]
    );

    const cs = campaignStats.rows[0];
    const cos = contactStats.rows[0];

    res.json({
      overview: {
        totalCampaigns: parseInt(cs.total_campaigns) || 0,
        activeCampaigns: parseInt(cs.active_campaigns) || 0,
        totalEmailsSent: parseInt(cs.total_emails_sent) || 0,
        totalEmailsOpened: parseInt(cs.total_emails_opened) || 0,
        totalReplies: parseInt(cs.total_replies) || 0,
        totalMeetings: parseInt(cs.total_meetings) || 0,
        totalRevenue: parseFloat(cs.total_revenue) || 0,
        overallOpenRate: cs.total_emails_sent > 0 ? ((cs.total_emails_opened / cs.total_emails_sent) * 100).toFixed(1) : 0,
        overallReplyRate: cs.total_emails_sent > 0 ? ((cs.total_replies / cs.total_emails_sent) * 100).toFixed(1) : 0
      },
      contacts: {
        total: parseInt(cos.total_contacts) || 0,
        qualified: parseInt(cos.qualified) || 0,
        won: parseInt(cos.won) || 0,
        avgLeadScore: parseFloat(cos.avg_lead_score) || 0
      },
      trend: trendData.rows.map(t => ({
        date: t.date,
        emailsSent: t.emails_sent,
        emailsOpened: t.emails_opened,
        repliesReceived: t.replies_received,
        meetingsBooked: t.meetings_booked,
        revenue: parseFloat(t.revenue)
      })),
      topCampaigns: topCampaigns.rows.map(c => ({
        id: c.id,
        name: c.name,
        emailsSent: c.emails_sent,
        emailsOpened: c.emails_opened,
        repliesReceived: c.replies_received,
        meetingsBooked: c.meetings_booked,
        revenueGenerated: parseFloat(c.revenue_generated),
        openRate: parseFloat(c.open_rate).toFixed(1),
        replyRate: parseFloat(c.reply_rate).toFixed(1)
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/roi', async (req, res) => {
  try {
    const { teamId } = req.query;

    // Calculate ROI metrics
    const revenueData = await pool.query(
      `SELECT
        SUM(revenue_generated) as total_revenue,
        SUM(meetings_booked) as total_meetings,
        COUNT(*) FILTER (WHERE revenue_generated > 0) as deals_with_revenue
       FROM campaigns
       WHERE team_id = $1`,
      [teamId]
    );

    // Get team cost (monthly subscription * users)
    const teamData = await pool.query(
      `SELECT t.monthly_price, COUNT(tm.id) as member_count
       FROM teams t
       LEFT JOIN team_members tm ON t.id = tm.team_id
       WHERE t.id = $1
       GROUP BY t.id`,
      [teamId]
    );

    const revenue = parseFloat(revenueData.rows[0]?.total_revenue) || 0;
    const meetings = parseInt(revenueData.rows[0]?.total_meetings) || 0;
    const monthlyPrice = parseFloat(teamData.rows[0]?.monthly_price) || 50;
    const memberCount = parseInt(teamData.rows[0]?.member_count) || 1;
    const monthlyCost = monthlyPrice * memberCount;

    // Calculate ROI (assuming 3 months of usage)
    const totalCost = monthlyCost * 3;
    const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost * 100) : 0;

    // Revenue per meeting
    const revenuePerMeeting = meetings > 0 ? revenue / meetings : 0;

    res.json({
      totalRevenue: revenue,
      totalMeetings: meetings,
      monthlyCost: monthlyCost,
      roi: roi.toFixed(1),
      revenuePerMeeting: revenuePerMeeting.toFixed(2),
      costPerMeeting: meetings > 0 ? (totalCost / meetings).toFixed(2) : 0,
      memberCount,
      pricePerUser: monthlyPrice
    });
  } catch (error) {
    console.error('Error fetching ROI:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/performance', async (req, res) => {
  try {
    const { teamId, period = '30' } = req.query;

    const performanceData = await pool.query(
      `SELECT
        date,
        emails_sent,
        emails_opened,
        emails_clicked,
        replies_received,
        meetings_booked,
        deals_closed,
        revenue
       FROM analytics
       WHERE team_id = $1 AND date >= CURRENT_DATE - $2::integer
       ORDER BY date`,
      [teamId, parseInt(period as string)]
    );

    res.json(performanceData.rows.map(p => ({
      date: p.date,
      emailsSent: p.emails_sent,
      emailsOpened: p.emails_opened,
      emailsClicked: p.emails_clicked,
      repliesReceived: p.replies_received,
      meetingsBooked: p.meetings_booked,
      dealsClosed: p.deals_closed,
      revenue: parseFloat(p.revenue)
    })));
  } catch (error) {
    console.error('Error fetching performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/email-stats', async (req, res) => {
  try {
    const { teamId } = req.query;

    const stats = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE es.status = 'sent') as sent,
        COUNT(*) FILTER (WHERE es.status = 'opened' OR es.opened_at IS NOT NULL) as opened,
        COUNT(*) FILTER (WHERE es.status = 'clicked' OR es.clicked_at IS NOT NULL) as clicked,
        COUNT(*) FILTER (WHERE es.status = 'replied' OR es.replied_at IS NOT NULL) as replied,
        COUNT(*) FILTER (WHERE es.status = 'bounced' OR es.bounced_at IS NOT NULL) as bounced
       FROM emails_sent es
       JOIN campaigns c ON es.campaign_id = c.id
       WHERE c.team_id = $1`,
      [teamId]
    );

    const s = stats.rows[0];
    res.json({
      total: parseInt(s.total),
      sent: parseInt(s.sent),
      opened: parseInt(s.opened),
      clicked: parseInt(s.clicked),
      replied: parseInt(s.replied),
      bounced: parseInt(s.bounced),
      openRate: s.total > 0 ? ((s.opened / s.total) * 100).toFixed(1) : 0,
      clickRate: s.total > 0 ? ((s.clicked / s.total) * 100).toFixed(1) : 0,
      replyRate: s.total > 0 ? ((s.replied / s.total) * 100).toFixed(1) : 0,
      bounceRate: s.total > 0 ? ((s.bounced / s.total) * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
