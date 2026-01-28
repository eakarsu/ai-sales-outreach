import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './config/database';

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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
const start = async () => {
  try {
    await initDatabase();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
