# Agence — Project Progress

_Last updated: 2026-04-17_

## Status: ~99% complete

**Deadline: April 21, 2026** (CS 7180 Project 3 — 200 pts, 20% of final grade)

---

## What's Built

### Agents (6/6 complete)
- `server/agents/spendingAgent.js` — categorized spending, MoM comparisons, budget flags. 5 tests.
- `server/agents/marketContextAgent.js` — Alpaca price quotes + Finnhub news sentiment. 6 tests.
- `server/agents/anomalyAgent.js` — large transaction detection + duplicate charge detection. 5 tests.
- `server/agents/goalsAgent.js` — savings goal pace tracking; goal_behind / on_track / no_contributions / complete. 5 tests.
- `server/agents/portfolioAgent.js` — concentration risk (>20%), unrealized loss (>10%), cash drag (>20%). 8 tests.
- `server/agents/autopilotAgent.js` — rebalance sell signal (>20% concentration), buy-on-dip (<-5% 24h). 8 tests.

### Orchestrator (complete)
- `server/orchestrator/index.js` — Promise.all over all 6 agents, safeRun isolation. 8 tests.
- `server/orchestrator/judge.js` — LLM-as-judge via claude-sonnet-4-6, explicit scoring dimensions, fallback. 9 tests.

### Backend (complete)
- `server/db/schema.sql` — 6 tables: users, accounts, transactions, balances, goals, trades. Applied to agence_dev (local) + agence_db (Render).
- `server/db/queries.js` — all SQL quarantined here. SSL enabled for Render. 12 tests.
- `server/middleware/auth.js` — JWT Bearer verification, attaches userId to req. 4 tests.
- `server/middleware/errors.js` — centralized 4-arg Express error handler.
- `server/index.js` — Express app, CORS, JSON, /health, all routes registered.
- `server/routes/auth.js` — POST /api/v1/auth/register + /login. 8 tests.
- `server/routes/insights.js` — GET /api/v1/insights (orchestrator → judge pipeline). 4 tests.
- `server/routes/accounts.js` — POST /link-token + POST /exchange (Plaid). 6 tests. ✅
- `server/routes/portfolio.js` — GET /portfolio (Alpaca positions + P&L). 5 tests. ✅
- `server/routes/trades.js` — POST /trades + GET /trades (paper trade via Alpaca). 12 tests. ✅
- `server/routes/tickers.js` — GET /tickers/search?q= (Alpaca asset autocomplete, 6h cache). ✅
- `server/routes/goals.js` — GET /goals + POST /goals (savings goals). 6 tests. ✅
- `server/services/plaid.js` — Plaid SDK wrapper (link token, exchange, transactions, balances). ✅
- `server/services/alpaca.js` — Alpaca SDK wrapper (positions, account, snapshots, placeOrder, getClock, searchAssets with 6h cache). ✅
- `client/src/components/TickerAutocomplete.js` — debounced live ticker search component (250ms, used in Portfolio + Watchlist). ✅

### Frontend (complete)
- React Router with protected routes (PrivateRoute → /login redirect)
- AuthContext — JWT storage, login/logout
- Login + Register pages — wired to /api/v1/auth endpoints ✅ working in production
- Dashboard — nav to all sections + PlaidLink button for bank connection ✅
- Insights page — calls GET /api/v1/insights, renders ranked insight feed ✅
- Portfolio page — Alpaca positions table with P&L color coding ✅
- Goals page — create goals form + progress bar list ✅
- `client/src/components/PlaidLink.js` — Plaid Link flow (link token → open → exchange) ✅
- Full CSS: dark nav, card grid, severity badges, portfolio table, auth pages, Plaid button ✅

### Claude Code Features (complete)
- `.claude/settings.json` — PreToolUse ESLint hook on server JS edits, PostToolUse test hook on git push
- `.mcp.json` — postgres (agence_dev) + context7 MCP server config
- `.claude/agents/insight-reviewer.md` — sub-agent for evaluating insight quality/redundancy/severity
- `.claude/skills/run-insights/SKILL.md` — second skill: smoke-tests full pipeline with fixtures
- `.claude/skills/add-agent/SKILL.md` — first skill (v2): scaffolds new agents with TDD

### CI/CD & Deployment (complete)
- `.github/workflows/ci.yml` — 5 jobs: ESLint, Jest, React build, npm audit, AI PR review. ✅ green on first run.
- **Vercel** — https://agence-flame.vercel.app (frontend, live)
- **Render** — https://cs7180-project3-agence.onrender.com (backend API, live)
- `render.yaml` — infrastructure-as-code for Render web service
- `client/vercel.json` — SPA rewrite rule for React Router
- Render PostgreSQL (agence_db) — schema applied, SSL wired

### Integration Tests
- `server/tests/integration/auth.integration.test.js` — 7 tests: register→login round-trip (real bcrypt + JWT), middleware rejection tests. Mocks only pg Pool.
- `server/tests/integration/insights.integration.test.js` — 4 tests: full pipeline JWT→queries→orchestrator→judge. Mocks only pg Pool + orchestrator/judge.

### E2E Tests (Playwright)
- `e2e/tests/auth-flow.spec.js` — 4/4 passing against live Vercel URL: redirect to /login, login page form, register page form, register→dashboard flow. 2 additional tests skip unless E2E_EMAIL/E2E_PASSWORD set.

### Test suite
- **274/274 passing** across 25 test suites (server only)
- E2E: auth-flow.spec.js + insights-expenses-flow.spec.js + main-flows.spec.js (Playwright, Chromium, live Vercel URL)
- Mutation: Stryker score ~74.64% (spendingAgent 85.71%, anomalyAgent 71.60%, goalsAgent 65.52%)
- Property-based: fast-check, 17 tests across spendingAgent/anomalyAgent/goalsAgent
- Coverage: ~95% statements, ~83% branches (70% threshold enforced in CI)
- Lint: clean
- GitHub Actions: green ✅

---

## Next Steps — SUBMISSION ONLY

**The app is feature-complete. No more code changes needed.**

### Remaining (user handles — no code required)
1. **Blog post** — draft is at `docs/blog-post.md`; publish to LinkedIn or Medium; add URL to showcase form
2. **Screencast** — 5–10 min demo: login → dashboard → insights → expenses → goals → portfolio → watchlist → settings; narrate agent outputs and Claude Code tooling
3. **Showcase form** — submit after blog + video are live (project name, Vercel URL, GitHub URL, thumbnail, video link, blog link)

### URLs needed for submission
- Frontend: https://agence-flame.vercel.app
- Backend: https://cs7180-project3-agence.onrender.com
- GitHub: https://github.com/dkalo8/cs7180_project3_agence

---

## Rubric Breakdown (200 pts)

| Category | Points | Status |
|---|---|---|
| App quality (features, UX, functionality) | 40 | ~35% — auth + insights working in prod, no styling, Plaid/Alpaca not wired |
| Claude Code Mastery | 55 | ~80% — 2 skills, hooks, .mcp.json, sub-agent, 6/6 agents |
| Testing & TDD | 30 | ~70% — 107 unit tests, 0 integration/E2E |
| CI/CD & Production | 35 | ~70% — GitHub Actions green, Vercel + Render live, no pre-commit secrets detection |
| Team Process | 25 | ~10% — conventional commits, no PRs/issues |
| Documentation | 15 | ~65% — README/PRD/CLAUDE.md strong, no blog/video |

---

## Key Architectural Decisions

- **Pure agent functions** — agents receive data, return insights[], no side effects. Makes testing trivial.
- **Promise.all orchestration** — all 6 agents run in parallel per insight request, not sequentially
- **LLM-as-judge with scored dimensions** — judge receives structured JSON, scores on actionability/urgency/crossDomainRelevance/confidence
- **SQL quarantine** — all queries in `server/db/queries.js`, never inline SQL elsewhere
- **Paper trading only** — `ALPACA_PAPER=true` hardcoded, never exposed as a toggle
- **SSL conditional** — `ssl: { rejectUnauthorized: false }` only when DATABASE_URL is set (Render); off for local dev

## Deployment

- **Frontend**: https://agence-flame.vercel.app (Vercel, CRA, deployed via CLI)
- **Backend**: https://cs7180-project3-agence.onrender.com (Render, Node/Express, US West Oregon)
- **Database**: Render PostgreSQL (agence_db, US West Oregon), schema applied
- **GitHub Actions**: https://github.com/dkalo8/cs7180_project3_agence/actions

---

## Active Session Notes

**Session 2026-04-08:**
- 9A Dashboard redesign ✅ — Schwab-style 2-col layout, Recharts AreaChart, holdings, insights rail. 147 tests.
- 9B Expenses page ✅ — category bars + tx table, client-side grouping, "All" default. 152 tests.
- 9C Watchlist ✅ — GET/POST/DELETE /api/v1/watchlist, watchlistAgent, migrate.js auto-creates table on startup. 167 tests.
- 9D AI Chat ✅ — POST /api/v1/chat (Claude Sonnet 4.6, financial context injected), floating ChatWidget (bottom-right FAB), react-markdown + remark-gfm for table rendering. 173 tests.
- CI fixed ✅ — coveragePathIgnorePatterns excludes services/; E2E test updated for rewritten dashboard.
- Local dev CORS unresolved — UI verified on Vercel only.
- Next: 8G responsive CSS (skip until after 8H aesthetic redesign), then 8H aesthetic redesign

**Session 2026-04-09:**
- Trade "unauthorized" bug fixed ✅ — root cause: Render env var `ALPACA_API_KEY` vs code reading `ALPACA_KEY_ID`. Added fallback in `server/services/alpaca.js`: `ALPACA_KEY_ID || ALPACA_API_KEY`. Portfolio route `.catch()` fallbacks had been masking the auth failure on GET endpoints.
- 8F Watchlist real-time prices ✅ — `getSnapshots` was returning array; fixed to return object keyed by symbol. Watchlist + insights now get actual price data. 176/176 tests.
- 8G Polish pass ✅ (partial) — trade history tab + order types (market/limit/stop/stop_limit) in Portfolio.js; Settings page (GET /api/v1/auth/me, profile email, linked accounts, sign-out); goal progress bar in dashboard right rail. 181/181 tests. Responsive CSS deferred until after aesthetic redesign.
- AI chat full context ✅ — watchlist + trade history added to Promise.all in chat.js; system prompt updated with WATCHLIST + RECENT TRADES sections.
- $0 trade cleanup — local DB already clean; user needs to run `DELETE FROM trades WHERE price = 0 OR price IS NULL;` on Render production DB via psql or Render SQL editor.
- TODO.md reorganized — Phases renumbered; household accounts promoted to 9A (highest priority, in original proposal); aesthetic redesign = 9B; Google auth = 9C; drag-drop goal ordering added to 8G.
- Account balance fix ✅ — `getAccountsByUserId` LEFT JOINs `balances` table; 182 tests.

**Session 2026-04-09 (continued):**
- 9A Household Accounts ✅ — households + household_members tables in migrate.js; POST/GET /api/v1/household + POST /api/v1/household/invite; 13 new tests (195 total); Settings page: create household form + member list + invite (owner only); Dashboard: "Household: [name]" badge in equity hero.
- 9A part 2 ✅ — DELETE /household/leave + DELETE /household/member/:userId; shared data: goals/watchlist/transactions now aggregate across all household member IDs via `= ANY(uuid[])` queries; 203/203 tests.
- **9A complete + committed. Tagged as `v1-pre-redesign` before 9B.**

**Session 2026-04-10:**
- 9B Aesthetic Redesign ✅ — full design system (CSS vars, Cormorant Garamond + Outfit fonts), page-by-page pass, severity badge redesign, motion animations, page title consistency. See `batch-fixes/9b-redesign-anomaly-caching.md`.
- Insight cards deep-link navigation ✅ — orchestrator tags insights with `source`; Insights.js navigates to `?txId=` or `?amount=`; Expenses.js scrolls to + highlights matched row.
- Anomaly agent improvements ✅ — `txId` on all insights, duplicate key fixed (amount+date only), `repeated_charge` detection added (same merchant+amount across different dates).
- 8H Frontend Caching ✅ — `insightsCache.js` + `apiCache.js`; Dashboard pre-warms all 8 endpoints; all pages read from cache; mutations invalidate before re-fetch. 192/192 tests.
- TODO.md restructured — remaining work in priority order: 9C Google Auth → 9D News/Watchlist → 9E Nav redesign → polish → Phase 10 docs.
- **Next: 9C Google Auth**

**Session 2026-04-13:**
- 9C Google Auth ✅ — `POST /api/v1/auth/google`; google-auth-library token verify; find-or-create-or-link user; migrate.js drops NOT NULL on password_hash + adds google_id UNIQUE; `@react-oauth/google` on Login + Register; 197/197 tests.
- UX polish: "Sign-in: Google/Email" row in Account profile; Sign out removed from nav (Account page only); `invalidateAll()` on logout fixes cross-account cache bleed.
- E2E CI fix ✅ — added Render warm-up step to ci.yml (polls /health up to 3 min before Playwright runs); fixes cold-start timeout failures.
- Password reset added to TODO as 9F.
- 9D Watchlist News Feed ✅ — `GET /api/v1/news?tickers=...` (Finnhub, Promise.all per ticker); collapsible "Recent News" section in Watchlist.js; `getNews(tickers)` in apiCache.js with 2-min TTL. 214/214 tests.
- Bug fixes: watchlist cache invalidation on add/remove (missing invalidate() calls); re-fetch full list after add (for Alpaca prices); finnhub v2 SDK fix (ApiClient.instance removed, now `new DefaultApi(key)`).
- 9E Nav Redesign ✅ — CSS-only hover dropdowns; Money▾ (Expenses, Goals), Markets▾ (Portfolio, Watchlist); 3 fix iterations (--navy-900 undefined, chevron removed, align-self stretch for full-height hover zone).
- **Next: 9F Password Reset**

**Session 2026-04-13 (continued):**
- 9F Password Reset ✅ — `POST /api/v1/auth/forgot-password` + `POST /api/v1/auth/reset-password`; JWT reset token (1h, separate secret); ForgotPassword.js + ResetPassword.js frontend pages; "Forgot password?" link on Login. 9 new tests (223/223 total).
- Email delivery: tried Gmail SMTP → blocked by Render free tier (all outbound SMTP ports). Switched to SendGrid HTTPS API (`@sendgrid/mail`). Chain: SendGrid → Resend → console.log dev fallback.
- Google button width warning fixed ✅ — `width={340}` (numeric) on GoogleLogin in Login.js + Register.js.
- **Next: Polish backlog (responsive CSS, news article count + AI summary, drag-drop goals)**

**Session 2026-04-13 (continued — step 5 polish):**
- Goal types ✅ — `goal_type` column (savings/growth/speculation); badge in Goals.js; `.form-select` opt-in class for styled selects. 226 tests.
- Drag-and-drop goal ordering ✅ — `position` column; `PATCH /goals/reorder`; HTML5 drag API in Goals.js; optimistic reorder; `invalidate('goals')` on end. Bug fixes: missing invalidate (stale cache on reload), goalsAgent snake_case (`monthly_contribution` vs `monthlyContribution`), Postgres numeric string → `Number()`.
- Watchlist insight filtering ✅ — removed `watchlist_quote` catch-all; added positive-sentiment `watchlist_sentiment` (score > 0.7, severity info).
- Watchlist deep-link ✅ — Insights navigates `?ticker=X`; Watchlist reads URL param, scrolls + highlights matched row.
- Investor risk profile ✅ — `risk_tolerance` in DB; `PATCH /me` validates; autopilotAgent `RISK_THRESHOLDS` per level.
- Account selection ✅ — `active_account_id` in DB; Settings page account table + "Clear" link; PlaidLink on Settings; transactions + insights filter by active account.
- Household activeView toggle ✅ — `active_view` in DB (`personal`|`household`); `PATCH /me` validates; Settings toggle; Dashboard badge conditional on `activeView === 'household'`.
- Portfolio dropdowns fixed ✅ — `.form-select` opt-in class (was `.page main select`); Portfolio selects now use `className="form-select"`.
- `queries.test.js` regex fixed — `SELECT[\s\S]*FROM users` for multiline SQL.
- **244/244 tests passing. Next: About page.**

**Session 2026-04-13 (continued — news/watchlist polish):**
- News: 7 articles/ticker fetched, 3 shown by default + per-ticker expand button. 225/225 tests.
- Agence Overview: improved prompt uses full article body + analyst framing ("what's driving the stock").
- Per-ticker news caching in apiCache.js — adding ticker only fetches that ticker; remove = instant state filter.
- Watchlist + news section sorted A→Z. Search filter in news. Refresh button (↻).
- Email: SendGrid HTTPS API now primary (Render free tier blocks SMTP). `@sendgrid/mail` installed. SENDGRID_API_KEY + SENDGRID_FROM env vars on Render.
- fixes.md cleared.
- **Next: Step 5 polish backlog (responsive CSS, drag-drop goals, etc.)**
