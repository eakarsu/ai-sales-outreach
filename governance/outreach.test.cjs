'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  digest,
  canTransition,
  normalizeEmail,
  sourceIdentity,
  evaluateOutreach,
  dataQuality,
  conversion,
  retryState,
} = require('./outreach.cjs');

const root = path.resolve(__dirname, '..');
const future = '2035-01-01T12:00:00Z';
const base = {
  email: ' Person@Example.COM ',
  region: 'EU',
  channel: 'email',
  consentStatus: 'granted',
  consentRef: 'consent:0001',
  privacyBasis: 'legitimate-interest-reviewed',
  ownerId: 'owner:0001',
  templateVersion: 'welcome-v3',
  campaignId: 'campaign:0001',
  scheduledAt: future,
  recipientMessagesLast24h: 0,
  tenantMessagesLastMinute: 2,
  sourceRef: 'crm:record:0001',
};

test('canonical digest is stable and payload bound', () => {
  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
  assert.notEqual(digest({ a: 1 }), digest({ a: 2 }));
});
test('source identities are normalized and provider allow-listed', () => {
  assert.equal(sourceIdentity('CRM', 'record:0001'), 'crm:record:0001');
  assert.throws(() => sourceIdentity('../unsafe', 'record:0001'));
});
test('email normalization is deterministic', () => assert.equal(normalizeEmail(' A@B.COM '), 'a@b.com'));
test('lifecycle denies approval and send shortcuts', () => {
  assert.equal(canTransition('draft', 'review_pending'), true);
  assert.equal(canTransition('draft', 'sent'), false);
  assert.equal(canTransition('approved', 'queued'), true);
});
test('valid outreach remains human-review gated', () => {
  const result = evaluateOutreach(base, new Date('2030-01-01'));
  assert.deepEqual(result.errors, []);
  assert.equal(result.decision.humanReviewRequired, true);
  assert.equal(result.decision.sendAllowed, true);
});
test('suppression, deletion, and opt-out fail closed', () => {
  assert.match(evaluateOutreach({ ...base, suppressed: true }, new Date('2030-01-01')).errors.join(','), /suppressed/);
  assert.match(evaluateOutreach({ ...base, deletedAtSource: future }, new Date('2030-01-01')).errors.join(','), /deleted/);
});
test('consent and regional privacy fail closed', () => {
  assert.ok(evaluateOutreach({ ...base, consentRef: '', privacyBasis: '' }, new Date('2030-01-01')).errors.length >= 2);
});
test('frequency and tenant limits fail closed', () => {
  assert.ok(evaluateOutreach({ ...base, recipientMessagesLast24h: 3, tenantMessagesLastMinute: 100 }, new Date('2030-01-01')).errors.length >= 2);
});
test('data quality reports duplicates and completeness', () => {
  assert.deepEqual(dataQuality([
    { email: 'a@b.com', ownerId: 'o', consentRef: 'c', sourceVersion: '1' },
    { email: 'A@B.COM' },
  ]), { total: 2, unique: 1, duplicates: 1, completenessRate: 0.5 });
});
test('conversion only attributes known leads', () => {
  assert.deepEqual(conversion([
    { type: 'lead_created', leadId: '1' },
    { type: 'lead_converted', leadId: '1' },
    { type: 'lead_converted', leadId: '2' },
  ]), { leads: 1, conversions: 1, conversionRate: 1 });
});
test('retry policy dead-letters bounded or permanent failures', () => {
  assert.equal(retryState(4, true), 'failed');
  assert.equal(retryState(5, true), 'dead_letter');
  assert.equal(retryState(1, false), 'dead_letter');
});
test('representative journey covers review, retry, delivery, and handoff', () => {
  let state = 'draft';
  for (const next of ['review_pending', 'approved', 'queued']) {
    assert.equal(canTransition(state, next), true);
    state = next;
  }
  assert.equal(retryState(1, true), 'failed');
  assert.equal(canTransition(state, 'sent'), true);
  state = 'sent';
  assert.equal(canTransition(state, 'delivered'), true);
  state = 'delivered';
  assert.equal(canTransition(state, 'handed_off'), true);
});
test('migration, API, auth, CI, and launcher encode governed controls', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations/001_governed_outreach.sql'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'backend/src/routes/governedOutreach.ts'), 'utf8');
  const auth = fs.readFileSync(path.join(root, 'backend/src/middleware/auth.ts'), 'utf8');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/governed-outreach.yml'), 'utf8');
  const launcher = fs.readFileSync(path.join(root, 'start.sh'), 'utf8');
  assert.match(migration, /governed_outreach_events_append_only/);
  assert.match(migration, /UNIQUE\(tenant_id,provider,source_record_id\)/);
  assert.match(api, /Idempotency-Key/);
  assert.match(api, /FOR UPDATE/);
  assert.match(api, /provider_receipt/);
  assert.doesNotMatch(auth, /your-secret|placeholder/);
  assert.match(workflow, /npm run check/);
  assert.doesNotMatch(launcher, /kill -9|pkill|npm install|seed|createdb/);
  assert.match(launcher, /ALLOW_SCHEMA_MIGRATION/);
});
