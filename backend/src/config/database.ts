import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'node:fs';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

const databaseUrl = process.env.DATABASE_URL || '';
if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
  throw new Error('DATABASE_URL must be an explicit PostgreSQL connection string');
}
const parsed = new URL(databaseUrl);
const remoteProduction = process.env.NODE_ENV === 'production'
  && !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
const caPath = process.env.PGSSLROOTCERT || '';
if (remoteProduction && !caPath) throw new Error('PGSSLROOTCERT is required for remote production PostgreSQL');

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: caPath ? { rejectUnauthorized: true, ca: fs.readFileSync(caPath, 'utf8') } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const closePool = () => pool.end();

export const initDatabase = async () => {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Teams table
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID REFERENCES users(id),
        plan VARCHAR(50) DEFAULT 'starter',
        monthly_price DECIMAL(10,2) DEFAULT 50.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Team members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(team_id, user_id)
      )
    `);

    // Contacts/Leads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        company VARCHAR(255),
        job_title VARCHAR(255),
        phone VARCHAR(50),
        linkedin_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'new',
        lead_score INTEGER DEFAULT 0,
        source VARCHAR(100),
        tags TEXT[],
        custom_fields JSONB DEFAULT '{}',
        last_contacted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Email templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        category VARCHAR(100),
        is_ai_generated BOOLEAN DEFAULT false,
        variables TEXT[],
        open_rate DECIMAL(5,2) DEFAULT 0,
        reply_rate DECIMAL(5,2) DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Campaigns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        type VARCHAR(50) DEFAULT 'outreach',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        target_audience TEXT,
        total_contacts INTEGER DEFAULT 0,
        emails_sent INTEGER DEFAULT 0,
        emails_opened INTEGER DEFAULT 0,
        emails_clicked INTEGER DEFAULT 0,
        replies_received INTEGER DEFAULT 0,
        meetings_booked INTEGER DEFAULT 0,
        revenue_generated DECIMAL(12,2) DEFAULT 0,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Campaign sequences (drip campaign steps)
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaign_sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
        template_id UUID REFERENCES email_templates(id),
        step_number INTEGER NOT NULL,
        delay_days INTEGER DEFAULT 0,
        delay_hours INTEGER DEFAULT 0,
        subject_override VARCHAR(500),
        body_override TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Emails sent table
    await client.query(`
      CREATE TABLE IF NOT EXISTS emails_sent (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        template_id UUID REFERENCES email_templates(id),
        sequence_id UUID REFERENCES campaign_sequences(id),
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'sent',
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        replied_at TIMESTAMP,
        bounced_at TIMESTAMP,
        unsubscribed_at TIMESTAMP
      )
    `);

    // A/B Tests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ab_tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'running',
        variant_a_template_id UUID REFERENCES email_templates(id),
        variant_b_template_id UUID REFERENCES email_templates(id),
        variant_a_sent INTEGER DEFAULT 0,
        variant_b_sent INTEGER DEFAULT 0,
        variant_a_opens INTEGER DEFAULT 0,
        variant_b_opens INTEGER DEFAULT 0,
        variant_a_replies INTEGER DEFAULT 0,
        variant_b_replies INTEGER DEFAULT 0,
        winner VARCHAR(10),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP
      )
    `);

    // Analytics/Metrics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        emails_sent INTEGER DEFAULT 0,
        emails_opened INTEGER DEFAULT 0,
        emails_clicked INTEGER DEFAULT 0,
        replies_received INTEGER DEFAULT 0,
        meetings_booked INTEGER DEFAULT 0,
        deals_closed INTEGER DEFAULT 0,
        revenue DECIMAL(12,2) DEFAULT 0,
        UNIQUE(team_id, date)
      )
    `);

    // Integrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'disconnected',
        config JSONB DEFAULT '{}',
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Generated content log
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_generations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        prompt TEXT,
        result TEXT,
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activity log
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sequences (Email Drip Campaigns)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        trigger_type VARCHAR(50) DEFAULT 'manual',
        total_contacts INTEGER DEFAULT 0,
        active_contacts INTEGER DEFAULT 0,
        completed_contacts INTEGER DEFAULT 0,
        conversion_rate DECIMAL(5,2) DEFAULT 0,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sequence Steps
    await client.query(`
      CREATE TABLE IF NOT EXISTS sequence_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sequence_id UUID REFERENCES sequences(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL,
        step_type VARCHAR(50) DEFAULT 'email',
        template_id UUID REFERENCES email_templates(id),
        delay_days INTEGER DEFAULT 0,
        delay_hours INTEGER DEFAULT 0,
        subject VARCHAR(500),
        body TEXT,
        sent_count INTEGER DEFAULT 0,
        open_count INTEGER DEFAULT 0,
        reply_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Meetings
    await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        meeting_type VARCHAR(50) DEFAULT 'discovery',
        status VARCHAR(50) DEFAULT 'scheduled',
        scheduled_at TIMESTAMP NOT NULL,
        duration_minutes INTEGER DEFAULT 30,
        location VARCHAR(500),
        meeting_link VARCHAR(500),
        outcome VARCHAR(50),
        notes TEXT,
        revenue_potential DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tasks
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        assigned_to UUID REFERENCES users(id),
        contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        task_type VARCHAR(50) DEFAULT 'follow_up',
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'pending',
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        link VARCHAR(500),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reports
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        created_by UUID REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        report_type VARCHAR(50) NOT NULL,
        date_range VARCHAR(50),
        filters JSONB DEFAULT '{}',
        data JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'completed',
        file_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Lead Scores
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_lead_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        confidence DECIMAL(5,2) DEFAULT 0,
        factors JSONB DEFAULT '{}',
        ai_analysis TEXT,
        recommendation TEXT,
        engagement_level VARCHAR(50),
        buying_signals TEXT[],
        risk_factors TEXT[],
        next_best_action TEXT,
        predicted_close_date DATE,
        predicted_deal_value DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Personalizations
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_personalizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        personalization_type VARCHAR(50) NOT NULL,
        original_content TEXT,
        personalized_content TEXT,
        personalization_factors JSONB DEFAULT '{}',
        tone VARCHAR(50),
        industry_context TEXT,
        company_insights TEXT,
        role_specific_points TEXT[],
        pain_points TEXT[],
        value_propositions TEXT[],
        ai_confidence DECIMAL(5,2) DEFAULT 0,
        engagement_prediction DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Best Times
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_best_times (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        best_day VARCHAR(20),
        best_time_start TIME,
        best_time_end TIME,
        timezone VARCHAR(100),
        confidence DECIMAL(5,2) DEFAULT 0,
        historical_data JSONB DEFAULT '{}',
        ai_reasoning TEXT,
        engagement_patterns JSONB DEFAULT '{}',
        optimal_frequency VARCHAR(50),
        avoid_times TEXT[],
        industry_insights TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Objection Handlers
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_objections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        objection_type VARCHAR(100) NOT NULL,
        objection_text TEXT NOT NULL,
        response_strategy TEXT,
        response_templates JSONB DEFAULT '[]',
        confidence DECIMAL(5,2) DEFAULT 0,
        success_rate DECIMAL(5,2) DEFAULT 0,
        use_count INTEGER DEFAULT 0,
        industry VARCHAR(100),
        buyer_persona VARCHAR(100),
        related_objections TEXT[],
        follow_up_questions TEXT[],
        ai_insights TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Pipeline Forecasts
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_pipeline_forecasts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        forecast_period VARCHAR(50) NOT NULL,
        forecast_date DATE NOT NULL,
        predicted_revenue DECIMAL(12,2) DEFAULT 0,
        predicted_deals INTEGER DEFAULT 0,
        confidence DECIMAL(5,2) DEFAULT 0,
        pipeline_health VARCHAR(50),
        risk_assessment TEXT,
        opportunities JSONB DEFAULT '[]',
        recommendations TEXT[],
        ai_analysis TEXT,
        factors_considered JSONB DEFAULT '{}',
        scenario_best DECIMAL(12,2) DEFAULT 0,
        scenario_likely DECIMAL(12,2) DEFAULT 0,
        scenario_worst DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Password Reset Tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        used BOOLEAN DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Token Blacklist (for logout)
    await client.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Email Verifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        verified BOOLEAN DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add email_verified column to users if not exists
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Add tracking_id column to emails_sent if not exists
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE emails_sent ADD COLUMN IF NOT EXISTS tracking_id UUID DEFAULT gen_random_uuid();
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Create index on tracking_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_emails_sent_tracking_id ON emails_sent (tracking_id);
    `);

    // Webhook configurations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_configurations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        events JSONB DEFAULT '[]',
        secret VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(team_id, url)
      )
    `);

    // Deal momentum scores table
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_momentum (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        score INTEGER DEFAULT 0,
        trend VARCHAR(20) DEFAULT 'stalled',
        days_to_close INTEGER,
        reasoning TEXT,
        next_action TEXT,
        open_rate_percent INTEGER DEFAULT 0,
        reply_rate_percent INTEGER DEFAULT 0,
        days_since_last_email INTEGER,
        total_emails INTEGER DEFAULT 0,
        warning_signals JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Add warning_signals column if missing (migration)
    await client.query(`
      ALTER TABLE deal_momentum ADD COLUMN IF NOT EXISTS warning_signals JSONB DEFAULT '[]'
    `).catch(() => {});

    // AI results table (structured JSON storage)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        feature VARCHAR(100) NOT NULL,
        input_hash VARCHAR(64),
        result JSONB NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        model VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_results_feature ON ai_results (feature, team_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_results_input_hash ON ai_results (input_hash) WHERE input_hash IS NOT NULL;
    `);

    // Deals / Pipeline table
    await client.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
        owner_id UUID REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        value DECIMAL(12,2) DEFAULT 0,
        stage VARCHAR(50) DEFAULT 'prospecting',
        probability INTEGER DEFAULT 0,
        close_date DATE,
        win_probability DECIMAL(5,2) DEFAULT 0,
        ai_win_probability DECIMAL(5,2),
        ai_analysis TEXT,
        notes TEXT,
        lost_reason TEXT,
        won_at TIMESTAMP,
        lost_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Warmup Schedules
    await client.query(`
      CREATE TABLE IF NOT EXISTS warmup_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email_address VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        current_day INTEGER DEFAULT 1,
        total_days INTEGER DEFAULT 30,
        daily_limit INTEGER DEFAULT 5,
        current_volume INTEGER DEFAULT 0,
        ai_curve JSONB DEFAULT '[]',
        ai_recommendations TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Competitive Intel
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_competitive_intel (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        industry VARCHAR(100),
        competitors JSONB DEFAULT '[]',
        differentiators TEXT[],
        objection_responses JSONB DEFAULT '{}',
        positioning_tips TEXT[],
        ai_confidence DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Playbooks
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_playbooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        insights JSONB DEFAULT '[]',
        top_patterns JSONB DEFAULT '[]',
        recommended_sequences JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Prospect Research
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_prospect_research (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        company_overview TEXT,
        tech_stack TEXT[],
        pain_points TEXT[],
        trigger_events TEXT[],
        decision_makers JSONB DEFAULT '[]',
        recommended_approach TEXT,
        ai_confidence DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reply Classifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS reply_classifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        email_id UUID REFERENCES emails_sent(id) ON DELETE CASCADE,
        classification VARCHAR(50) NOT NULL,
        sentiment VARCHAR(50),
        draft_response TEXT,
        confidence DECIMAL(5,2) DEFAULT 0,
        raw_reply TEXT,
        actioned BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully');
  } finally {
    client.release();
  }
};
