import { Router, Response } from 'express';
import axios from 'axios';
import { randomUUID } from 'node:crypto';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/sales-advice', authenticate, async (req: AuthRequest, res: Response) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  const baseUrl = process.env.OPENROUTER_BASE_URL;
  if (!apiKey || !model || baseUrl !== 'https://openrouter.ai/api/v1') {
    return res.status(503).json({ error: 'OpenRouter configuration is incomplete' });
  }

  try {
    const providerResponse = await axios.post(`${baseUrl}/chat/completions`, {
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are an accountable sales-outreach operations advisor. Require consent, suppression, privacy, deliverability, human review, ownership, evidence, and retry controls. Never authorize an automatic send.' },
        { role: 'user', content: prompt },
      ],
    }, {
      timeout: 180_000,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
    const payload = providerResponse.data;
    const result = payload?.choices?.[0]?.message?.content;
    if (typeof result !== 'string' || !result.trim()) throw new Error('OpenRouter returned no substantive content');

    const id = randomUUID();
    const resolvedModel = String(payload.model || model);
    const providerReceipt = { id: String(payload.id || ''), provider: 'openrouter', created: payload.created ?? null };
    await pool.query(
      `INSERT INTO application_ai_results(id,user_id,tenant_id,prompt,model,provider_receipt,result,usage)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb)`,
      [id, req.user!.userId, req.user!.tenantId, prompt, resolvedModel, JSON.stringify(providerReceipt), result.trim(),
        payload.usage ? JSON.stringify(payload.usage) : null],
    );

    return res.json({ id, provider: 'openrouter', model: resolvedModel, result: result.trim(), usage: payload.usage ?? null });
  } catch (error) {
    console.error('OpenRouter request failed', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'OpenRouter request failed' });
  }
});

export default router;
