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
