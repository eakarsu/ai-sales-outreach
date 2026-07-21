import crypto, { randomUUID } from 'node:crypto';
import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

// Project-owned CommonJS policy is also exercised directly by dependency-free tests.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const policy = require('../../../governance/outreach.cjs') as {
  PROVIDERS: Set<string>;
  digest(value: unknown): string;
  validKey(value: unknown): boolean;
  normalizeEmail(value: unknown): string;
  sourceIdentity(provider: unknown, id: unknown): string;
  evaluateOutreach(input: Record<string, unknown>): { errors: string[]; decision: Record<string, unknown> };
  canTransition(from: string, to: string): boolean;
  retryState(attempts: number, retryable: boolean): string;
};

const router = Router();
const roles = new Set(['user', 'manager', 'admin']);
const errorCode = /^[A-Z0-9][A-Z0-9._:-]{1,63}$/;

function context(req: AuthRequest) {
  const user = req.user;
  if (!user || !policy.validKey(user.tenantId) || !roles.has(user.role)) return null;
  return { tenantId: user.tenantId, actorId: user.userId, role: user.role };
}

function canManage(role: string) {
  return role === 'manager' || role === 'admin';
}

router.use(authenticate);

router.post('/sources/sync', async (req: AuthRequest, res: Response) => {
  const ctx = context(req);
  if (!ctx) return res.status(403).json({ error: 'tenant-scoped signed identity required' });
  try {
    const provider = String(req.body.provider || '').toLowerCase();
    const sourceRecordId = String(req.body.sourceRecordId || '');
    policy.sourceIdentity(provider, sourceRecordId);
    const email = policy.normalizeEmail(req.body.email);
    const sourceVersion = String(req.body.sourceVersion || '');
    if (!/^\S+@\S+\.\S+$/.test(email) || !policy.validKey(sourceVersion)) {
      return res.status(422).json({ error: 'valid email and stable sourceVersion required' });
    }
    const normalized = {
      provider,
      sourceRecordId,
      email,
      sourceVersion,
      consentStatus: String(req.body.consentStatus || 'unknown'),
      consentRef: req.body.consentRef ? String(req.body.consentRef) : null,
      suppressed: req.body.suppressed === true,
      deletedAtSource: req.body.deletedAtSource || null,
    };
    const result = await pool.query(
      `INSERT INTO governed_contact_sources
        (tenant_id,id,provider,source_record_id,email_normalized,source_version,payload_hash,
         consent_status,consent_ref,suppressed,deleted_at_source,last_synced_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT(tenant_id,provider,source_record_id) DO UPDATE SET
         email_normalized=EXCLUDED.email_normalized,source_version=EXCLUDED.source_version,
         payload_hash=EXCLUDED.payload_hash,consent_status=EXCLUDED.consent_status,
         consent_ref=EXCLUDED.consent_ref,suppressed=EXCLUDED.suppressed,
         deleted_at_source=EXCLUDED.deleted_at_source,last_synced_at=NOW(),updated_at=NOW()
       WHERE governed_contact_sources.source_version<>EXCLUDED.source_version
          OR governed_contact_sources.payload_hash<>EXCLUDED.payload_hash
       RETURNING id,provider,source_record_id,source_version,last_synced_at`,
      [ctx.tenantId, randomUUID(), provider, sourceRecordId, email, sourceVersion,
        policy.digest(normalized), normalized.consentStatus, normalized.consentRef,
        normalized.suppressed, normalized.deletedAtSource]
    );
    if (!result.rowCount) {
      const prior = await pool.query(
        `SELECT id,provider,source_record_id,source_version,last_synced_at
         FROM governed_contact_sources WHERE tenant_id=$1 AND provider=$2 AND source_record_id=$3`,
        [ctx.tenantId, provider, sourceRecordId]
      );
      return res.json({ source: prior.rows[0], deduplicated: true });
    }
    return res.status(201).json({ source: result.rows[0], deduplicated: false });
  } catch (error) {
    return res.status(422).json({ error: error instanceof Error ? error.message : 'invalid source sync' });
  }
});

router.post('/sources/:id/commands', async (req: AuthRequest, res: Response) => {
  const ctx = context(req);
  if (!ctx || !canManage(ctx.role)) return res.status(403).json({ error: 'manager role required' });
  const key = req.get('Idempotency-Key') || '';
  const provider = String(req.body.provider || '').toLowerCase();
  const operation = String(req.body.operation || '');
  if (!policy.validKey(key) || !policy.PROVIDERS.has(provider) || !['upsert', 'delete', 'reconcile'].includes(operation)) {
    return res.status(422).json({ error: 'valid idempotency key, provider, and operation required' });
  }
  const payload = { sourceId: req.params.id, sourceVersion: req.body.sourceVersion, fields: req.body.fields || {} };
  const hash = policy.digest(payload);
  const result = await pool.query(
    `INSERT INTO governed_outreach_outbox
      (tenant_id,source_id,provider,operation,payload,idempotency_key,request_hash)
     SELECT $1,id,$3,$4,$5,$6,$7 FROM governed_contact_sources WHERE tenant_id=$1 AND id=$2
     ON CONFLICT(tenant_id,provider,idempotency_key) DO NOTHING RETURNING *`,
    [ctx.tenantId, req.params.id, provider, operation, payload, key, hash]
  );
  if (!result.rowCount) return res.status(409).json({ error: 'source missing or idempotency key already used' });
  return res.status(201).json(result.rows[0]);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const ctx = context(req);
  const key = req.get('Idempotency-Key') || '';
  if (!ctx || !policy.validKey(key)) return res.status(ctx ? 422 : 403).json({ error: 'valid identity and Idempotency-Key required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sourceResult = await client.query(
      `SELECT * FROM governed_contact_sources WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,
      [ctx.tenantId, req.body.contactSourceId]
    );
    if (!sourceResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'contact source not found in signed tenant' });
    }
    const source = sourceResult.rows[0];
    const evaluated = policy.evaluateOutreach({
      ...(req.body.outreach || {}),
      email: source.email_normalized,
      consentStatus: source.consent_status,
      consentRef: source.consent_ref,
      suppressed: source.suppressed,
      deletedAtSource: source.deleted_at_source,
      sourceRef: `${source.provider}:${source.source_record_id}:${source.source_version}`,
    });
    if (evaluated.errors.length) {
      await client.query('ROLLBACK');
      return res.status(422).json(evaluated);
    }
    const requestHash = policy.digest({ contactSourceId: req.body.contactSourceId, decision: evaluated.decision });
    const id = randomUUID();
    const inserted = await client.query(
      `WITH created AS (
        INSERT INTO governed_outreach
          (tenant_id,id,contact_source_id,campaign_id,owner_id,channel,request_hash,
           idempotency_key,decision,scheduled_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(tenant_id,idempotency_key) DO NOTHING
        RETURNING *
      ) SELECT created.*,FALSE AS replay FROM created
        UNION ALL SELECT prior.*,TRUE AS replay FROM governed_outreach prior
        WHERE prior.tenant_id=$1 AND prior.idempotency_key=$8 AND prior.request_hash=$7
          AND NOT EXISTS(SELECT 1 FROM created) LIMIT 1`,
      [ctx.tenantId, id, req.body.contactSourceId, evaluated.decision.campaignId,
        evaluated.decision.ownerId, evaluated.decision.channel, requestHash, key,
        evaluated.decision, evaluated.decision.scheduledAt]
    );
    if (!inserted.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Idempotency-Key reused with different request' });
    }
    const outreach = inserted.rows[0];
    if (!outreach.replay) {
      await client.query(
        `INSERT INTO governed_outreach_events(tenant_id,outreach_id,actor_id,event_type,details)
         VALUES($1,$2,$3,'created',$4)`,
        [ctx.tenantId, id, ctx.actorId, { idempotencyKey: key, requestHash }]
      );
    }
    await client.query('COMMIT');
    return res.status(outreach.replay ? 200 : 201).json(outreach);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('governed outreach creation failed', error instanceof Error ? error.name : 'unknown');
    return res.status(500).json({ error: 'governed outreach creation failed' });
  } finally {
    client.release();
  }
});

router.post('/:id/transitions', async (req: AuthRequest, res: Response) => {
  const ctx = context(req);
  if (!ctx) return res.status(403).json({ error: 'tenant-scoped signed identity required' });
  const to = String(req.body.to || '');
  const version = Number(req.body.version);
  const reason = String(req.body.reason || '').trim();
  if (!reason || !Number.isInteger(version)) return res.status(422).json({ error: 'version and reason required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT * FROM governed_outreach WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, [ctx.tenantId, req.params.id]
    );
    const item = current.rows[0];
    const forbiddenApproval = ['approved', 'rejected'].includes(to) && (!canManage(ctx.role) || item?.owner_id === ctx.actorId);
    const forbiddenOperator = ['queued', 'handed_off'].includes(to) && !canManage(ctx.role);
    if (!item || item.version !== version || !policy.canTransition(item.state, to) || forbiddenApproval || forbiddenOperator) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'missing, stale, or forbidden transition' });
    }
    const changed = await client.query(
      `UPDATE governed_outreach SET state=$1,version=version+1,
       approved_by=CASE WHEN $1='approved' THEN $2 ELSE approved_by END,updated_at=NOW()
       WHERE tenant_id=$3 AND id=$4 AND version=$5 RETURNING *`,
      [to, ctx.actorId, ctx.tenantId, req.params.id, version]
    );
    await client.query(
      `INSERT INTO governed_outreach_events(tenant_id,outreach_id,actor_id,event_type,details)
       VALUES($1,$2,$3,$4,$5)`,
      [ctx.tenantId, req.params.id, ctx.actorId, to, { reason: reason.slice(0, 500) }]
    );
    if (to === 'queued') {
      const payload = { outreachId: req.params.id, decision: item.decision };
      await client.query(
        `INSERT INTO governed_outreach_outbox
          (tenant_id,outreach_id,provider,operation,payload,idempotency_key,request_hash)
         VALUES($1,$2,'email','send',$3,$4,$5) ON CONFLICT DO NOTHING`,
        [ctx.tenantId, req.params.id, payload, `${req.params.id}:${version}:send`, policy.digest(payload)]
      );
    }
    await client.query('COMMIT');
    return res.json(changed.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'governed transition failed' });
  } finally {
    client.release();
  }
});

router.post('/outbox/:id/results', async (req: AuthRequest, res: Response) => {
  const ctx = context(req);
  if (!ctx || !canManage(ctx.role)) return res.status(403).json({ error: 'operator role required' });
  const delivered = req.body.delivered === true;
  if (delivered && (!policy.validKey(req.body.receipt?.receiptRef) || !req.body.receipt?.receivedAt)) {
    return res.status(422).json({ error: 'typed provider receipt required' });
  }
  if (!delivered && !errorCode.test(String(req.body.errorCode || ''))) {
    return res.status(422).json({ error: 'bounded errorCode required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const itemResult = await client.query(
      `SELECT * FROM governed_outreach_outbox WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, [ctx.tenantId, req.params.id]
    );
    const item = itemResult.rows[0];
    if (!item || !['queued', 'processing', 'failed'].includes(item.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'outbox result is stale or missing' });
    }
    const attempts = item.attempts + 1;
    const status = delivered ? 'delivered' : policy.retryState(attempts, req.body.retryable !== false);
    const updated = await client.query(
      `UPDATE governed_outreach_outbox SET status=$1,attempts=$2::integer,provider_receipt=$3,
       last_error_code=$4,lease_token=NULL,lease_expires_at=NULL,
       next_attempt_at=NOW()+(INTERVAL '1 second' * LEAST(3600,CAST(POWER(2,$2::integer) AS integer)))
       WHERE tenant_id=$5 AND id=$6 RETURNING *`,
      [status, attempts, delivered ? req.body.receipt : null, delivered ? null : req.body.errorCode,
        ctx.tenantId, req.params.id]
    );
    if (item.outreach_id && (delivered || status === 'dead_letter')) {
      const nextState = delivered ? 'sent' : 'failed';
      const current = await client.query(
        `SELECT state FROM governed_outreach WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, [ctx.tenantId, item.outreach_id]
      );
      if (current.rowCount && policy.canTransition(current.rows[0].state, nextState)) {
        await client.query(
          `UPDATE governed_outreach SET state=$1,version=version+1,updated_at=NOW() WHERE tenant_id=$2 AND id=$3`,
          [nextState, ctx.tenantId, item.outreach_id]
        );
        await client.query(
          `INSERT INTO governed_outreach_events(tenant_id,outreach_id,actor_id,event_type,details)
           VALUES($1,$2,$3,$4,$5)`,
          [ctx.tenantId, item.outreach_id, ctx.actorId, `provider_${nextState}`,
            { outboxId: item.id, receipt: delivered ? req.body.receipt : null, errorCode: req.body.errorCode || null }]
        );
      }
    }
    await client.query('COMMIT');
    return res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('provider result persistence failed', error instanceof Error ? error.message : 'unknown');
    return res.status(500).json({ error: 'provider result failed' });
  } finally {
    client.release();
  }
});

router.get('/metrics/quality', async (req: AuthRequest, res: Response) => {
  const ctx = context(req);
  if (!ctx) return res.status(403).json({ error: 'tenant-scoped signed identity required' });
  const result = await pool.query(
    `SELECT
       COUNT(*)::integer AS source_records,
       COUNT(DISTINCT email_normalized)::integer AS unique_recipients,
       COUNT(*) FILTER(WHERE consent_status='granted' AND consent_ref IS NOT NULL
         AND source_version<>'' AND deleted_at_source IS NULL)::integer AS complete_records,
       COUNT(*) FILTER(WHERE suppressed OR deleted_at_source IS NOT NULL)::integer AS blocked_records
     FROM governed_contact_sources WHERE tenant_id=$1`, [ctx.tenantId]
  );
  const conversions = await pool.query(
    `SELECT COUNT(*)::integer AS outreach,
       COUNT(*) FILTER(WHERE state='handed_off')::integer AS conversions
     FROM governed_outreach WHERE tenant_id=$1`, [ctx.tenantId]
  );
  const source = result.rows[0];
  const funnel = conversions.rows[0];
  return res.json({
    ...source,
    ...funnel,
    completenessRate: source.source_records ? source.complete_records / source.source_records : 0,
    conversionRate: funnel.outreach ? funnel.conversions / funnel.outreach : 0,
  });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const ctx = context(req);
  if (!ctx) return res.status(403).json({ error: 'tenant-scoped signed identity required' });
  const result = await pool.query(
    `SELECT o.*,COALESCE(json_agg(e ORDER BY e.seq) FILTER(WHERE e.seq IS NOT NULL),'[]') AS events
     FROM governed_outreach o LEFT JOIN governed_outreach_events e
       ON e.tenant_id=o.tenant_id AND e.outreach_id=o.id
     WHERE o.tenant_id=$1 AND o.id=$2 GROUP BY o.tenant_id,o.id`, [ctx.tenantId, req.params.id]
  );
  return result.rowCount ? res.json(result.rows[0]) : res.status(404).json({ error: 'outreach not found' });
});

export default router;
