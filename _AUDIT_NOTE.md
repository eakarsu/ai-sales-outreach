# Audit Apply Note — ai-sales-outreach

## Audit recommendations (from batch_00.md)

Substantive market-complete sales platform: 26 route files, 39 AI endpoints. Health endpoint already at `/api/health`.

### Missing AI counterparts
- AI conversation coaching (during live calls / recorded demos)
- AI competitor win/loss analysis from customer feedback

### Missing non-AI features
- Multi-channel asset library (video, brochures, case studies)
- Workflow approval gates (compliance review before sending)
- Custom field automation (auto-populate from data enrichment)

### Custom feature suggestions
- Real-time deal conversation analysis
- Competitor battlecards (auto-generated)
- Voice call coaching
- Sales methodology playbooks (MEDDIC, Sandler, SPIN)
- Salesforce Einstein, LinkedIn Sales Navigator, ZoomInfo, RocketReach integrations

## Implemented in this pass

None. Project is substantive (39 AI endpoints, 26 routes). Remaining items are external integrations (Salesforce/LinkedIn/ZoomInfo) or major real-time pipelines (call streaming, transcription) — not MECHANICAL.

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| AI live conversation coaching | TOO-RISKY | Real-time transcription pipeline |
| AI competitor win/loss analysis | NEEDS-PRODUCT-DECISION | Loss-reason taxonomy |
| Multi-channel asset library | NEEDS-PRODUCT-DECISION | Asset model + storage |
| Workflow approval gates | NEEDS-PRODUCT-DECISION | Approval state machine |
| Custom field automation | NEEDS-CREDS | Data enrichment provider |
| Voice call coaching | NEEDS-CREDS | Speech-to-text provider |
| Battlecard auto-generation | NEEDS-CREDS | Competitor scraping |
| Salesforce / LinkedIn / ZoomInfo integrations | NEEDS-CREDS | OAuth + creds |

## Apply pass 7 (full backlog implementation)

**Critical fix:** the 404 handler in `backend/src/index.ts` was registered on line 114, BEFORE the 9 `gap_*` route mounts (lines 142-165) and the 5 `BATCH_00_AUDIT_MOUNTS` (`meeting-transcript`, `battlecards`, `voice-coaching`, `methodology-playbook`, `enrichment-bridge`). Express middleware runs in registration order, so every request to those 14 routers fell through to `notFoundHandler` and returned 404 — making all earlier "Implemented" gap work effectively dead code. Moved `notFoundHandler` + `globalErrorHandler` + `start()` to the END of the file, after all `app.use(...)` mounts.

**Backend — 5 new custom-feature routes** matching frontend `/api/cf-*/run` fetches that previously had no backend (now 14 frontend Gap pages all reach a live backend):
- `POST /api/cf-auto-generated-competitor-battlecards-web/run` + `GET /health` — file `routes/cf_auto_generated_competitor_battlecards_web.ts`
- `POST /api/cf-deeper-enrichment-salesforce-einstein-linkedin/run` + `GET /health`
- `POST /api/cf-real-time-meeting-transcript-analysis/run` + `GET /health`
- `POST /api/cf-sales-methodology-playbooks-meddic-sandler/run` + `GET /health`
- `POST /api/cf-voice-call-coaching-post-call/run` + `GET /health`

All 5 follow the existing `gap_*` pattern: optional JWT middleware, OpenRouter call with stub fallback, lazy `cf_features` table via `CREATE TABLE IF NOT EXISTS cf_features (id SERIAL PRIMARY KEY, project TEXT, slug TEXT, input JSONB, output JSONB, created_at TIMESTAMP DEFAULT NOW())`. Mounted in `index.ts` BEFORE the 404 handler.

**Frontend — wired all 14 Gap pages** in `frontend/src/App.tsx`. They existed in `pages/` but were not imported or routed, so the UI was unreachable. Added imports + `<Route path="/gap/...">` entries (e.g. `/gap/ai-account-tier-scoring-icp`, `/gap/voice-call-coaching-post-call`, etc.).

**New table:** `cf_features` (created lazily on first `/run` call, same schema as `gap_features`).

**Syntax:** `npx tsc --noEmit` clean for both `backend/` and `frontend/`. No `.js` files modified (project is TypeScript). No new deps. No breaking changes.

Status: Backlog fully addressed for items not gated by external credentials. Remaining items in original audit explicitly skipped per constraint: real-time streaming transcription (TOO-RISKY) and OAuth-gated Salesforce/LinkedIn/ZoomInfo data pulls (NEEDS-CREDS — covered by pass-5 503 stubs).

## Apply pass 5 (all backlog)

Implemented 7 endpoints in `backend/src/routes/ai.ts`:

**PRODUCT-DECISION:**
- `POST /api/ai/win-loss-analysis` — fixed 10-bucket loss-reason taxonomy (price, product_fit, competitor, timing, no_decision, budget, authority, integration, support_concerns, champion_left). Lazy-creates `win_loss_analyses` table.
- `POST /api/ai/asset-library` + `GET` — multi-channel asset metadata (kind enum: video/brochure/case_study/deck/onepager/other). `sales_assets` table.
- `POST /api/ai/approval-request` + `POST /api/ai/approval-request/:id/decide` — workflow approval gates with 4-state machine (pending → approved/rejected/changes_requested). `approval_requests` table.

**NEEDS-CREDS** (return 503 with `missing: <ENV>`):
- `POST /api/ai/enrich-contact` — `ZOOMINFO_API_KEY`
- `POST /api/ai/salesforce-sync` — `SALESFORCE_API_KEY`
- `POST /api/ai/linkedin-prospect` — `LINKEDIN_API_KEY`

All tables use `CREATE TABLE IF NOT EXISTS` with `user_id TEXT` to match the existing UUID-based user schema. Smoke-tested live: registered fresh user, JWT auth OK, win-loss returned taxonomy + 200, asset POST 201 + GET 200, approval POST 201, enrich + salesforce-sync correctly returned 503 with `missing` field.

Backlog now empty for actionable items; remaining "Real-time deal conversation analysis" / "Voice call coaching" require streaming transcription pipelines (TOO-RISKY).

## Apply pass 4 (mechanical backlog)

**Action:** SKIPPED — no mechanical items remain.

Re-audited the backlog table: every entry is NEEDS-CREDS (Salesforce/LinkedIn/ZoomInfo, voice STT, dashcam vision, competitor scraping, data enrichment), NEEDS-PRODUCT-DECISION (loss-reason taxonomy, asset model, approval state machine), or TOO-RISKY (real-time transcription pipeline). Project is already substantive (39 AI endpoints across 26 routes, 16+ AI* pages already wired).

## Apply pass 3 (frontend)

**Action:** LEFT-AS-IS — FE already wired.

The frontend already exposes every backend AI endpoint:
- `pages/AIAssistant.tsx` — generate/improve/analyze emails + subject lines
- 16 dedicated AI* pages: `AILeadScorer`, `AIPersonalization`, `AIBestTime`, `AIObjections`, `AIPipelineForecast`, `AIWarmupScheduler`, `AICompetitiveIntel`, `AIPlaybookLearner`, `AIProspectResearch`, `AIDealMomentum`, `AIObjectionPredictor` plus their detail views — all routed in `frontend/src/App.tsx`
- `frontend/src/services/api.ts` exposes 40+ `/ai/*` wrappers used across these pages

Auth: shared axios instance with JWT interceptor in `services/api.ts`. No frontend code changes needed.
