import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

// Get all sequences
router.get('/', async (req, res) => {
  try {
    const { teamId } = req.query;

    const result = await pool.query(
      `SELECT s.*, u.first_name, u.last_name,
        (SELECT COUNT(*) FROM sequence_steps ss WHERE ss.sequence_id = s.id) as step_count
       FROM sequences s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.team_id = $1
       ORDER BY s.created_at DESC`,
      [teamId]
    );

    res.json(result.rows.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      triggerType: s.trigger_type,
      totalContacts: s.total_contacts,
      activeContacts: s.active_contacts,
      completedContacts: s.completed_contacts,
      conversionRate: parseFloat(s.conversion_rate) || 0,
      stepCount: parseInt(s.step_count) || 0,
      createdBy: s.first_name ? `${s.first_name} ${s.last_name}` : null,
      createdAt: s.created_at,
    })));
  } catch (error) {
    console.error('Error fetching sequences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sequence by ID with steps
router.get('/:id', async (req, res) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const { id } = req.params;

    const sequenceResult = await pool.query(
      `SELECT s.*, u.first_name, u.last_name
       FROM sequences s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (sequenceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    const stepsResult = await pool.query(
      `SELECT ss.*, et.name as template_name
       FROM sequence_steps ss
       LEFT JOIN email_templates et ON ss.template_id = et.id
       WHERE ss.sequence_id = $1
       ORDER BY ss.step_number`,
      [id]
    );

    const s = sequenceResult.rows[0];
    res.json({
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      triggerType: s.trigger_type,
      totalContacts: s.total_contacts,
      activeContacts: s.active_contacts,
      completedContacts: s.completed_contacts,
      conversionRate: parseFloat(s.conversion_rate) || 0,
      createdBy: s.first_name ? `${s.first_name} ${s.last_name}` : null,
      createdAt: s.created_at,
      steps: stepsResult.rows.map(step => ({
        id: step.id,
        stepNumber: step.step_number,
        stepType: step.step_type,
        templateId: step.template_id,
        templateName: step.template_name,
        delayDays: step.delay_days,
        delayHours: step.delay_hours,
        subject: step.subject,
        body: step.body,
        sentCount: step.sent_count,
        openCount: step.open_count,
        replyCount: step.reply_count,
      })),
    });
  } catch (error) {
    console.error('Error fetching sequence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create sequence
router.post('/', async (req, res) => {
  try {
    const { teamId, name, description, triggerType, createdBy } = req.body;

    const result = await pool.query(
      `INSERT INTO sequences (team_id, name, description, trigger_type, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [teamId, name, description, triggerType || 'manual', createdBy]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating sequence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add step to sequence
router.post('/:id/steps', async (req, res) => {
  try {
    const { id } = req.params;
    const { stepNumber, stepType, templateId, delayDays, delayHours, subject, body } = req.body;

    const result = await pool.query(
      `INSERT INTO sequence_steps (sequence_id, step_number, step_type, template_id, delay_days, delay_hours, subject, body)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, stepNumber, stepType || 'email', templateId, delayDays || 0, delayHours || 0, subject, body]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding sequence step:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update sequence status
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE sequences SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error activating sequence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE sequences SET status = 'paused', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error pausing sequence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete sequence
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM sequences WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sequence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
