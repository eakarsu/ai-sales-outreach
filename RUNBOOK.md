# Governed sales outreach

The supported production boundary is `/api/governed-outreach`. Generated gap,
coaching, and generic-LLM routes are disabled by default and forbidden in
production. They are not evidence for the governed workflow.

## Release lifecycle

1. Install the locked backend and frontend dependencies explicitly with
   `npm ci`; startup never installs packages.
2. Supply `.env.example` values through an approved secret manager. Do not put
   live CRM, email, calendar, enrichment, consent, or suppression credentials in
   request payloads or repository files.
3. Run `./start.sh check`, backend `npm run check`, and the frontend build.
4. Back up PostgreSQL, set `ALLOW_SCHEMA_MIGRATION=1`, and run
   `./start.sh migrate` as an approved release step. Apply it twice in staging
   to verify repeatability.
5. Start only a previously built artifact with `./start.sh start`.

Inbound source sync uses provider/source identity, source versions, normalized
email, and payload hashes for deduplication. Outbound source and delivery work is
stored as secret-free commands. Workers lease commands, attach typed receipts,
retry bounded failures, and dead-letter permanent or exhausted failures.

Operators must reconcile dead letters against provider records, preserve source
versions and receipts, and submit a new idempotent command. Never rewrite the
append-only event history. Suppression, deletion, opt-out, missing consent,
regional privacy, frequency, or tenant-volume failures are not overrideable by
AI output. Approval must be performed by a manager other than the owner.

## External gates

Live connector credentials and webhook verification, sending-domain setup,
deliverability monitoring, suppression-list authority, regional privacy/counsel
review, retention/legal hold, production IdP onboarding, backup/restore drills,
penetration testing, and staging end-to-end provider reconciliation remain
external release gates. Repository tests do not certify them.
