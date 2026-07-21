import { Router } from 'express';
import { pool } from '../config/database';
import crypto from 'crypto';
import axios from 'axios';
import { authenticate } from '../middleware/auth';

const router = Router();
// Note: configure and test require auth, but fireWebhooks() is called internally
router.use('/configure', authenticate);
router.use('/test', authenticate);

// Helper: fire webhooks for a given event + contact payload (call from other routes)
export async function fireWebhooks(
  teamId: string,
  event: string,
  data: object
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT url, secret FROM webhook_configurations
       WHERE team_id = $1 AND is_active = true AND events @> $2::jsonb`,
      [teamId, JSON.stringify([event])]
    );

    for (const webhook of result.rows) {
      const payload = { event, timestamp: new Date().toISOString(), teamId, data };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (webhook.secret) {
        const sig = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${sig}`;
      }

      axios
        .post(webhook.url, payload, { headers, timeout: 10_000 })
        .catch(err => console.error(`Webhook delivery failed for ${webhook.url}:`, err.message));
    }
  } catch {
    // Webhooks must never break the main flow
  }
}

// POST /api/webhooks/configure — store webhook URL + events
router.post('/configure', async (req, res) => {
  try {
    const { teamId, url, events, secret } = req.body;

    if (!teamId || !url || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'teamId, url, and events array are required' });
    }

    const result = await pool.query(
      `INSERT INTO webhook_configurations (team_id, url, events, secret, is_active)
       VALUES ($1, $2, $3::jsonb, $4, true)
       ON CONFLICT (team_id, url)
       DO UPDATE SET events = $3::jsonb,
         secret = COALESCE($4, webhook_configurations.secret),
         is_active = true,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, team_id, url, events, is_active, created_at`,
      [teamId, url, JSON.stringify(events), secret || null]
    ).catch(() => null);

    if (!result) {
      return res.status(503).json({ error: 'Webhook persistence is not migrated; configuration was not accepted' });
    }

    res.json({ success: true, webhook: result.rows[0] });
  } catch (error) {
    console.error('Error configuring webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/webhooks/test — send test payload to webhook URL
router.post('/test', async (req, res) => {
  try {
    const { teamId, url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      teamId,
      data: { message: 'This is a test webhook payload from AI Sales Outreach.' },
    };

    let signature: string | null = null;
    try {
      const webhookResult = await pool.query(
        `SELECT secret FROM webhook_configurations WHERE team_id = $1 AND url = $2`,
        [teamId, url]
      );
      const secret = webhookResult.rows[0]?.secret;
      if (secret) {
        signature = crypto.createHmac('sha256', secret).update(JSON.stringify(testPayload)).digest('hex');
      }
    } catch { /* table may not exist */ }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (signature) headers['X-Webhook-Signature'] = `sha256=${signature}`;

      await axios.post(url, testPayload, { headers, timeout: 10_000 });
      res.json({ success: true, message: 'Test webhook delivered successfully.', payload: testPayload });
    } catch (deliveryErr: any) {
      res.status(502).json({
        success: false,
        error: `Webhook delivery failed: ${deliveryErr.message}`,
        payload: testPayload,
      });
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
