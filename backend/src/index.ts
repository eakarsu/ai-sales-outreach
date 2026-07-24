import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import { pool } from './config/database';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter, authLimiter, aiLimiter } from './middleware/rateLimiter';
import { sanitizeBody } from './middleware/validate';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import teamsRoutes from './routes/teams';
import contactsRoutes from './routes/contacts';
import templatesRoutes from './routes/templates';
import campaignsRoutes from './routes/campaigns';
import analyticsRoutes from './routes/analytics';
import integrationsRoutes from './routes/integrations';
import abTestsRoutes from './routes/abTests';
import aiRoutes from './routes/ai';
import activityRoutes from './routes/activity';
import sequencesRoutes from './routes/sequences';
import meetingsRoutes from './routes/meetings';
import tasksRoutes from './routes/tasks';
import notificationsRoutes from './routes/notifications';
import reportsRoutes from './routes/reports';
import trackingRoutes from './routes/tracking';
import webhooksRoutes from './routes/webhooks';
import momentumRoutes from './routes/momentum';
import governedOutreachRoutes from './routes/governedOutreach';
import applicationAiRoutes from './routes/applicationAi';

const app = express();
const PORT = process.env.PORT || 3001;

// Import new routes
import warmupRoutes from './routes/warmup';
import competitiveIntelRoutes from './routes/competitiveIntel';
import playbookRoutes from './routes/playbook';
import prospectResearchRoutes from './routes/prospectResearch';
import dealsRoutes from './routes/deals';
import replyClassifierRoutes from './routes/replyClassifier';
import leaderboardRoutes from './routes/leaderboard';
import replyTriageRoutes from './routes/replyTriage';

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));

// Input sanitization
app.use(sanitizeBody);

// Rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/ai', aiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/ab-tests', abTestsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/sequences', sequencesRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/contacts', momentumRoutes);
app.use('/api/governed-outreach', generalLimiter, governedOutreachRoutes);
app.use('/api/application-ai', applicationAiRoutes);
app.use('/api/ai/warmup', warmupRoutes);
app.use('/api/ai/competitive-intel', competitiveIntelRoutes);
app.use('/api/ai/playbook', playbookRoutes);
app.use('/api/ai/prospect-research', prospectResearchRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/ai/classify-reply', replyClassifierRoutes);
app.use('/api/analytics/leaderboard', leaderboardRoutes);
app.use('/api/ai/reply-triage', replyTriageRoutes);

// Custom Views (Outreach Pipeline / Templates / Bulk Scheduler)
import customViewsRouter from './routes/customViews';
app.use('/api/custom-views', customViewsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// BATCH_00_AUDIT_MOUNTS
import meetingTranscriptRoutes from './routes/meetingTranscript';
import battlecardsRoutes from './routes/battlecards';
import voiceCoachingRoutes from './routes/voiceCoaching';
import methodologyPlaybookRoutes from './routes/methodologyPlaybook';
import enrichmentBridgeRoutes from './routes/enrichmentBridge';
// === Batch 00 Gaps & Frontend Mounts ===
import gapAiLiveConversationCoachingCallsRouter from './routes/gap_ai_live_conversation_coaching_calls';
import gapAiCompetitorWinLossAnalysisRouter from './routes/gap_ai_competitor_win_loss_analysis';
import gapAiAccountTierScoringIcpRouter from './routes/gap_ai_account_tier_scoring_icp';
import gapAiMultilingualOutreachGenerationRouter from './routes/gap_ai_multilingual_outreach_generation';
import gapMultiChannelAssetLibraryVideoRouter from './routes/gap_multi_channel_asset_library_video';
import gapWorkflowApprovalGatesComplianceReviewRouter from './routes/gap_workflow_approval_gates_compliance_review';
import gapLimitedCustomFieldAutomationDataRouter from './routes/gap_limited_custom_field_automation_data';
import gapRevenueAttributionModelingBeyondSimpleRouter from './routes/gap_revenue_attribution_modeling_beyond_simple';
import gapQbrExecutiveSummaryBuilderRouter from './routes/gap_qbr_executive_summary_builder';

// === Apply pass 7: custom-feature routes wiring frontend Gap pages ===
import cfAutoGeneratedCompetitorBattlecardsWebRouter from './routes/cf_auto_generated_competitor_battlecards_web';
import cfDeeperEnrichmentSalesforceEinsteinLinkedinRouter from './routes/cf_deeper_enrichment_salesforce_einstein_linkedin';
import cfRealTimeMeetingTranscriptAnalysisRouter from './routes/cf_real_time_meeting_transcript_analysis';
import cfSalesMethodologyPlaybooksMeddicSandlerRouter from './routes/cf_sales_methodology_playbooks_meddic_sandler';
import cfVoiceCallCoachingPostCallRouter from './routes/cf_voice_call_coaching_post_call';
if (process.env.ENABLE_GENERATED_FEATURES === 'true' && process.env.NODE_ENV !== 'production') {
  app.use('/api/meeting-transcript', meetingTranscriptRoutes);
  app.use('/api/battlecards', battlecardsRoutes);
  app.use('/api/voice-coaching', voiceCoachingRoutes);
  app.use('/api/methodology-playbook', methodologyPlaybookRoutes);
  app.use('/api/enrichment-bridge', enrichmentBridgeRoutes);
  app.use('/api/gap-ai-live-conversation-coaching-calls', gapAiLiveConversationCoachingCallsRouter);
  app.use('/api/gap-ai-competitor-win-loss-analysis', gapAiCompetitorWinLossAnalysisRouter);
  app.use('/api/gap-ai-account-tier-scoring-icp', gapAiAccountTierScoringIcpRouter);
  app.use('/api/gap-ai-multilingual-outreach-generation', gapAiMultilingualOutreachGenerationRouter);
  app.use('/api/gap-multi-channel-asset-library-video', gapMultiChannelAssetLibraryVideoRouter);
  app.use('/api/gap-workflow-approval-gates-compliance-review', gapWorkflowApprovalGatesComplianceReviewRouter);
  app.use('/api/gap-limited-custom-field-automation-data', gapLimitedCustomFieldAutomationDataRouter);
  app.use('/api/gap-revenue-attribution-modeling-beyond-simple', gapRevenueAttributionModelingBeyondSimpleRouter);
  app.use('/api/gap-qbr-executive-summary-builder', gapQbrExecutiveSummaryBuilderRouter);
  app.use('/api/cf-auto-generated-competitor-battlecards-web', cfAutoGeneratedCompetitorBattlecardsWebRouter);
  app.use('/api/cf-deeper-enrichment-salesforce-einstein-linkedin', cfDeeperEnrichmentSalesforceEinsteinLinkedinRouter);
  app.use('/api/cf-real-time-meeting-transcript-analysis', cfRealTimeMeetingTranscriptAnalysisRouter);
  app.use('/api/cf-sales-methodology-playbooks-meddic-sandler', cfSalesMethodologyPlaybooksMeddicSandlerRouter);
  app.use('/api/cf-voice-call-coaching-post-call', cfVoiceCallCoachingPostCallRouter);
}

// 404 handler (must be registered AFTER all routes so it only catches unmatched paths)
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Initialize database and start server
export const start = async () => {
  try {
    await pool.query('SELECT 1');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

export { app };

if (require.main === module) start();
