import { pool, initDatabase } from './config/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const seed = async () => {
  console.log('Starting database seed...');

  await initDatabase();

  const client = await pool.connect();

  try {
    // Clear existing data
    await client.query(`
      DO $$ BEGIN
        TRUNCATE users, teams, team_members, contacts, email_templates, campaigns, campaign_sequences,
          emails_sent, ab_tests, analytics, integrations, ai_generations, activity_log, sequences,
          sequence_steps, meetings, tasks, notifications, reports, ai_lead_scores, ai_personalizations,
          ai_best_times, ai_objections, ai_pipeline_forecasts CASCADE;
      EXCEPTION WHEN undefined_table THEN NULL;
      END $$;
    `);

    // Clear new tables if they exist
    await client.query(`
      DO $$ BEGIN
        TRUNCATE password_reset_tokens, token_blacklist, email_verifications CASCADE;
      EXCEPTION WHEN undefined_table THEN NULL;
      END $$;
    `);

    // Create 16 Users
    const users = [
      { id: uuidv4(), email: 'john.smith@company.com', firstName: 'John', lastName: 'Smith', role: 'admin' },
      { id: uuidv4(), email: 'sarah.johnson@company.com', firstName: 'Sarah', lastName: 'Johnson', role: 'manager' },
      { id: uuidv4(), email: 'mike.wilson@company.com', firstName: 'Mike', lastName: 'Wilson', role: 'user' },
      { id: uuidv4(), email: 'emily.davis@company.com', firstName: 'Emily', lastName: 'Davis', role: 'user' },
      { id: uuidv4(), email: 'david.brown@company.com', firstName: 'David', lastName: 'Brown', role: 'user' },
      { id: uuidv4(), email: 'lisa.martinez@company.com', firstName: 'Lisa', lastName: 'Martinez', role: 'manager' },
      { id: uuidv4(), email: 'james.taylor@company.com', firstName: 'James', lastName: 'Taylor', role: 'user' },
      { id: uuidv4(), email: 'jennifer.anderson@company.com', firstName: 'Jennifer', lastName: 'Anderson', role: 'user' },
      { id: uuidv4(), email: 'robert.thomas@company.com', firstName: 'Robert', lastName: 'Thomas', role: 'user' },
      { id: uuidv4(), email: 'michelle.jackson@company.com', firstName: 'Michelle', lastName: 'Jackson', role: 'user' },
      { id: uuidv4(), email: 'william.white@company.com', firstName: 'William', lastName: 'White', role: 'manager' },
      { id: uuidv4(), email: 'amanda.harris@company.com', firstName: 'Amanda', lastName: 'Harris', role: 'user' },
      { id: uuidv4(), email: 'christopher.martin@company.com', firstName: 'Christopher', lastName: 'Martin', role: 'user' },
      { id: uuidv4(), email: 'stephanie.garcia@company.com', firstName: 'Stephanie', lastName: 'Garcia', role: 'user' },
      { id: uuidv4(), email: 'daniel.rodriguez@company.com', firstName: 'Daniel', lastName: 'Rodriguez', role: 'user' },
      { id: uuidv4(), email: 'nicole.lewis@company.com', firstName: 'Nicole', lastName: 'Lewis', role: 'user' },
    ];

    const passwordHash = await bcrypt.hash('password123', 10);

    for (const user of users) {
      await client.query(
        'INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [user.id, user.email, passwordHash, user.firstName, user.lastName, user.role, true]
      );
    }
    console.log('Created 16 users');

    // Create 16 Teams
    const teams = [
      { id: uuidv4(), name: 'Enterprise Sales', description: 'Large enterprise account team', plan: 'enterprise', price: 200 },
      { id: uuidv4(), name: 'SMB Outreach', description: 'Small and medium business team', plan: 'professional', price: 100 },
      { id: uuidv4(), name: 'Startup Division', description: 'Tech startup focused team', plan: 'starter', price: 50 },
      { id: uuidv4(), name: 'Healthcare Vertical', description: 'Healthcare industry specialists', plan: 'professional', price: 100 },
      { id: uuidv4(), name: 'Financial Services', description: 'Banking and finance sector', plan: 'enterprise', price: 200 },
      { id: uuidv4(), name: 'Technology Partners', description: 'Tech partnership development', plan: 'professional', price: 100 },
      { id: uuidv4(), name: 'Retail & E-commerce', description: 'Retail industry outreach', plan: 'professional', price: 100 },
      { id: uuidv4(), name: 'Manufacturing Sales', description: 'Industrial manufacturing clients', plan: 'starter', price: 50 },
      { id: uuidv4(), name: 'Education Sector', description: 'Schools and universities', plan: 'starter', price: 50 },
      { id: uuidv4(), name: 'Government Contracts', description: 'Public sector sales', plan: 'enterprise', price: 200 },
      { id: uuidv4(), name: 'Media & Entertainment', description: 'Media company outreach', plan: 'professional', price: 100 },
      { id: uuidv4(), name: 'Real Estate Division', description: 'Commercial real estate', plan: 'starter', price: 50 },
      { id: uuidv4(), name: 'Legal Services', description: 'Law firms and legal tech', plan: 'professional', price: 100 },
      { id: uuidv4(), name: 'Energy Sector', description: 'Oil, gas, and renewables', plan: 'enterprise', price: 200 },
      { id: uuidv4(), name: 'Hospitality Team', description: 'Hotels and travel industry', plan: 'starter', price: 50 },
      { id: uuidv4(), name: 'Telecommunications', description: 'Telecom providers', plan: 'professional', price: 100 },
    ];

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      await client.query(
        'INSERT INTO teams (id, name, description, owner_id, plan, monthly_price) VALUES ($1, $2, $3, $4, $5, $6)',
        [team.id, team.name, team.description, users[i % users.length].id, team.plan, team.price]
      );
    }
    console.log('Created 16 teams');

    // Create team members
    for (const team of teams) {
      const memberCount = Math.floor(Math.random() * 5) + 3;
      const shuffledUsers = [...users].sort(() => Math.random() - 0.5);
      for (let i = 0; i < memberCount; i++) {
        try {
          await client.query(
            'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [team.id, shuffledUsers[i].id, i === 0 ? 'owner' : 'member']
          );
        } catch (e) {}
      }
    }

    await client.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (team_id, user_id) DO UPDATE SET role = $3',
      [teams[0].id, users[0].id, 'owner']
    );
    console.log('Created team memberships');

    // Create 20 Contacts for main team
    const mainTeam = teams[0];
    const contacts = [
      { firstName: 'Alex', lastName: 'Thompson', email: 'alex.thompson@techcorp.com', company: 'TechCorp Inc', title: 'CTO', status: 'qualified', score: 85 },
      { firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@globalfin.com', company: 'GlobalFin', title: 'VP Sales', status: 'contacted', score: 72 },
      { firstName: 'Kevin', lastName: 'Chen', email: 'kevin.chen@innovate.io', company: 'Innovate.io', title: 'CEO', status: 'new', score: 90 },
      { firstName: 'Rachel', lastName: 'Green', email: 'rachel.green@megasoft.com', company: 'MegaSoft', title: 'Director of IT', status: 'qualified', score: 78 },
      { firstName: 'Tom', lastName: 'Baker', email: 'tom.baker@cloudnine.com', company: 'CloudNine', title: 'Head of Engineering', status: 'meeting_scheduled', score: 95 },
      { firstName: 'Jessica', lastName: 'Miller', email: 'jessica.miller@datadriven.co', company: 'DataDriven Co', title: 'COO', status: 'proposal_sent', score: 88 },
      { firstName: 'Brandon', lastName: 'Lee', email: 'brandon.lee@nexgen.tech', company: 'NexGen Tech', title: 'VP Engineering', status: 'negotiating', score: 92 },
      { firstName: 'Samantha', lastName: 'Wright', email: 'samantha.wright@quantum.ai', company: 'Quantum AI', title: 'CIO', status: 'won', score: 100 },
      { firstName: 'Marcus', lastName: 'Johnson', email: 'marcus.johnson@bluesky.net', company: 'BlueSky Networks', title: 'IT Director', status: 'contacted', score: 65 },
      { firstName: 'Olivia', lastName: 'Parker', email: 'olivia.parker@swiftly.com', company: 'Swiftly Inc', title: 'Product Manager', status: 'new', score: 55 },
      { firstName: 'Nathan', lastName: 'Scott', email: 'nathan.scott@primesolutions.com', company: 'Prime Solutions', title: 'CTO', status: 'qualified', score: 80 },
      { firstName: 'Victoria', lastName: 'Adams', email: 'victoria.adams@digitalhub.io', company: 'Digital Hub', title: 'CEO', status: 'meeting_scheduled', score: 87 },
      { firstName: 'Derek', lastName: 'Foster', email: 'derek.foster@alphawave.com', company: 'AlphaWave', title: 'Engineering Lead', status: 'contacted', score: 70 },
      { firstName: 'Christina', lastName: 'Ross', email: 'christina.ross@bytecraft.co', company: 'ByteCraft', title: 'VP Operations', status: 'proposal_sent', score: 83 },
      { firstName: 'Andrew', lastName: 'Mitchell', email: 'andrew.mitchell@corelogic.com', company: 'CoreLogic', title: 'Director', status: 'new', score: 60 },
      { firstName: 'Laura', lastName: 'Turner', email: 'laura.turner@synapse.tech', company: 'Synapse Tech', title: 'CTO', status: 'qualified', score: 76 },
      { firstName: 'Ryan', lastName: 'Collins', email: 'ryan.collins@vertex.io', company: 'Vertex.io', title: 'Head of Sales', status: 'won', score: 98 },
      { firstName: 'Megan', lastName: 'Stewart', email: 'megan.stewart@fusionlabs.com', company: 'Fusion Labs', title: 'CEO', status: 'negotiating', score: 91 },
      { firstName: 'Jason', lastName: 'Murphy', email: 'jason.murphy@techtitan.com', company: 'Tech Titan', title: 'VP Technology', status: 'contacted', score: 68 },
      { firstName: 'Ashley', lastName: 'Rivera', email: 'ashley.rivera@smartsys.co', company: 'SmartSys', title: 'IT Manager', status: 'new', score: 45 },
    ];

    const contactIds: string[] = [];
    for (const contact of contacts) {
      const id = uuidv4();
      contactIds.push(id);
      await client.query(
        `INSERT INTO contacts (id, team_id, email, first_name, last_name, company, job_title, status, lead_score, source, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, mainTeam.id, contact.email, contact.firstName, contact.lastName, contact.company, contact.title,
         contact.status, contact.score, 'LinkedIn', ['technology', 'enterprise']]
      );
    }
    console.log('Created 20 contacts');

    // Create 18 Email Templates
    const templates = [
      { name: 'Cold Outreach - Initial', subject: 'Quick question about {{company}}', body: 'Hi {{firstName}},\n\nI noticed {{company}} has been expanding rapidly. I wanted to reach out because we help companies like yours streamline their sales outreach with AI.\n\nWould you be open to a quick 15-minute call this week?\n\nBest,\n{{senderName}}', category: 'cold_outreach', aiGenerated: false },
      { name: 'Follow-up #1', subject: 'Following up on my previous email', body: 'Hi {{firstName}},\n\nI wanted to follow up on my previous email. I understand you\'re busy, but I believe our solution could save {{company}} significant time on outreach.\n\nWould Tuesday or Wednesday work for a brief call?\n\nBest,\n{{senderName}}', category: 'follow_up', aiGenerated: false },
      { name: 'Follow-up #2 - Value Add', subject: 'Thought you might find this useful', body: 'Hi {{firstName}},\n\nI came across this case study about how a company similar to {{company}} increased their response rates by 45%.\n\n[Link to case study]\n\nHappy to discuss how you could achieve similar results.\n\nBest,\n{{senderName}}', category: 'follow_up', aiGenerated: true },
      { name: 'Meeting Request', subject: 'Can we schedule 15 minutes?', body: 'Hi {{firstName}},\n\nBased on our previous conversation, I\'d love to show you a quick demo of how our AI can help {{company}} scale outreach.\n\nHere\'s my calendar link: [calendar]\n\nLooking forward to connecting!\n\nBest,\n{{senderName}}', category: 'meeting_request', aiGenerated: false },
      { name: 'Post-Demo Follow-up', subject: 'Great chatting with you!', body: 'Hi {{firstName}},\n\nThank you for taking the time to see our demo today. As discussed, I\'ve attached the pricing information for {{company}}.\n\nLet me know if you have any questions!\n\nBest,\n{{senderName}}', category: 'post_demo', aiGenerated: false },
      { name: 'Proposal Send', subject: 'Your custom proposal is ready', body: 'Hi {{firstName}},\n\nAs promised, please find attached the custom proposal for {{company}}.\n\nKey highlights:\n- 40% time savings on outreach\n- AI-powered personalization\n- Full analytics dashboard\n\nLet\'s schedule a call to discuss next steps.\n\nBest,\n{{senderName}}', category: 'proposal', aiGenerated: false },
      { name: 'AI Generated - Pain Point', subject: 'Solving {{company}}\'s outreach challenges', body: 'Hi {{firstName}},\n\nI\'ve been researching {{company}} and noticed you might be facing challenges with scaling personalized outreach.\n\nOur AI platform has helped similar companies:\n- Increase reply rates by 3x\n- Save 20+ hours per week\n- Book 40% more meetings\n\nWorth a conversation?\n\nBest,\n{{senderName}}', category: 'cold_outreach', aiGenerated: true },
      { name: 'Referral Request', subject: 'Quick favor to ask', body: 'Hi {{firstName}},\n\nI hope you\'ve been enjoying our platform! I was wondering if you know anyone else who might benefit from AI-powered sales outreach?\n\nWe offer a referral bonus for successful introductions.\n\nThanks!\n{{senderName}}', category: 'referral', aiGenerated: false },
      { name: 'Re-engagement', subject: 'It\'s been a while...', body: 'Hi {{firstName}},\n\nIt\'s been a few months since we last connected. I wanted to reach out because we\'ve added some exciting new features that might interest {{company}}.\n\nWould you like to see what\'s new?\n\nBest,\n{{senderName}}', category: 're_engagement', aiGenerated: false },
      { name: 'Event Invitation', subject: 'You\'re invited: Exclusive webinar', body: 'Hi {{firstName}},\n\nI\'d like to personally invite you to our upcoming webinar on "Scaling Sales with AI" on [date].\n\nYou\'ll learn:\n- How AI is transforming outreach\n- Best practices for personalization\n- Real ROI metrics from customers\n\nRegister here: [link]\n\nHope to see you there!\n{{senderName}}', category: 'event', aiGenerated: false },
      { name: 'Case Study Share', subject: 'How {{industry}} companies are winning with AI', body: 'Hi {{firstName}},\n\nI thought you might find this interesting - we just published a case study on how companies in your industry are using AI to transform their sales outreach.\n\nKey results:\n- 150% increase in qualified meetings\n- 60% reduction in time spent on email\n- 3x improvement in conversion rates\n\n[Link to case study]\n\nWould love to discuss how {{company}} could see similar results.\n\nBest,\n{{senderName}}', category: 'nurture', aiGenerated: true },
      { name: 'Pricing Follow-up', subject: 'Questions about pricing?', body: 'Hi {{firstName}},\n\nI wanted to follow up on the pricing information I sent over. Do you have any questions I can help clarify?\n\nI\'m also happy to discuss flexible payment options if that would help.\n\nLet me know your thoughts!\n\nBest,\n{{senderName}}', category: 'follow_up', aiGenerated: false },
      { name: 'Break-up Email', subject: 'Should I close your file?', body: 'Hi {{firstName}},\n\nI\'ve tried reaching out a few times but haven\'t heard back. I don\'t want to keep bothering you if the timing isn\'t right.\n\nShould I close your file for now? If things change in the future, feel free to reach out.\n\nAll the best,\n{{senderName}}', category: 'break_up', aiGenerated: false },
      { name: 'LinkedIn Connection Follow-up', subject: 'Great connecting on LinkedIn!', body: 'Hi {{firstName}},\n\nThanks for connecting on LinkedIn! I noticed you\'re the {{jobTitle}} at {{company}} - impressive work!\n\nI help companies like yours automate and personalize their sales outreach. Would you be interested in learning how?\n\nBest,\n{{senderName}}', category: 'cold_outreach', aiGenerated: false },
      { name: 'Product Update', subject: 'New feature you\'ll love', body: 'Hi {{firstName}},\n\nExciting news! We just launched a new feature that I think {{company}} will love - AI-powered A/B testing for email subject lines.\n\nOur beta users are seeing 25% higher open rates.\n\nWant to be one of the first to try it?\n\nBest,\n{{senderName}}', category: 'product_update', aiGenerated: false },
      { name: 'Renewal Reminder', subject: 'Your subscription is coming up', body: 'Hi {{firstName}},\n\nJust a friendly reminder that {{company}}\'s subscription will be renewing on [date].\n\nOver the past year, you\'ve:\n- Sent 10,000+ personalized emails\n- Booked 150+ meetings\n- Generated $500K in pipeline\n\nLet me know if you have any questions about renewal!\n\nBest,\n{{senderName}}', category: 'renewal', aiGenerated: false },
      { name: 'AI Competitor Comparison', subject: 'How we compare to [Competitor]', body: 'Hi {{firstName}},\n\nI understand {{company}} might be evaluating different solutions. I wanted to share a quick comparison of how we stack up against [Competitor].\n\nKey differences:\n- 2x more AI capabilities\n- Better deliverability rates\n- More affordable pricing\n\nWould a comparison call be helpful?\n\nBest,\n{{senderName}}', category: 'competitive', aiGenerated: true },
      { name: 'Thank You - Deal Closed', subject: 'Welcome to the family!', body: 'Hi {{firstName}},\n\nI\'m thrilled to officially welcome {{company}} to our customer family!\n\nYour dedicated Customer Success Manager, [CSM Name], will be reaching out shortly to schedule onboarding.\n\nThank you for your trust in us!\n\nBest,\n{{senderName}}', category: 'closed_won', aiGenerated: false },
    ];

    const templateIds: string[] = [];
    for (const template of templates) {
      const id = uuidv4();
      templateIds.push(id);
      await client.query(
        `INSERT INTO email_templates (id, team_id, name, subject, body, category, is_ai_generated, variables, open_rate, reply_rate, usage_count, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, mainTeam.id, template.name, template.subject, template.body, template.category, template.aiGenerated,
         ['firstName', 'lastName', 'company', 'jobTitle', 'senderName'],
         Math.random() * 40 + 20, Math.random() * 15 + 5, Math.floor(Math.random() * 500), users[0].id]
      );
    }
    console.log('Created 18 email templates');

    // Create 16 Campaigns
    const campaigns = [
      { name: 'Q1 Enterprise Push', description: 'Target enterprise accounts for Q1', status: 'active', type: 'outreach', contacts: 150, sent: 450, opened: 180, clicked: 90, replies: 45, meetings: 22, revenue: 125000 },
      { name: 'SMB Nurture Sequence', description: 'Nurture small business leads', status: 'active', type: 'nurture', contacts: 300, sent: 900, opened: 360, clicked: 180, replies: 90, meetings: 35, revenue: 75000 },
      { name: 'Product Launch Outreach', description: 'New product announcement', status: 'completed', type: 'announcement', contacts: 500, sent: 500, opened: 250, clicked: 125, replies: 60, meetings: 28, revenue: 95000 },
      { name: 'Re-engagement Campaign', description: 'Win back dormant leads', status: 'active', type: 're_engagement', contacts: 200, sent: 400, opened: 120, clicked: 48, replies: 24, meetings: 10, revenue: 35000 },
      { name: 'Healthcare Vertical Push', description: 'Target healthcare companies', status: 'active', type: 'outreach', contacts: 100, sent: 300, opened: 150, clicked: 75, replies: 38, meetings: 18, revenue: 85000 },
      { name: 'Financial Services Blitz', description: 'Banking and finance outreach', status: 'paused', type: 'outreach', contacts: 80, sent: 160, opened: 64, clicked: 32, replies: 16, meetings: 8, revenue: 45000 },
      { name: 'Webinar Promotion', description: 'Promote upcoming webinar', status: 'completed', type: 'event', contacts: 1000, sent: 1000, opened: 400, clicked: 200, replies: 50, meetings: 0, revenue: 0 },
      { name: 'Trial Conversion', description: 'Convert free trial users', status: 'active', type: 'conversion', contacts: 250, sent: 750, opened: 375, clicked: 188, replies: 94, meetings: 47, revenue: 120000 },
      { name: 'Partner Recruitment', description: 'Recruit new partners', status: 'active', type: 'partnership', contacts: 50, sent: 100, opened: 50, clicked: 25, replies: 15, meetings: 8, revenue: 0 },
      { name: 'Customer Referral', description: 'Ask for customer referrals', status: 'active', type: 'referral', contacts: 150, sent: 150, opened: 90, clicked: 45, replies: 30, meetings: 12, revenue: 55000 },
      { name: 'Tech Startup Outreach', description: 'Target funded startups', status: 'draft', type: 'outreach', contacts: 0, sent: 0, opened: 0, clicked: 0, replies: 0, meetings: 0, revenue: 0 },
      { name: 'Renewal Campaign', description: 'Upcoming renewal reminders', status: 'active', type: 'renewal', contacts: 75, sent: 75, opened: 60, clicked: 30, replies: 45, meetings: 20, revenue: 180000 },
      { name: 'Competitive Displacement', description: 'Target competitor customers', status: 'active', type: 'competitive', contacts: 120, sent: 240, opened: 96, clicked: 48, replies: 24, meetings: 12, revenue: 65000 },
      { name: 'LinkedIn Connector', description: 'Follow up on LinkedIn connections', status: 'active', type: 'social', contacts: 400, sent: 400, opened: 200, clicked: 100, replies: 80, meetings: 32, revenue: 88000 },
      { name: 'Case Study Distribution', description: 'Share new case studies', status: 'completed', type: 'nurture', contacts: 600, sent: 600, opened: 300, clicked: 150, replies: 45, meetings: 18, revenue: 42000 },
      { name: 'End of Year Push', description: 'Q4 budget push campaign', status: 'draft', type: 'outreach', contacts: 0, sent: 0, opened: 0, clicked: 0, replies: 0, meetings: 0, revenue: 0 },
    ];

    const campaignIds: string[] = [];
    for (const campaign of campaigns) {
      const id = uuidv4();
      campaignIds.push(id);
      await client.query(
        `INSERT INTO campaigns (id, team_id, name, description, status, type, total_contacts, emails_sent, emails_opened, emails_clicked, replies_received, meetings_booked, revenue_generated, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [id, mainTeam.id, campaign.name, campaign.description, campaign.status, campaign.type, campaign.contacts,
         campaign.sent, campaign.opened, campaign.clicked, campaign.replies, campaign.meetings, campaign.revenue, users[0].id]
      );
    }
    console.log('Created 16 campaigns');

    // Create campaign sequences
    for (let i = 0; i < 5; i++) {
      for (let step = 1; step <= 4; step++) {
        await client.query(
          `INSERT INTO campaign_sequences (campaign_id, template_id, step_number, delay_days)
           VALUES ($1, $2, $3, $4)`,
          [campaignIds[i], templateIds[(step - 1) % templateIds.length], step, step === 1 ? 0 : step * 2]
        );
      }
    }
    console.log('Created campaign sequences');

    // Create emails sent
    for (let i = 0; i < 50; i++) {
      const statuses = ['sent', 'opened', 'clicked', 'replied', 'bounced'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      await client.query(
        `INSERT INTO emails_sent (campaign_id, contact_id, template_id, subject, body, status, sent_at, opened_at, clicked_at, replied_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          campaignIds[Math.floor(Math.random() * 5)],
          contactIds[Math.floor(Math.random() * contactIds.length)],
          templateIds[Math.floor(Math.random() * templateIds.length)],
          'Sample Subject Line',
          'Sample email body content...',
          status,
          new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          status !== 'sent' && status !== 'bounced' ? new Date() : null,
          status === 'clicked' || status === 'replied' ? new Date() : null,
          status === 'replied' ? new Date() : null
        ]
      );
    }
    console.log('Created 50 sent emails');

    // Create 16 A/B Tests
    const abTests = [
      { name: 'Subject Line Test - Personalization', status: 'completed', winner: 'A' },
      { name: 'CTA Button Color Test', status: 'running', winner: null },
      { name: 'Email Length Test', status: 'completed', winner: 'B' },
      { name: 'Send Time Test - Morning vs Afternoon', status: 'running', winner: null },
      { name: 'Formal vs Casual Tone', status: 'completed', winner: 'A' },
      { name: 'With vs Without Social Proof', status: 'running', winner: null },
      { name: 'Question vs Statement Subject', status: 'completed', winner: 'B' },
      { name: 'Single vs Multiple CTAs', status: 'running', winner: null },
      { name: 'Plain Text vs HTML', status: 'completed', winner: 'A' },
      { name: 'First Name vs Full Name', status: 'running', winner: null },
      { name: 'Emoji in Subject Test', status: 'completed', winner: 'B' },
      { name: 'Video Thumbnail Test', status: 'running', winner: null },
      { name: 'Testimonial Placement', status: 'completed', winner: 'A' },
      { name: 'PS Line Test', status: 'running', winner: null },
      { name: 'Urgency Language Test', status: 'completed', winner: 'B' },
      { name: 'Industry-Specific Content', status: 'running', winner: null },
    ];

    for (const test of abTests) {
      const aSent = Math.floor(Math.random() * 500) + 100;
      const bSent = Math.floor(Math.random() * 500) + 100;
      await client.query(
        `INSERT INTO ab_tests (campaign_id, name, status, variant_a_template_id, variant_b_template_id, variant_a_sent, variant_b_sent, variant_a_opens, variant_b_opens, variant_a_replies, variant_b_replies, winner)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          campaignIds[Math.floor(Math.random() * campaignIds.length)],
          test.name,
          test.status,
          templateIds[0],
          templateIds[1],
          aSent,
          bSent,
          Math.floor(aSent * (Math.random() * 0.3 + 0.2)),
          Math.floor(bSent * (Math.random() * 0.3 + 0.2)),
          Math.floor(aSent * (Math.random() * 0.1 + 0.05)),
          Math.floor(bSent * (Math.random() * 0.1 + 0.05)),
          test.winner
        ]
      );
    }
    console.log('Created 16 A/B tests');

    // Create analytics data for last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      await client.query(
        `INSERT INTO analytics (team_id, date, emails_sent, emails_opened, emails_clicked, replies_received, meetings_booked, deals_closed, revenue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          mainTeam.id,
          date.toISOString().split('T')[0],
          Math.floor(Math.random() * 200) + 50,
          Math.floor(Math.random() * 100) + 20,
          Math.floor(Math.random() * 50) + 10,
          Math.floor(Math.random() * 30) + 5,
          Math.floor(Math.random() * 10) + 1,
          Math.floor(Math.random() * 3),
          Math.floor(Math.random() * 50000) + 5000
        ]
      );
    }
    console.log('Created 30 days of analytics');

    // Create 16 Integrations
    const integrations = [
      { name: 'Salesforce', type: 'crm', status: 'connected' },
      { name: 'HubSpot', type: 'crm', status: 'connected' },
      { name: 'Gmail', type: 'email', status: 'connected' },
      { name: 'Outlook', type: 'email', status: 'disconnected' },
      { name: 'LinkedIn Sales Navigator', type: 'social', status: 'connected' },
      { name: 'Slack', type: 'communication', status: 'connected' },
      { name: 'Calendly', type: 'calendar', status: 'connected' },
      { name: 'Zoom', type: 'meeting', status: 'connected' },
      { name: 'Zapier', type: 'automation', status: 'connected' },
      { name: 'Pipedrive', type: 'crm', status: 'disconnected' },
      { name: 'Mailchimp', type: 'marketing', status: 'disconnected' },
      { name: 'Intercom', type: 'support', status: 'connected' },
      { name: 'Stripe', type: 'payment', status: 'connected' },
      { name: 'Google Analytics', type: 'analytics', status: 'connected' },
      { name: 'Microsoft Teams', type: 'communication', status: 'disconnected' },
      { name: 'Clearbit', type: 'enrichment', status: 'connected' },
    ];

    for (const integration of integrations) {
      await client.query(
        `INSERT INTO integrations (team_id, name, type, status, last_sync_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [mainTeam.id, integration.name, integration.type, integration.status,
         integration.status === 'connected' ? new Date() : null]
      );
    }
    console.log('Created 16 integrations');

    // Create AI generations log
    const aiTypes = ['email_subject', 'email_body', 'personalization', 'follow_up', 'cold_outreach'];
    for (let i = 0; i < 20; i++) {
      await client.query(
        `INSERT INTO ai_generations (team_id, user_id, type, prompt, result, tokens_used)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          mainTeam.id,
          users[Math.floor(Math.random() * users.length)].id,
          aiTypes[Math.floor(Math.random() * aiTypes.length)],
          'Generate a compelling email for a tech company CTO',
          'AI generated content here...',
          Math.floor(Math.random() * 500) + 100
        ]
      );
    }
    console.log('Created 20 AI generations');

    // Create activity log
    const actions = ['email_sent', 'contact_added', 'campaign_created', 'template_used', 'meeting_booked', 'deal_closed', 'ai_generated', 'login', 'settings_updated'];
    for (let i = 0; i < 50; i++) {
      await client.query(
        `INSERT INTO activity_log (team_id, user_id, action, entity_type, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          mainTeam.id,
          users[Math.floor(Math.random() * users.length)].id,
          actions[Math.floor(Math.random() * actions.length)],
          'campaign',
          JSON.stringify({ ip: '192.168.1.1', browser: 'Chrome' })
        ]
      );
    }
    console.log('Created 50 activity log entries');

    // Create 16 Sequences
    const sequences = [
      { name: 'New Lead Nurture', description: 'Nurture new leads over 2 weeks', status: 'active', triggerType: 'manual', total: 150, active: 45, completed: 85, rate: 18.5 },
      { name: 'Enterprise Outreach', description: 'Multi-touch enterprise campaign', status: 'active', triggerType: 'manual', total: 80, active: 30, completed: 40, rate: 22.3 },
      { name: 'Re-engagement Series', description: 'Win back cold leads', status: 'active', triggerType: 'tag_added', total: 200, active: 60, completed: 120, rate: 12.8 },
      { name: 'Trial Conversion', description: 'Convert trial users to paid', status: 'active', triggerType: 'event', total: 100, active: 35, completed: 55, rate: 28.5 },
      { name: 'Post-Demo Follow-up', description: 'Follow up after product demo', status: 'active', triggerType: 'manual', total: 60, active: 20, completed: 35, rate: 35.2 },
      { name: 'Onboarding Welcome', description: 'Welcome new customers', status: 'active', triggerType: 'event', total: 90, active: 25, completed: 60, rate: 42.0 },
      { name: 'Renewal Reminder', description: 'Subscription renewal sequence', status: 'active', triggerType: 'date', total: 45, active: 15, completed: 28, rate: 85.0 },
      { name: 'Referral Request', description: 'Ask for customer referrals', status: 'paused', triggerType: 'manual', total: 120, active: 0, completed: 100, rate: 15.5 },
      { name: 'Event Invitation', description: 'Webinar/event promotion', status: 'completed', triggerType: 'manual', total: 500, active: 0, completed: 500, rate: 8.2 },
      { name: 'Product Update', description: 'New feature announcements', status: 'draft', triggerType: 'manual', total: 0, active: 0, completed: 0, rate: 0 },
      { name: 'Case Study Share', description: 'Share relevant case studies', status: 'active', triggerType: 'tag_added', total: 75, active: 25, completed: 45, rate: 20.0 },
      { name: 'Cold to Warm', description: 'Warm up cold prospects', status: 'active', triggerType: 'manual', total: 300, active: 100, completed: 180, rate: 10.5 },
      { name: 'Partner Outreach', description: 'Partnership development', status: 'active', triggerType: 'manual', total: 40, active: 15, completed: 20, rate: 25.0 },
      { name: 'Upsell Campaign', description: 'Upsell to existing customers', status: 'active', triggerType: 'event', total: 55, active: 20, completed: 30, rate: 32.0 },
      { name: 'Competitive Win-back', description: 'Win back from competitors', status: 'paused', triggerType: 'manual', total: 80, active: 0, completed: 65, rate: 8.5 },
      { name: 'Holiday Campaign', description: 'Seasonal promotions', status: 'draft', triggerType: 'date', total: 0, active: 0, completed: 0, rate: 0 },
    ];

    const sequenceIds: string[] = [];
    for (const seq of sequences) {
      const id = uuidv4();
      sequenceIds.push(id);
      await client.query(
        `INSERT INTO sequences (id, team_id, name, description, status, trigger_type, total_contacts, active_contacts, completed_contacts, conversion_rate, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, mainTeam.id, seq.name, seq.description, seq.status, seq.triggerType, seq.total, seq.active, seq.completed, seq.rate, users[0].id]
      );
    }
    console.log('Created 16 sequences');

    // Create sequence steps
    for (let i = 0; i < sequenceIds.length; i++) {
      const stepCount = Math.floor(Math.random() * 3) + 3;
      for (let step = 1; step <= stepCount; step++) {
        await client.query(
          `INSERT INTO sequence_steps (sequence_id, step_number, step_type, template_id, delay_days, delay_hours, sent_count, open_count, reply_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            sequenceIds[i],
            step,
            'email',
            templateIds[(step - 1) % templateIds.length],
            step === 1 ? 0 : step * 2,
            0,
            Math.floor(Math.random() * 100) + 20,
            Math.floor(Math.random() * 50) + 10,
            Math.floor(Math.random() * 20) + 2
          ]
        );
      }
    }
    console.log('Created sequence steps');

    // Create 18 Meetings
    const meetings = [
      { title: 'Discovery Call - TechCorp', type: 'discovery', status: 'completed', outcome: 'positive', revenue: 50000 },
      { title: 'Product Demo - GlobalFin', type: 'demo', status: 'completed', outcome: 'positive', revenue: 75000 },
      { title: 'Pricing Discussion - Innovate.io', type: 'negotiation', status: 'scheduled', outcome: null, revenue: 120000 },
      { title: 'Technical Review - MegaSoft', type: 'technical', status: 'scheduled', outcome: null, revenue: 45000 },
      { title: 'Contract Review - CloudNine', type: 'closing', status: 'completed', outcome: 'positive', revenue: 95000 },
      { title: 'Intro Call - DataDriven', type: 'discovery', status: 'completed', outcome: 'neutral', revenue: 30000 },
      { title: 'Feature Walkthrough - NexGen', type: 'demo', status: 'scheduled', outcome: null, revenue: 60000 },
      { title: 'Executive Briefing - Quantum AI', type: 'executive', status: 'scheduled', outcome: null, revenue: 200000 },
      { title: 'Onboarding Kickoff - BlueSky', type: 'onboarding', status: 'completed', outcome: 'positive', revenue: 0 },
      { title: 'QBR Meeting - Swiftly', type: 'review', status: 'scheduled', outcome: null, revenue: 0 },
      { title: 'Partnership Discussion - Prime', type: 'partnership', status: 'completed', outcome: 'positive', revenue: 0 },
      { title: 'Support Escalation - DigitalHub', type: 'support', status: 'completed', outcome: 'neutral', revenue: 0 },
      { title: 'Renewal Discussion - AlphaWave', type: 'renewal', status: 'scheduled', outcome: null, revenue: 85000 },
      { title: 'Expansion Talk - ByteCraft', type: 'upsell', status: 'completed', outcome: 'positive', revenue: 40000 },
      { title: 'Initial Meeting - CoreLogic', type: 'discovery', status: 'cancelled', outcome: null, revenue: 55000 },
      { title: 'Demo Follow-up - Synapse', type: 'follow_up', status: 'scheduled', outcome: null, revenue: 70000 },
      { title: 'Security Review - Vertex', type: 'technical', status: 'completed', outcome: 'positive', revenue: 90000 },
      { title: 'Budget Discussion - FusionLabs', type: 'negotiation', status: 'scheduled', outcome: null, revenue: 110000 },
    ];

    for (let i = 0; i < meetings.length; i++) {
      const m = meetings[i];
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + (i - 8));
      scheduledDate.setHours(9 + (i % 8), 0, 0, 0);

      await client.query(
        `INSERT INTO meetings (team_id, contact_id, user_id, title, meeting_type, status, scheduled_at, duration_minutes, meeting_link, outcome, revenue_potential)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          mainTeam.id,
          contactIds[i % contactIds.length],
          users[i % 5].id,
          m.title,
          m.type,
          m.status,
          scheduledDate,
          30 + (i % 3) * 15,
          `https://zoom.us/j/${Math.random().toString().slice(2, 12)}`,
          m.outcome,
          m.revenue
        ]
      );
    }
    console.log('Created 18 meetings');

    // Create 20 Tasks
    const tasksList = [
      { title: 'Follow up with TechCorp CTO', type: 'follow_up', priority: 'high', status: 'pending' },
      { title: 'Send pricing proposal to GlobalFin', type: 'proposal', priority: 'high', status: 'in_progress' },
      { title: 'Research Innovate.io competitors', type: 'research', priority: 'medium', status: 'pending' },
      { title: 'Update contact info for MegaSoft', type: 'data_update', priority: 'low', status: 'completed' },
      { title: 'Prepare demo for CloudNine', type: 'demo_prep', priority: 'high', status: 'completed' },
      { title: 'Send case study to DataDriven', type: 'content', priority: 'medium', status: 'pending' },
      { title: 'Schedule technical call with NexGen', type: 'scheduling', priority: 'medium', status: 'in_progress' },
      { title: 'Review contract terms - Quantum', type: 'contract', priority: 'high', status: 'pending' },
      { title: 'Onboard BlueSky Networks team', type: 'onboarding', priority: 'high', status: 'in_progress' },
      { title: 'Quarterly review prep - Swiftly', type: 'review_prep', priority: 'medium', status: 'pending' },
      { title: 'Partner agreement draft - Prime', type: 'contract', priority: 'medium', status: 'completed' },
      { title: 'Resolve support ticket - DigitalHub', type: 'support', priority: 'high', status: 'completed' },
      { title: 'Send renewal reminder - AlphaWave', type: 'renewal', priority: 'high', status: 'pending' },
      { title: 'Upsell proposal for ByteCraft', type: 'proposal', priority: 'medium', status: 'pending' },
      { title: 'Re-engage CoreLogic contact', type: 'follow_up', priority: 'low', status: 'pending' },
      { title: 'Technical documentation - Synapse', type: 'documentation', priority: 'low', status: 'in_progress' },
      { title: 'Security questionnaire - Vertex', type: 'compliance', priority: 'high', status: 'completed' },
      { title: 'Budget approval follow-up - Fusion', type: 'follow_up', priority: 'high', status: 'pending' },
      { title: 'Weekly pipeline review', type: 'internal', priority: 'medium', status: 'pending' },
      { title: 'Update CRM records', type: 'data_update', priority: 'low', status: 'pending' },
    ];

    for (let i = 0; i < tasksList.length; i++) {
      const t = tasksList[i];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (i - 5));

      await client.query(
        `INSERT INTO tasks (team_id, user_id, assigned_to, contact_id, title, task_type, priority, status, due_date, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          mainTeam.id,
          users[0].id,
          users[i % 5].id,
          i < contactIds.length ? contactIds[i] : null,
          t.title,
          t.type,
          t.priority,
          t.status,
          dueDate,
          t.status === 'completed' ? new Date() : null
        ]
      );
    }
    console.log('Created 20 tasks');

    // Create 25 Notifications
    const notificationTypes = [
      { type: 'email_opened', title: 'Email Opened', message: 'Your email to Alex Thompson was opened' },
      { type: 'email_replied', title: 'New Reply', message: 'Maria Santos replied to your email' },
      { type: 'meeting_scheduled', title: 'Meeting Scheduled', message: 'New meeting with Kevin Chen at 2:00 PM' },
      { type: 'meeting_reminder', title: 'Meeting Reminder', message: 'Meeting with Rachel Green in 30 minutes' },
      { type: 'task_assigned', title: 'Task Assigned', message: 'You have been assigned a new task' },
      { type: 'task_due', title: 'Task Due Soon', message: 'Task "Follow up with TechCorp" is due today' },
      { type: 'deal_won', title: 'Deal Won!', message: 'Congratulations! CloudNine deal closed for $95,000' },
      { type: 'campaign_completed', title: 'Campaign Completed', message: 'Product Launch Outreach campaign finished' },
      { type: 'lead_score_change', title: 'Hot Lead Alert', message: 'Tom Baker lead score increased to 95' },
      { type: 'integration_sync', title: 'Sync Complete', message: 'Salesforce sync completed successfully' },
      { type: 'ai_suggestion', title: 'AI Insight', message: 'Try sending emails at 10 AM for better open rates' },
      { type: 'quota_warning', title: 'Quota Alert', message: 'You have reached 80% of your monthly email quota' },
      { type: 'team_update', title: 'Team Update', message: 'Sarah Johnson joined your team' },
      { type: 'report_ready', title: 'Report Ready', message: 'Your weekly performance report is ready' },
      { type: 'sequence_completed', title: 'Sequence Completed', message: 'Contact completed the nurture sequence' },
    ];

    for (let i = 0; i < 25; i++) {
      const n = notificationTypes[i % notificationTypes.length];
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - i * 2);

      await client.query(
        `INSERT INTO notifications (team_id, user_id, type, title, message, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          mainTeam.id,
          users[0].id,
          n.type,
          n.title,
          n.message,
          i > 5,
          createdAt
        ]
      );
    }
    console.log('Created 25 notifications');

    // Create 15 Reports
    const reports = [
      { name: 'Weekly Campaign Performance', type: 'campaign_performance', range: 'last_7_days' },
      { name: 'Monthly Email Analytics', type: 'email_analytics', range: 'last_30_days' },
      { name: 'Q4 Team Performance', type: 'team_performance', range: 'last_90_days' },
      { name: 'Contact Engagement Report', type: 'contact_engagement', range: 'last_30_days' },
      { name: 'Revenue Summary - November', type: 'revenue_summary', range: 'custom' },
      { name: 'Pipeline Analysis', type: 'campaign_performance', range: 'last_30_days' },
      { name: 'Email Deliverability Report', type: 'email_analytics', range: 'last_7_days' },
      { name: 'Sales Rep Leaderboard', type: 'team_performance', range: 'last_30_days' },
      { name: 'Lead Source Analysis', type: 'contact_engagement', range: 'last_90_days' },
      { name: 'Q3 Revenue Review', type: 'revenue_summary', range: 'custom' },
      { name: 'A/B Test Results Summary', type: 'campaign_performance', range: 'last_30_days' },
      { name: 'Sequence Performance', type: 'email_analytics', range: 'last_14_days' },
      { name: 'Monthly Activity Report', type: 'team_performance', range: 'last_30_days' },
      { name: 'Hot Leads Report', type: 'contact_engagement', range: 'last_7_days' },
      { name: 'YTD Revenue Summary', type: 'revenue_summary', range: 'year_to_date' },
    ];

    for (const r of reports) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30));

      await client.query(
        `INSERT INTO reports (team_id, created_by, name, report_type, date_range, data, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'completed')`,
        [
          mainTeam.id,
          users[Math.floor(Math.random() * 3)].id,
          r.name,
          r.type,
          r.range,
          JSON.stringify({ generatedAt: createdAt, summary: 'Report data placeholder' })
        ]
      );
    }
    console.log('Created 15 reports');

    // ==================== AI LEAD SCORES (16 items) ====================
    const leadScores = [
      { score: 95, confidence: 92.5, engagement: 'hot', signals: ['Requested demo', 'Multiple page views', 'Downloaded whitepaper'], risks: ['Budget approval pending'], action: 'Schedule discovery call immediately', closeDate: '2024-02-15', value: 75000 },
      { score: 88, confidence: 85.0, engagement: 'hot', signals: ['Replied to email', 'Visited pricing page'], risks: ['Competitor evaluation'], action: 'Send case study', closeDate: '2024-02-28', value: 45000 },
      { score: 82, confidence: 78.5, engagement: 'warm', signals: ['Opened 3 emails', 'LinkedIn connection'], risks: ['Long decision cycle'], action: 'Follow up with value proposition', closeDate: '2024-03-10', value: 55000 },
      { score: 78, confidence: 80.0, engagement: 'warm', signals: ['Webinar attendance', 'Blog subscriber'], risks: ['Multiple stakeholders'], action: 'Identify decision makers', closeDate: '2024-03-15', value: 35000 },
      { score: 75, confidence: 72.5, engagement: 'warm', signals: ['Form submission', 'Email click'], risks: ['Budget constraints'], action: 'Share ROI calculator', closeDate: '2024-03-20', value: 28000 },
      { score: 72, confidence: 70.0, engagement: 'warm', signals: ['Product page visit', 'Chatbot interaction'], risks: ['Timeline unclear'], action: 'Qualify timeline', closeDate: '2024-03-25', value: 40000 },
      { score: 68, confidence: 65.5, engagement: 'engaged', signals: ['Newsletter open', 'Social media follow'], risks: ['Low engagement recently'], action: 'Re-engage with relevant content', closeDate: '2024-04-01', value: 32000 },
      { score: 65, confidence: 62.0, engagement: 'engaged', signals: ['Website visit', 'Email open'], risks: ['Competition awareness'], action: 'Send competitive comparison', closeDate: '2024-04-05', value: 25000 },
      { score: 62, confidence: 58.5, engagement: 'engaged', signals: ['LinkedIn profile view', 'Content download'], risks: ['Decision maker not identified'], action: 'Map org structure', closeDate: '2024-04-10', value: 38000 },
      { score: 58, confidence: 55.0, engagement: 'cool', signals: ['Single email open'], risks: ['Low engagement', 'Unclear need'], action: 'Nurture with educational content', closeDate: '2024-04-20', value: 22000 },
      { score: 55, confidence: 52.5, engagement: 'cool', signals: ['Referred by partner'], risks: ['Early stage exploration'], action: 'Provide industry insights', closeDate: '2024-04-25', value: 30000 },
      { score: 52, confidence: 50.0, engagement: 'cool', signals: ['Trade show scan'], risks: ['No follow-up response'], action: 'Send personalized follow-up', closeDate: '2024-05-01', value: 18000 },
      { score: 48, confidence: 45.5, engagement: 'cold', signals: ['Cold list import'], risks: ['No engagement history'], action: 'Start nurture sequence', closeDate: '2024-05-15', value: 15000 },
      { score: 45, confidence: 42.0, engagement: 'cold', signals: ['Outdated contact'], risks: ['Data quality issues'], action: 'Verify contact info', closeDate: '2024-05-20', value: 12000 },
      { score: 42, confidence: 38.5, engagement: 'cold', signals: ['Bounced email recovered'], risks: ['Historical unsubscribe'], action: 'Careful re-engagement', closeDate: '2024-06-01', value: 20000 },
      { score: 38, confidence: 35.0, engagement: 'cold', signals: ['Minimal activity'], risks: ['Possible bad fit'], action: 'Qualify fit before pursuing', closeDate: '2024-06-15', value: 10000 },
    ];

    for (let i = 0; i < leadScores.length; i++) {
      const ls = leadScores[i];
      await client.query(
        `INSERT INTO ai_lead_scores (team_id, contact_id, score, confidence, factors, ai_analysis, recommendation,
          engagement_level, buying_signals, risk_factors, next_best_action, predicted_close_date, predicted_deal_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [mainTeam.id, contactIds[i % contactIds.length], ls.score, ls.confidence,
         JSON.stringify({ engagement: ls.engagement, signals: ls.signals, risks: ls.risks }),
         `Lead shows ${ls.engagement} engagement with ${ls.signals.length} positive signals. ${ls.risks.join('. ')} are potential concerns.`,
         ls.action, ls.engagement, ls.signals, ls.risks, ls.action, ls.closeDate, ls.value]
      );
    }
    console.log('Created 16 AI lead scores');

    // ==================== AI PERSONALIZATIONS (16 items) ====================
    const personalizations = [
      { type: 'email', tone: 'professional', industry: 'Technology', original: 'Hi, I wanted to reach out about our product.', personalized: 'Hi Alex, I noticed TechCorp recently expanded their engineering team. Our AI-powered platform could help your growing team scale outreach while maintaining quality. Would you be open to a quick chat?', confidence: 92 },
      { type: 'email', tone: 'casual', industry: 'Finance', original: 'Let me share how we can help.', personalized: 'Hey Maria, saw GlobalFin is crushing it in the fintech space! We work with similar fast-moving finance teams to automate their sales outreach. Thought it might be worth connecting.', confidence: 88 },
      { type: 'email', tone: 'consultative', industry: 'SaaS', original: 'Our solution can benefit your company.', personalized: 'Kevin, as a CEO at Innovate.io, you likely face the challenge of scaling sales without losing the personal touch. Our AI helps maintain personalization at scale - something early-stage companies often struggle with.', confidence: 85 },
      { type: 'linkedin', tone: 'professional', industry: 'Enterprise', original: 'Connection request message.', personalized: 'Rachel, your recent article on digital transformation in enterprise IT was insightful. I work with IT Directors to modernize their sales tech stack. Would love to connect.', confidence: 90 },
      { type: 'email', tone: 'urgent', industry: 'E-commerce', original: 'Time-sensitive offer for you.', personalized: 'Tom, Q4 is approaching fast. CloudNine could leverage our platform to maximize holiday outreach efficiency. Companies in your space typically see 40% more responses with our AI. Worth 15 minutes?', confidence: 78 },
      { type: 'follow_up', tone: 'persistent', industry: 'Healthcare', original: 'Following up on my previous email.', personalized: 'Jessica, I know healthcare companies like DataDriven have strict compliance needs. I wanted to follow up and mention our SOC2 certification and HIPAA-compliant features that address exactly these concerns.', confidence: 82 },
      { type: 'email', tone: 'value_focused', industry: 'Manufacturing', original: 'Save time with automation.', personalized: 'Brandon, manufacturing VP engineers typically spend 8+ hours weekly on outreach. Our AI reduces that to 2 hours while improving response rates. NexGen could reinvest that time in product development.', confidence: 86 },
      { type: 'email', tone: 'professional', industry: 'AI/ML', original: 'AI-powered solution for your team.', personalized: 'Samantha, as Quantum AI\'s CIO, you understand AI capabilities better than most. Our platform uses similar transformer models you likely appreciate for nuanced personalization that actually works.', confidence: 94 },
      { type: 'cold_outreach', tone: 'curious', industry: 'Networking', original: 'Quick question about your process.', personalized: 'Marcus, curious how BlueSky Networks handles outreach at scale? We\'ve helped networking companies reduce manual work by 70% while increasing qualified meetings. Would love to learn about your current approach.', confidence: 75 },
      { type: 'email', tone: 'friendly', industry: 'Startup', original: 'Helping startups grow faster.', personalized: 'Olivia, Swiftly is at that exciting stage where every efficiency gain matters. Our startup-friendly pricing and quick implementation could help your team punch above its weight in sales.', confidence: 80 },
      { type: 'meeting_request', tone: 'direct', industry: 'Technology', original: 'Can we schedule a call?', personalized: 'Nathan, would 15 minutes next Tuesday work to discuss how Prime Solutions could automate 80% of initial outreach? I\'ll come prepared with specific ideas for your tech stack.', confidence: 88 },
      { type: 'email', tone: 'empathetic', industry: 'Consulting', original: 'Understanding your challenges.', personalized: 'Victoria, running Digital Hub means wearing many hats. Our AI handles the tedious parts of sales outreach so you can focus on what CEOs do best - building relationships and closing deals.', confidence: 83 },
      { type: 'email', tone: 'data_driven', industry: 'Analytics', original: 'Results-focused solution.', personalized: 'Derek, AlphaWave engineering leads typically love data. Here\'s what we\'ve measured: 3.2x reply rates, 45% less time on outreach, 28% more meetings. Happy to show you the methodology.', confidence: 91 },
      { type: 'linkedin', tone: 'professional', industry: 'Operations', original: 'Professional connection.', personalized: 'Christina, ByteCraft\'s focus on operational excellence aligns perfectly with our mission. Our platform helps VP Ops like yourself systematize and scale sales processes efficiently.', confidence: 79 },
      { type: 'email', tone: 'consultative', industry: 'Enterprise', original: 'Enterprise solution overview.', personalized: 'Andrew, CoreLogic Directors face unique challenges balancing enterprise requirements with modern tools. Our platform offers enterprise-grade security with startup-level ease of use.', confidence: 84 },
      { type: 'email', tone: 'technical', industry: 'Technology', original: 'Technical product details.', personalized: 'Laura, as Synapse Tech\'s CTO, you\'ll appreciate that our AI uses fine-tuned LLMs with <50ms latency. Our API-first approach means seamless integration with your existing stack.', confidence: 89 },
    ];

    for (let i = 0; i < personalizations.length; i++) {
      const p = personalizations[i];
      await client.query(
        `INSERT INTO ai_personalizations (team_id, contact_id, personalization_type, original_content, personalized_content,
          personalization_factors, tone, industry_context, company_insights, role_specific_points, pain_points,
          value_propositions, ai_confidence, engagement_prediction)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [mainTeam.id, contactIds[i % contactIds.length], p.type, p.original, p.personalized,
         JSON.stringify({ industry: true, role: true, company: true, timing: false }),
         p.tone, `${p.industry} sector insights applied`, 'Company research incorporated',
         ['Role-specific pain points addressed', 'Industry terminology used'],
         ['Time management', 'Scale challenges', 'Efficiency needs'],
         ['40% time savings', 'Higher response rates', 'Easy integration'],
         p.confidence, p.confidence - 5]
      );
    }
    console.log('Created 16 AI personalizations');

    // ==================== AI BEST TIMES (16 items) ====================
    const bestTimes = [
      { day: 'Tuesday', start: '09:00', end: '11:00', tz: 'America/New_York', confidence: 92, frequency: 'Every 3-4 days', avoid: ['Monday mornings', 'Friday afternoons'], insight: 'Tech executives check emails early Tuesday' },
      { day: 'Wednesday', start: '10:00', end: '12:00', tz: 'America/Chicago', confidence: 88, frequency: 'Every 4-5 days', avoid: ['Weekend', 'Late evenings'], insight: 'Finance professionals prefer mid-week contact' },
      { day: 'Tuesday', start: '14:00', end: '16:00', tz: 'America/Los_Angeles', confidence: 85, frequency: 'Every 3 days', avoid: ['Early mornings', 'After 5pm'], insight: 'West coast responds better in afternoon' },
      { day: 'Thursday', start: '08:00', end: '10:00', tz: 'America/New_York', confidence: 90, frequency: 'Every 4 days', avoid: ['Lunch hours', 'Meeting blocks'], insight: 'Enterprise buyers start early Thursday' },
      { day: 'Wednesday', start: '11:00', end: '13:00', tz: 'Europe/London', confidence: 82, frequency: 'Every 5 days', avoid: ['Bank holidays', 'August'], insight: 'UK contacts prefer late morning' },
      { day: 'Tuesday', start: '15:00', end: '17:00', tz: 'America/Denver', confidence: 86, frequency: 'Every 3-4 days', avoid: ['Monday', 'Friday PM'], insight: 'Mountain time zone afternoon optimal' },
      { day: 'Thursday', start: '09:30', end: '11:30', tz: 'America/New_York', confidence: 91, frequency: 'Every 4 days', avoid: ['Board meeting days', 'Month-end'], insight: 'CTOs available Thursday mornings' },
      { day: 'Monday', start: '14:00', end: '16:00', tz: 'America/Chicago', confidence: 78, frequency: 'Every 5 days', avoid: ['Morning catch-up', 'Weekend'], insight: 'Some prefer Monday afternoon fresh start' },
      { day: 'Wednesday', start: '09:00', end: '11:00', tz: 'Asia/Singapore', confidence: 84, frequency: 'Every 4 days', avoid: ['Lunar holidays', 'After 6pm'], insight: 'APAC morning engagement high' },
      { day: 'Friday', start: '10:00', end: '12:00', tz: 'America/New_York', confidence: 72, frequency: 'Every 5-6 days', avoid: ['Afternoon', 'Summer Fridays'], insight: 'Friday morning for quick decisions' },
      { day: 'Tuesday', start: '08:30', end: '10:30', tz: 'America/New_York', confidence: 89, frequency: 'Every 3 days', avoid: ['Standup times', 'Late day'], insight: 'Early birds respond before meetings' },
      { day: 'Wednesday', start: '13:00', end: '15:00', tz: 'America/Los_Angeles', confidence: 80, frequency: 'Every 4 days', avoid: ['Lunch', 'End of day'], insight: 'Post-lunch focus time works well' },
      { day: 'Thursday', start: '10:00', end: '12:00', tz: 'Europe/Berlin', confidence: 87, frequency: 'Every 4-5 days', avoid: ['German holidays', 'August'], insight: 'DACH region mid-morning optimal' },
      { day: 'Tuesday', start: '11:00', end: '13:00', tz: 'America/Chicago', confidence: 83, frequency: 'Every 3-4 days', avoid: ['Early AM', 'End of week'], insight: 'Midwest professionals prefer late morning' },
      { day: 'Wednesday', start: '14:00', end: '16:00', tz: 'America/New_York', confidence: 81, frequency: 'Every 4 days', avoid: ['Quarterly close', 'Holidays'], insight: 'Mid-week afternoon for follow-ups' },
      { day: 'Thursday', start: '09:00', end: '11:00', tz: 'Australia/Sydney', confidence: 76, frequency: 'Every 5 days', avoid: ['AEST evening', 'Public holidays'], insight: 'ANZ morning window important' },
    ];

    for (let i = 0; i < bestTimes.length; i++) {
      const bt = bestTimes[i];
      await client.query(
        `INSERT INTO ai_best_times (team_id, contact_id, best_day, best_time_start, best_time_end, timezone,
          confidence, historical_data, ai_reasoning, engagement_patterns, optimal_frequency, avoid_times, industry_insights)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [mainTeam.id, contactIds[i % contactIds.length], bt.day, bt.start, bt.end, bt.tz, bt.confidence,
         JSON.stringify({ opensHistory: [bt.start], repliesHistory: [bt.start] }),
         bt.insight, JSON.stringify({ morning: 60, afternoon: 40, evening: 10 }),
         bt.frequency, bt.avoid, bt.insight]
      );
    }
    console.log('Created 16 AI best times');

    // ==================== AI OBJECTIONS (16 items) ====================
    const objections = [
      { type: 'price', text: 'Your solution is too expensive for our budget.', strategy: 'Value reframe - focus on ROI', success: 72, industry: 'General', persona: 'Decision Maker' },
      { type: 'timing', text: 'We\'re not ready to make a change right now.', strategy: 'Create urgency with opportunity cost', success: 65, industry: 'Technology', persona: 'VP' },
      { type: 'competitor', text: 'We\'re already using a competitor\'s solution.', strategy: 'Highlight unique differentiators', success: 58, industry: 'SaaS', persona: 'IT Director' },
      { type: 'authority', text: 'I need to check with my team/boss first.', strategy: 'Offer to include stakeholders', success: 70, industry: 'Enterprise', persona: 'Manager' },
      { type: 'need', text: 'We don\'t really need this right now.', strategy: 'Uncover hidden pain points', success: 55, industry: 'General', persona: 'Decision Maker' },
      { type: 'trust', text: 'I\'ve never heard of your company before.', strategy: 'Provide social proof and references', success: 68, industry: 'General', persona: 'Executive' },
      { type: 'complexity', text: 'This seems too complicated to implement.', strategy: 'Simplify and offer support', success: 75, industry: 'Enterprise', persona: 'IT' },
      { type: 'contract', text: 'We\'re locked into a contract with another vendor.', strategy: 'Discuss transition timing', success: 52, industry: 'Technology', persona: 'Procurement' },
      { type: 'resources', text: 'We don\'t have the bandwidth to implement this.', strategy: 'Offer implementation support', success: 78, industry: 'SMB', persona: 'Owner' },
      { type: 'roi', text: 'I\'m not convinced about the ROI.', strategy: 'Share case studies with metrics', success: 73, industry: 'Finance', persona: 'CFO' },
      { type: 'features', text: 'You\'re missing a feature we need.', strategy: 'Discuss roadmap or workarounds', success: 60, industry: 'Technology', persona: 'Product' },
      { type: 'status_quo', text: 'Our current process works fine.', strategy: 'Quantify improvement potential', success: 48, industry: 'General', persona: 'Operations' },
      { type: 'risk', text: 'What if this doesn\'t work for us?', strategy: 'Offer trial or guarantee', success: 82, industry: 'Enterprise', persona: 'Executive' },
      { type: 'priority', text: 'We have other priorities right now.', strategy: 'Align with their top priorities', success: 55, industry: 'General', persona: 'Director' },
      { type: 'approval', text: 'I need to get this approved by the board.', strategy: 'Provide executive summary', success: 62, industry: 'Enterprise', persona: 'C-Level' },
      { type: 'satisfied', text: 'We\'re satisfied with what we have.', strategy: 'Uncover improvement opportunities', success: 45, industry: 'General', persona: 'Manager' },
    ];

    for (const obj of objections) {
      await client.query(
        `INSERT INTO ai_objections (team_id, objection_type, objection_text, response_strategy, response_templates,
          confidence, success_rate, use_count, industry, buyer_persona, related_objections, follow_up_questions, ai_insights)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [mainTeam.id, obj.type, obj.text, obj.strategy,
         JSON.stringify([
           { approach: 'Empathetic', response: `I understand your concern about ${obj.type}. Let me address that...`, tone: 'empathetic', effectiveness: obj.success },
           { approach: 'Value-based', response: `When you consider the value we provide regarding ${obj.type}...`, tone: 'consultative', effectiveness: obj.success - 5 },
           { approach: 'Question-based', response: `Help me understand - what would make you feel comfortable about ${obj.type}?`, tone: 'curious', effectiveness: obj.success - 10 }
         ]),
         85 + Math.random() * 10, obj.success, Math.floor(Math.random() * 50) + 5, obj.industry, obj.persona,
         [`Similar to ${obj.type}`, 'Follow-up needed'], ['What would change your mind?', 'Who else should we include?'],
         `${obj.type} objections typically indicate ${obj.strategy.toLowerCase()}. Success rate: ${obj.success}%.`]
      );
    }
    console.log('Created 16 AI objections');

    // ==================== AI PIPELINE FORECASTS (16 items) ====================
    const forecasts = [
      { period: 'Q1 2024', revenue: 450000, deals: 12, confidence: 82, health: 'Healthy', best: 580000, likely: 450000, worst: 320000 },
      { period: 'Q2 2024', revenue: 520000, deals: 15, confidence: 75, health: 'Growing', best: 680000, likely: 520000, worst: 380000 },
      { period: 'Q3 2024', revenue: 380000, deals: 10, confidence: 68, health: 'At Risk', best: 480000, likely: 380000, worst: 250000 },
      { period: 'Q4 2024', revenue: 620000, deals: 18, confidence: 72, health: 'Strong', best: 800000, likely: 620000, worst: 450000 },
      { period: 'January 2024', revenue: 145000, deals: 4, confidence: 88, health: 'Healthy', best: 180000, likely: 145000, worst: 110000 },
      { period: 'February 2024', revenue: 165000, deals: 5, confidence: 85, health: 'Growing', best: 210000, likely: 165000, worst: 125000 },
      { period: 'March 2024', revenue: 140000, deals: 4, confidence: 78, health: 'Stable', best: 175000, likely: 140000, worst: 100000 },
      { period: 'H1 2024', revenue: 880000, deals: 25, confidence: 76, health: 'Healthy', best: 1100000, likely: 880000, worst: 650000 },
      { period: 'H2 2024', revenue: 1020000, deals: 30, confidence: 65, health: 'Optimistic', best: 1350000, likely: 1020000, worst: 720000 },
      { period: 'FY 2024', revenue: 1900000, deals: 55, confidence: 60, health: 'On Track', best: 2400000, likely: 1900000, worst: 1400000 },
      { period: 'Next 30 Days', revenue: 95000, deals: 3, confidence: 92, health: 'Strong', best: 120000, likely: 95000, worst: 75000 },
      { period: 'Next 60 Days', revenue: 185000, deals: 6, confidence: 85, health: 'Healthy', best: 230000, likely: 185000, worst: 140000 },
      { period: 'Next 90 Days', revenue: 280000, deals: 8, confidence: 78, health: 'Growing', best: 360000, likely: 280000, worst: 200000 },
      { period: 'April 2024', revenue: 125000, deals: 4, confidence: 70, health: 'Building', best: 160000, likely: 125000, worst: 90000 },
      { period: 'May 2024', revenue: 135000, deals: 4, confidence: 68, health: 'Stable', best: 170000, likely: 135000, worst: 95000 },
      { period: 'June 2024', revenue: 155000, deals: 5, confidence: 65, health: 'Growing', best: 200000, likely: 155000, worst: 110000 },
    ];

    for (const f of forecasts) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() - Math.floor(Math.random() * 30));

      await client.query(
        `INSERT INTO ai_pipeline_forecasts (team_id, forecast_period, forecast_date, predicted_revenue, predicted_deals,
          confidence, pipeline_health, risk_assessment, opportunities, recommendations, ai_analysis, factors_considered,
          scenario_best, scenario_likely, scenario_worst)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [mainTeam.id, f.period, forecastDate, f.revenue, f.deals, f.confidence, f.health,
         `Pipeline shows ${f.health.toLowerCase()} indicators with ${f.confidence}% confidence`,
         JSON.stringify([
           { name: 'Top Deal A', value: f.revenue * 0.3, probability: 75, expectedClose: '2024-02-15' },
           { name: 'Top Deal B', value: f.revenue * 0.25, probability: 60, expectedClose: '2024-03-01' },
           { name: 'Top Deal C', value: f.revenue * 0.2, probability: 50, expectedClose: '2024-03-15' }
         ]),
         ['Focus on advancing high-value deals', 'Add more early-stage pipeline', 'Prioritize deals near close'],
         `Based on historical win rates and current pipeline velocity, we forecast $${f.revenue.toLocaleString()} in ${f.period}.`,
         JSON.stringify({ dealStages: true, historicalWinRates: true, seasonalPatterns: true, marketConditions: true }),
         f.best, f.likely, f.worst]
      );
    }
    console.log('Created 16 AI pipeline forecasts');

    // ==================== SEED DATA FOR NEW FEATURES ====================

    // Password Reset Tokens (15 demo entries)
    const resetTokenStatuses = [
      { used: true, hoursAgo: 48 },
      { used: true, hoursAgo: 72 },
      { used: false, hoursAgo: 0 },
      { used: true, hoursAgo: 24 },
      { used: true, hoursAgo: 96 },
      { used: false, hoursAgo: 2 },
      { used: true, hoursAgo: 120 },
      { used: true, hoursAgo: 36 },
      { used: false, hoursAgo: 1 },
      { used: true, hoursAgo: 168 },
      { used: true, hoursAgo: 200 },
      { used: true, hoursAgo: 60 },
      { used: false, hoursAgo: 0.5 },
      { used: true, hoursAgo: 144 },
      { used: true, hoursAgo: 240 },
    ];

    for (let i = 0; i < resetTokenStatuses.length; i++) {
      const r = resetTokenStatuses[i];
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - r.hoursAgo);
      const expiresAt = new Date(createdAt);
      expiresAt.setHours(expiresAt.getHours() + 1);

      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token, used, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [users[i % users.length].id, uuidv4(), r.used, expiresAt, createdAt]
      );
    }
    console.log('Created 15 password reset tokens');

    // Email Verifications (15 demo entries)
    for (let i = 0; i < 15; i++) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - i);
      const expiresAt = new Date(createdAt);
      expiresAt.setHours(expiresAt.getHours() + 24);

      await client.query(
        `INSERT INTO email_verifications (user_id, token, verified, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [users[i % users.length].id, uuidv4(), i < 12, expiresAt, createdAt]
      );
    }
    console.log('Created 15 email verifications');

    // Token Blacklist (15 demo entries - expired tokens for cleanup demo)
    for (let i = 0; i < 15; i++) {
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - (i + 1) * 24);
      const expiresAt = new Date(createdAt);
      expiresAt.setHours(expiresAt.getHours() + 24);

      await client.query(
        `INSERT INTO token_blacklist (token, user_id, expires_at, created_at)
         VALUES ($1, $2, $3, $4)`,
        [`expired-token-${uuidv4().slice(0, 8)}`, users[i % users.length].id, expiresAt, createdAt]
      );
    }
    console.log('Created 15 token blacklist entries');

    console.log('\nSeed completed successfully!');
    console.log('Login credentials: any seeded email with password "password123"');

  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch(console.error);
