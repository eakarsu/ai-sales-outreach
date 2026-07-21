BEGIN;

CREATE TABLE IF NOT EXISTS governed_contact_sources (
  tenant_id TEXT NOT NULL,
  id UUID NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN('crm','email','calendar','enrichment','consent','suppression')),
  source_record_id TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  source_version TEXT NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  consent_status TEXT NOT NULL,
  consent_ref TEXT,
  suppressed BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at_source TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id,id),
  UNIQUE(tenant_id,provider,source_record_id)
);

CREATE TABLE IF NOT EXISTS governed_outreach (
  tenant_id TEXT NOT NULL,
  id UUID NOT NULL,
  contact_source_id UUID NOT NULL,
  campaign_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN(
    'draft','review_pending','approved','queued','sent','failed','delivered','handed_off','bounced','rejected','cancelled'
  )),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  request_hash CHAR(64) NOT NULL,
  idempotency_key TEXT NOT NULL,
  decision JSONB NOT NULL,
  approved_by TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id,id),
  FOREIGN KEY(tenant_id,contact_source_id) REFERENCES governed_contact_sources(tenant_id,id) ON DELETE RESTRICT,
  UNIQUE(tenant_id,idempotency_key)
);

CREATE TABLE IF NOT EXISTS governed_outreach_events (
  seq BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  outreach_id UUID NOT NULL,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(tenant_id,outreach_id) REFERENCES governed_outreach(tenant_id,id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS governed_outreach_outbox (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  outreach_id UUID,
  source_id UUID,
  provider TEXT NOT NULL CHECK(provider IN('crm','email','calendar','enrichment','consent','suppression')),
  operation TEXT NOT NULL CHECK(operation IN('upsert','delete','send','handoff','reconcile')),
  payload JSONB NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash CHAR(64) NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN('queued','processing','delivered','failed','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  lease_token UUID,
  lease_expires_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_receipt JSONB,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,provider,idempotency_key),
  CHECK((outreach_id IS NULL) <> (source_id IS NULL)),
  FOREIGN KEY(tenant_id,outreach_id) REFERENCES governed_outreach(tenant_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(tenant_id,source_id) REFERENCES governed_contact_sources(tenant_id,id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS governed_contact_email_idx ON governed_contact_sources(tenant_id,email_normalized);
CREATE INDEX IF NOT EXISTS governed_outreach_state_idx ON governed_outreach(tenant_id,state,scheduled_at);
CREATE INDEX IF NOT EXISTS governed_outbox_ready_idx ON governed_outreach_outbox(status,next_attempt_at,lease_expires_at);

CREATE OR REPLACE FUNCTION governed_outreach_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'governed outreach events are append-only';
END
$$;
DROP TRIGGER IF EXISTS governed_outreach_events_append_only_trigger ON governed_outreach_events;
CREATE TRIGGER governed_outreach_events_append_only_trigger
BEFORE UPDATE OR DELETE ON governed_outreach_events
FOR EACH ROW EXECUTE FUNCTION governed_outreach_events_append_only();

COMMIT;
