'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('../backend/node_modules/jsonwebtoken');

const enabled = Boolean(process.env.DATABASE_URL);

test('persisted outreach journey covers sync, replay, approval, provider receipt, metrics, and audit', { skip: !enabled }, async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'integration-access-secret-that-is-at-least-thirty-two-characters';
  process.env.DEFAULT_TENANT_ID = 'tenant-integration';
  const { app } = require('../backend/dist/index.js');
  const { pool, closePool } = require('../backend/dist/config/database.js');
  const managerId = '00000000-0000-4000-8000-000000000201';
  await pool.query(`CREATE TABLE IF NOT EXISTS users(
    id UUID PRIMARY KEY,email TEXT NOT NULL,role TEXT NOT NULL,password_hash TEXT,
    first_name TEXT,last_name TEXT,email_verified BOOLEAN DEFAULT TRUE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS token_blacklist(
    id BIGSERIAL PRIMARY KEY,token TEXT NOT NULL,user_id UUID,expires_at TIMESTAMPTZ)`);
  await pool.query(
    `INSERT INTO users(id,email,role) VALUES($1,$2,'manager')
     ON CONFLICT(id) DO UPDATE SET role='manager'`, [managerId, 'manager@example.invalid']
  );
  const token = jwt.sign({
    userId: managerId,
    email: 'manager@example.invalid',
    role: 'manager',
    tenantId: 'tenant-integration',
    subjects: ['*'],
  }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
  const server = app.listen(0);
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}/api/governed-outreach`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    const sourcePayload = {
      provider: 'crm',
      sourceRecordId: 'crm-record-0001',
      email: 'Lead@Example.com',
      sourceVersion: 'source-v1',
      consentStatus: 'granted',
      consentRef: 'consent-record-0001',
      suppressed: false,
    };
    const sourceResponse = await fetch(`${base}/sources/sync`, {
      method: 'POST', headers, body: JSON.stringify(sourcePayload),
    });
    assert.equal(sourceResponse.status, 201);
    const source = await sourceResponse.json();
    const duplicateSource = await fetch(`${base}/sources/sync`, {
      method: 'POST', headers, body: JSON.stringify(sourcePayload),
    });
    assert.equal(duplicateSource.status, 200);
    assert.equal((await duplicateSource.json()).deduplicated, true);

    const draft = {
      contactSourceId: source.source.id,
      outreach: {
        region: 'EU', channel: 'email', privacyBasis: 'legitimate-interest-reviewed',
        ownerId: 'owner:0001', templateVersion: 'template-v3', campaignId: 'campaign:0001',
        scheduledAt: '2035-01-01T12:00:00Z', recipientMessagesLast24h: 0,
        tenantMessagesLastMinute: 1,
      },
    };
    const create = () => fetch(base, {
      method: 'POST', headers: { ...headers, 'Idempotency-Key': 'outreach-request-0001' }, body: JSON.stringify(draft),
    });
    const createdResponse = await create();
    assert.equal(createdResponse.status, 201);
    const outreach = await createdResponse.json();
    assert.equal((await create()).status, 200);

    const transition = (to, version, reason) => fetch(`${base}/${outreach.id}/transitions`, {
      method: 'POST', headers, body: JSON.stringify({ to, version, reason }),
    });
    assert.equal((await transition('review_pending', 1, 'Owner completed evidence')).status, 200);
    assert.equal((await transition('approved', 2, 'Independent privacy review')).status, 200);
    assert.equal((await transition('queued', 3, 'Approved campaign window')).status, 200);
    const outbox = await pool.query(
      `SELECT id FROM governed_outreach_outbox WHERE tenant_id=$1 AND outreach_id=$2`,
      ['tenant-integration', outreach.id]
    );
    assert.equal(outbox.rowCount, 1);
    const delivered = await fetch(`${base}/outbox/${outbox.rows[0].id}/results`, {
      method: 'POST', headers, body: JSON.stringify({
        delivered: true,
        receipt: { receiptRef: 'provider-receipt-0001', receivedAt: new Date().toISOString() },
      }),
    });
    assert.equal(delivered.status, 200);
    assert.equal((await transition('delivered', 5, 'Provider delivery webhook reconciled')).status, 200);
    assert.equal((await transition('handed_off', 6, 'Qualified reply accepted by owner')).status, 200);

    const metrics = await (await fetch(`${base}/metrics/quality`, { headers })).json();
    assert.equal(metrics.source_records, 1);
    assert.equal(metrics.conversions, 1);
    assert.equal(metrics.conversionRate, 1);
    await assert.rejects(
      pool.query(`UPDATE governed_outreach_events SET details='{}' WHERE tenant_id=$1 AND outreach_id=$2`,
        ['tenant-integration', outreach.id]),
      /append-only/
    );
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await closePool();
  }
});
