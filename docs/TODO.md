# Agence — P3 TODO Checklist

**Deadline:** April 21, 2026 | **Points:** 200 | **Current estimate:** ~192/192 tests, ~90% complete

> Remaining work ordered by priority. Completed phases collapsed below.

---

## Remaining Work (do in order)

### 1. 9C: Google Auth ✅
- [x] Backend — `POST /api/v1/auth/google`; google-auth-library token verify; find-or-create user; link google_id to existing email accounts
- [x] DB — `google_id VARCHAR UNIQUE`, `password_hash` NOT NULL dropped in migrate.js
- [x] Frontend — `@react-oauth/google`; `GoogleLogin` on Login + Register; `GoogleOAuthProvider` in index.js
- [x] Tests — 5 tests (mock google-auth-library); 197 total passing
- [x] UX — "Sign-in: Google / Email+password" row in Account profile; Sign out removed from nav (Account page only); `invalidateAll()` on logout to clear cross-account cache

### 2. E2E CI Fix ✅
- [x] Added backend warm-up step to `.github/workflows/ci.yml` — polls `/health` up to 12× (15s apart, max 3 min) before running Playwright; fixes Render cold-start timeouts

### 3. 9D: Watchlist News Feed ✅
- [x] **Backend** — `GET /api/v1/news?tickers=AAPL,TSLA` — `finnhub.getNewsArticles()`, Promise.all per ticker, graceful fallback to `[]`; 6 tests (214 total)
- [x] **Frontend** — collapsible "Recent News" section at bottom of `Watchlist.js`; 5 articles per ticker; links open in new tab; loads after watchlist fetch
- [x] **Cache** — `getNews(tickers)` in `apiCache.js` with 2-min TTL; cache key includes ticker list

### 3. 9E: Nav Redesign (dropdown grouping) ✅
- [x] Logo → `/`, Insights (top-level), Money▾ (Expenses, Goals), Markets▾ (Portfolio, Watchlist), Account
- [x] CSS-only hover dropdowns with opacity/visibility transition and invisible bridge padding
- [x] E2E selectors unchanged — tests only reference `.nav` and `link[Insights]`

### 4. 9F: Password Reset ✅
- [x] **Backend** — `POST /api/v1/auth/forgot-password` (JWT reset token, Resend email, always 200 — no email-exists leak); `POST /api/v1/auth/reset-password` (verify token type + expiry, bcrypt hash update)
- [x] **Email** — Resend package; falls back to `console.log` reset URL if `RESEND_API_KEY` not set (dev-friendly)
- [x] **Frontend** — "Forgot password?" on Login → `/forgot-password`; `/reset-password?token=...` with success redirect to login
- [x] **Tests** — 9 new tests (400/401/200 cases, expired token, wrong type); 223/223 total

### 5. Polish backlog (in priority order)
- [x] **Responsive CSS** — mobile breakpoints across all pages (highest visibility, affects every page)
- [x] **Dashboard balance wiring** — after buying stock, dashboard should reflect updated equity, positions, and sparkline
- [x] **Goal types** — add `goal_type` column (savings/growth/speculation); display type badge
- [x] **Drag-and-drop goal ordering** — let user set goal priority via drag-and-drop on Goals page
- [x] **Investor risk profile** — settings field for risk tolerance (conservative/moderate/aggressive); feed into autopilot agent rules
- [x] **Account selection** — multiple Plaid accounts supported; active account filter persisted in DB; Settings page lets user select/clear active account; PlaidLink on Settings to add more accounts
- [x] **Watchlist insight filtering** — removed noisy catch-all `watchlist_quote`; added positive-sentiment `watchlist_sentiment` (info); price-move severity tiers (≥8% high, ≥3% medium)
- [x] **Watchlist deep-link from Insights** — clicking watchlist insight navigates to `/watchlist?ticker=X`; Watchlist scrolls to + highlights the row
- [x] **Household badge visibility + view toggle** — `active_view` persisted in DB (`personal`|`household`); Settings toggle; Dashboard badge only shows when `activeView === 'household'`
- [x] **Portfolio dropdown arrows** — Portfolio selects now use `.form-select` opt-in class (consistent chevron, no padding-right conflict)
- [ ] **About page** ← **NEXT** — user-friendly page explaining the app, multi-agent architecture, Agents + Finance = Agence vision, how each agent differentiates the platform, how to navigate the app. Lives in nav (suggest: top-level link next to Insights, or under a "?" icon).

### 5. Phase 10: Documentation & Demo (deadline-sensitive)
- [ ] **Add Plaid sandbox instructions to README.md** — graders need: how to link an account, sandbox credentials, what to expect after linking
- [ ] **Recreate sprint history in docs/** — review project-memory/ and create sprint-3, sprint-4 (plus sprint-1 and sprint-2 from scratch if necessary --if they don't truly reflect the first two sprints based on what was achieved), … docs so graders can see full project progression
- [ ] Write + publish blog post (Medium or dev.to) — 1,500+ words
- [ ] Record 5–10 min screencast
- [ ] Write 500-word individual reflection
- [ ] Submit showcase form

---

## Rubric Scorecard

| Category | Max | Est. Now | Achievable |
|---|---|---|---|
| Application Quality | 40 | 34 | 40 (Google Auth + News + nav) |
| Claude Code Mastery | 55 | 47 | 50 (2 skills, hooks, .mcp.json, agent, 7/6 agents) |
| Testing & TDD | 30 | 28 | 28 (192 unit/integration + E2E + 89% coverage) |
| CI/CD & Production | 35 | 30 | 32 (Actions + Vercel + Render + secrets) |
| Team Process | 25 | 18 | 20 (Issues, PR, sprints, AI disclosure) |
| Documentation & Demo | 15 | 5 | 13 (diagram done; blog + video pending) |
| **Total** | **200** | **~162** | **~183** |

---

## Completed ✅

### Phases 1–7 (core build)
- Agent layer: spendingAgent, anomalyAgent, goalsAgent, portfolioAgent, marketContextAgent, autopilotAgent, watchlistAgent
- Backend: Express API, PostgreSQL, JWT auth, all routes, orchestrator + LLM-as-judge
- Frontend: React Router, auth flow, all pages, Plaid Link
- Claude Code: 2 custom skills, hooks, `.mcp.json`, sub-agent
- CI/CD: GitHub Actions (lint/test/security/AI review), Render + Vercel deploy, detect-secrets
- Testing: 192 tests (unit + integration + E2E), 89% coverage
- Team process: branch workflow, Issues #1–5, PRs, 2 sprints, AI disclosure

### Phase 8: UX/UI Polish
- **8A** Dashboard redesign — equity hero, AreaChart, accounts table, insights rail
- **8B** Expenses page — category bars + transaction table + period filter
- **8C** Watchlist — add/remove tickers, real-time prices + 24h change
- **8D** AI Chat assistant — Claude Sonnet 4.6, full financial context, floating FAB
- **8E** Bug fixes — trade 431 error, Alpaca auth, chat context, account balance display
- **8F** Watchlist real-time prices — Alpaca snapshots, green/red coloring
- **8G** Polish — trade history tab, order types, empty states, settings page, goal progress rail
- **8H** Frontend caching — `apiCache.js` sessionStorage cache, Dashboard pre-warms all 8 endpoints

### Phase 9A: Household Accounts
- DB migration, backend routes (13 tests), frontend invite/leave/remove, shared data queries

### Phase 9B: Aesthetic Redesign
- Design system (navy palette, Cormorant Garamond + Outfit), full page-by-page pass, motion
- Page title consistency, clickable insight cards with deep-link navigation to source transactions
- Anomaly detection: large transactions, duplicate charges, repeated identical charges (txId tagging)
