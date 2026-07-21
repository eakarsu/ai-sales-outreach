# Completeness Review: ai-sales-outreach

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 151 project files (139 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Prototype-demo**

This is a prototype/demo for sales/customer operations. Generated gap/demo patterns are present: it contains 139 source files and visible routes/pages in `frontend/`, `backend/`, but those surfaces are not evidence of durable domain execution, verified integrations, or operational completion.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Integrate CRM, email/calendar, enrichment, consent, and suppression sources with bidirectional, deduplicated sync.
2. Implement explicit lead/account lifecycle, ownership, approvals, attribution, and handoff/retry states.
3. Add deliverability, opt-out, regional privacy, rate-limit, and human-review controls for automated outreach.
4. Measure conversion and data quality with representative end-to-end workflow tests rather than generated sample records.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Weak/fallback secret patterns can permit forged sessions or accidental insecure deployments.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.

## Evidence inspected

- `backend/src/middleware/auth.ts:5`
- `frontend/src/App.tsx:54`
- `frontend/src/App.tsx`
- `backend/src/middleware/auth.ts`
- `backend/package.json`
- `start.sh`

## Recommended next action

Stop adding generated pages; prove one sales/customer operations workflow against real services and persistent state, with tests and measurable acceptance criteria.

## Implementation progress (2026-07-18)

The supported production boundary is now `/api/governed-outreach`. Generated
gap, coaching, and generic-LLM routes are disabled by default and forbidden in
production; they are not counted as implementation evidence.

1. **Bidirectional connector workflow:** CRM, email, calendar, enrichment,
   consent, and suppression providers now use allow-listed stable identities,
   source versions, normalized email, content hashes, deletion/suppression
   propagation, deduplicating inbound upserts, and idempotent outbound
   upsert/delete/reconcile commands with leases, retries, dead letters, and typed
   provider receipts. Live credentials and provider certification remain
   external deployment gates.
2. **Explicit lifecycle:** persisted outreach records now move through draft,
   review, independent approval/rejection, queue, send/failure/retry,
   delivery/bounce, cancellation, and qualified handoff states with accountable
   ownership, optimistic versions, payload-bound idempotency, first-touch
   attribution, and append-only events.
3. **Outreach controls:** the deterministic policy fails closed on missing
   consent evidence, suppression, opt-out/deletion, unsupported region/channel,
   EU/UK privacy basis, recipient frequency, tenant volume, stale schedules, and
   missing template/campaign versions. A manager other than the owner must
   approve; AI output cannot approve or send. JWTs now require a strong secret,
   HS256, tenant, role, and subject claims with database role-staleness checks.
4. **Measurable workflow evidence:** deterministic conversion and source-quality
   metrics exclude unknown conversions and report duplicates, completeness, and
   blocked records. A live HTTP/PostgreSQL journey covers deduplicated sync,
   idempotent replay, review/approval, provider outbox delivery, typed receipts,
   handoff conversion, metrics, and rejection of audit mutation.
5. **Risk-based delivery controls:** 13 policy/workflow/static tests plus the live
   persisted journey run in CI with clean backend/frontend installs, both builds,
   migration and repeat-migration execution, shell checks, and an unsafe-launcher
   scan. `start.sh` now has separate fail-closed check/migrate/start modes and
   never kills processes, installs, creates a database, seeds, or migrates on
   startup. `RUNBOOK.md` documents rollback, reconciliation, and incident gates.

Validation performed locally:

- The backend TypeScript build and all 14 tests passed against an isolated
  PostgreSQL instance; none were skipped in the live run.
- The additive migration applied twice successfully. The second application
  retained all tables/indexes and safely recreated the append-only trigger.
- A clean frontend install initially exposed 14 generated-page implicit-`any`
  errors; those were corrected and the production build then passed.
- `bash -n start.sh`, the default launcher's missing-database failure,
  `git diff --check`, fallback-secret scans, and the exact review-heading check
  passed. The root and backend `.env` files are not tracked and have no commits
  in current Git history; their values were neither printed nor trusted.

Residual release gates are explicit. The backend dependency audit reports 11
findings (6 moderate, 5 high); the frontend reports 55 (10 low, 19 moderate, 24
high, 2 critical). They were not force-upgraded across major versions. Live CRM,
email/calendar, enrichment, consent/suppression, and identity providers,
sending-domain/deliverability validation, regional counsel/privacy approval,
webhook verification, retention/legal hold, provider reconciliation, backup
restore, penetration testing, and production acceptance remain required.

## Runtime verification (2026-07-20)

- `start.sh` now defaults to its nondestructive `start` mode; explicit `check` and approval-gated `migrate` modes remain available.
- The launcher accepts `DEFAULT_TENANT_ID`, `GOVERNANCE_TENANT_ID`, or `TENANT_ID` as equivalent tenant aliases and exports the normalized value to the API. JWT length, database, and production feature checks remain fail-closed.
- The independent validator used disposable PostgreSQL on port 55543 and API port 5906, recording `API_VERIFIED` with `startup_login_session_api`.
- The backend TypeScript build and default test command passed: 13 tests passed and the persisted integration test was skipped without its explicit live-database environment. The independent runtime run separately covered PostgreSQL startup and login/session behavior.
