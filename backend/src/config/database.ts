import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_sales_outreach',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

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

    console.log('Database tables created successfully');
  } finally {
    client.release();
  }
};
