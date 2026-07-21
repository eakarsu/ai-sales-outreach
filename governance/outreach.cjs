'use strict';

const crypto = require('node:crypto');

const STATES = Object.freeze({
  draft: ['review_pending', 'cancelled'],
  review_pending: ['approved', 'rejected'],
  approved: ['queued', 'cancelled'],
  queued: ['sent', 'failed', 'cancelled'],
  failed: ['queued', 'cancelled'],
  sent: ['delivered', 'bounced', 'failed'],
  delivered: ['handed_off'],
  handed_off: [],
  bounced: [],
  rejected: [],
  cancelled: [],
});

const PROVIDERS = new Set(['crm', 'email', 'calendar', 'enrichment', 'consent', 'suppression']);
const CHANNELS = new Set(['email', 'calendar_invite']);
const REGIONS = new Set(['US', 'CA', 'EU', 'UK', 'AU']);
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function canonical(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('non-finite number');
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

function validKey(value) {
  return typeof value === 'string' && KEY.test(value);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sourceIdentity(provider, sourceRecordId) {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  const id = String(sourceRecordId || '').trim();
  if (!PROVIDERS.has(normalizedProvider) || !validKey(id)) {
    throw new Error('allow-listed provider and stable sourceRecordId required');
  }
  return `${normalizedProvider}:${id}`;
}

function canTransition(from, to) {
  return Boolean(STATES[from] && STATES[from].includes(to));
}

function evaluateOutreach(input = {}, now = new Date()) {
  const errors = [];
  const email = normalizeEmail(input.email);
  const region = String(input.region || '').toUpperCase();
  const channel = String(input.channel || '').toLowerCase();
  const scheduledAt = Date.parse(input.scheduledAt || '');
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('valid recipient email required');
  if (!REGIONS.has(region)) errors.push('supported region required');
  if (!CHANNELS.has(channel)) errors.push('supported outreach channel required');
  if (input.consentStatus !== 'granted' || !String(input.consentRef || '').trim()) {
    errors.push('affirmative consent evidence required');
  }
  if (input.suppressed === true || input.optedOut === true || input.deletedAtSource) {
    errors.push('suppressed, opted-out, or deleted recipient');
  }
  if (!validKey(input.ownerId)) errors.push('accountable owner required');
  if (!validKey(input.templateVersion) || !validKey(input.campaignId)) {
    errors.push('versioned template and campaign required');
  }
  if (!Number.isFinite(scheduledAt) || scheduledAt < now.getTime() - 60_000) errors.push('future scheduledAt required');
  const sent24h = Number(input.recipientMessagesLast24h || 0);
  const tenantMinute = Number(input.tenantMessagesLastMinute || 0);
  if (!Number.isInteger(sent24h) || sent24h < 0 || sent24h >= 3) errors.push('recipient frequency cap exceeded');
  if (!Number.isInteger(tenantMinute) || tenantMinute < 0 || tenantMinute >= 100) errors.push('tenant rate limit exceeded');
  if (['EU', 'UK'].includes(region) && !String(input.privacyBasis || '').trim()) {
    errors.push('regional privacy basis required');
  }
  return {
    errors,
    decision: {
      email,
      region,
      channel,
      scheduledAt: Number.isFinite(scheduledAt) ? new Date(scheduledAt).toISOString() : null,
      ownerId: String(input.ownerId || ''),
      campaignId: String(input.campaignId || ''),
      templateVersion: String(input.templateVersion || ''),
      sourceRef: String(input.sourceRef || ''),
      humanReviewRequired: true,
      sendAllowed: errors.length === 0,
      attributionModel: 'first-touch-v1',
    },
  };
}

function retryState(attempts, retryable = true) {
  return !retryable || Number(attempts) >= 5 ? 'dead_letter' : 'failed';
}

function dataQuality(records = []) {
  const seen = new Set();
  let duplicates = 0;
  let complete = 0;
  for (const record of records) {
    const key = normalizeEmail(record.email);
    if (seen.has(key)) duplicates += 1;
    else seen.add(key);
    if (key && record.ownerId && record.consentRef && record.sourceVersion) complete += 1;
  }
  return {
    total: records.length,
    unique: seen.size,
    duplicates,
    completenessRate: records.length ? Number((complete / records.length).toFixed(4)) : 0,
  };
}

function conversion(events = []) {
  const created = new Set(events.filter((event) => event.type === 'lead_created').map((event) => event.leadId));
  const converted = new Set(events.filter((event) => event.type === 'lead_converted' && created.has(event.leadId)).map((event) => event.leadId));
  return {
    leads: created.size,
    conversions: converted.size,
    conversionRate: created.size ? Number((converted.size / created.size).toFixed(4)) : 0,
  };
}

module.exports = {
  STATES,
  PROVIDERS,
  canonical,
  digest,
  validKey,
  normalizeEmail,
  sourceIdentity,
  canTransition,
  evaluateOutreach,
  retryState,
  dataQuality,
  conversion,
};
